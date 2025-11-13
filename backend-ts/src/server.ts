
import cors from "cors";
import express from "express";
import session from "express-session";
import { logger, argsMap } from './libs';
import { RedisStore } from "connect-redis"
import cookieParser from "cookie-parser"

import { api } from './app'

const app = express();

type ServerConfig = {
    enableMetrics?: boolean,
    frontendUrl: string,
}

export const createServer = (redisStore: RedisStore, config: ServerConfig) => {
    const app = express();
    app.use(session({
        store: redisStore,
        secret: process.env.SESSION_SECRET || process.env.SESSION_SECRETE || 'your-session-secret',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false,
            httpOnly: true,
            maxAge: 1000 * 60 * 60,
        },
    }));
    app.use(express.json({ limit: '1000mb' }));
    app.use(cookieParser());
    app.use(cors({
        origin(requestOrigin, callback) {
            return callback(null, requestOrigin);
        },
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
    }));

    app.use((req, res, next) => {
        res.locals.currentHost = process.env.CURRENT_HOST;
        next();
    });

    app.use('/api', api);
    app.get('/check', (req, res) => {
        return res.status(200).json({ message: 'working' });
    });
    app.get('/', (req, res) => {
        if (config.frontendUrl) {
            return res.redirect(config.frontendUrl);
        }
        return res.json({ message: "Server is Working" });
    });
    app.use((req, res) => {
        return res.status(404).send('Not Found');
    });
    return app;
}
