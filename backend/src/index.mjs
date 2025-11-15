import 'module-alias/register.js';
import path from 'path';
import { config } from './libs/dynamic-env.mjs';
config(path.resolve(import.meta.dirname, '../.env'));
import express from 'express';
import { logger, argsMap } from './libs';

import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import sharedRedis from '@libs/sharedRedis'

const port = argsMap.get('port') ?? process.env.PORT ?? 80;
const frontendUrl = process.env.FRONTEND_URL;
logger.info({port});
// const session = require('./libs/session');

const app = express();
const cors = require('cors');
const session = require('express-session');
const { RedisStore } = require('connect-redis');

mongoose.connect(process.env.MONGO_CONNECTION_URI);

mongoose.connection.on('error', () => {
    logger.info('Error unable to connect to mongoose');
});

mongoose.connection.on('connected', () => {
    logger.info('Mongoose connected');
    if (port) {
        app.listen(port, (err) => {
            logger.info('Server started');
        });
    }
    if (argsMap.get('worker')) {
        logger.info(`Working as worker thread`);
        require('./worker');
    }
    
});

app.use(session({
    store: new RedisStore({
        client: sharedRedis,
    }),
    secret: process.env.SESSION_SECRET || process.env.SESSION_SECRETE || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 1000 * 60 * 60,
    },
}))

app.use(express.json({limit: '1000mb'}));
app.use(cookieParser());
app.use(cors({
    origin: (origin, callback) => {
        return  callback(null, origin);
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
	credentials: true
}));

app.use((req, res, next) => {
    res.locals.currentHost = process.env.CURRENT_HOST;
    next();
});


app.use('/api', require('./app'));
app.get('/check', (req, res) => {
    return res.status(200).json({
        message: 'working',
    });
});
app.get('/', (req, res) => {
    if (frontendUrl) {
        return res.redirect(frontendUrl);
    }
    return res.json({ message: 'Frontend URL not set' });
});
app.all('*', async (req, res) => {
    return res.status(404).send('Not Found');
});
