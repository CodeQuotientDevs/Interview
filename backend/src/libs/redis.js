const { Redis } = require('ioredis');
const logger = require('./logger');

const redisIP = process.env.REDIS_IP;
const redisPORT = process.env.REDIS_PORT;
const redisPassword = process.env.REDIS_PASSWORD;
const redis = new Redis({
    host: redisIP,
    port: redisPORT,
    password: redisPassword,
});

redis.on('error', (err) => {
    logger.error('Redis Connection Error: ', err);
});

redis.on('connect', () => {
    logger.info(`Redis connected`);
});

module.exports = redis;
