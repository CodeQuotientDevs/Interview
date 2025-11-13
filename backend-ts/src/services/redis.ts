import { Redis } from "ioredis"
import logger from "@libs/logger";

const redisIP = process.env.REDIS_IP;
const redisPORT = parseInt(process.env.REDIS_PORT || '6379');
const redisPassword = process.env.REDIS_PASSWORD;

const redis = new Redis({
    host: redisIP,
    port: redisPORT,
    password: redisPassword,
});

redis.on('error', (err) => {
    logger.error({
        message: 'Redis Connection Error',
        error: err,
    });
});

redis.on('connect', () => {
    logger.info(`Redis connected`);
});

export default redis;
