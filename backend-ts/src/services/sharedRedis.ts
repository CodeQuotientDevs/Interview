import { createClient } from "redis";
import logger from "../libs/logger";

const redisClient = createClient({
    socket: {
        host: process.env.SHARED_REDIS_IP || 'localhost',
        port: Number(process.env.SHARED_REDIS_PORT ?? '6379'),
    },
});

redisClient.on('error', (err) => {
    logger.error({
        message: 'Redis session client error',
        error: err?.message,
        trace: err?.stack,
    });
});

redisClient.connect().catch((err) => {
    logger.error({
        message: 'Redis session client connection error',
        error: err?.message,
        trace: err?.stack,
    });
});


export default redisClient;
