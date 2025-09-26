const { Redis } = require('ioredis');
const logger = require('./logger');

const redisIP = process.env.REDIS_CACHE_IP;
const redisPORT = process.env.REDIS_CACHE_PORT;
const redisPassword = process.env.REDIS_CACHE_PASSWORD;
let connected = false;

const cacheRedisConstants = {
    'previousQuestionAskedQuestions': 'getPreviousQuestionAskedQuestions',
    getPreviouslyAskedQuestion: function getPreviouslyAskedQuestion(id) {
        return `${this.previousQuestionAskedQuestions}:${id}`;
    }
}

const cacheRedis = new Redis({
    host: redisIP,
    port: redisPORT,
    password: redisPassword,
});

cacheRedis.on('error', (err) => {
    logger.error('Cache Redis Connection Error: ', err);
});

cacheRedis.on('connect', () => {
    connected = true;
    logger.info('Cache Redis Connected');
});

/**
 * 
 * @param {string} key 
 */
const createCacheKey = (key) => {
    return `cacheKey:${key}`
}

/**
 * 
 * @param {string} key 
 * @param {() => Promise<any>} fallback 
 */
async function getCache(key, fallback) {
    const cacheKey = createCacheKey(key);
    if (connected) {
        const isPresentInCache = await cacheRedis.exists(cacheKey);
        if (!isPresentInCache) {
            logger.info(`Cache miss for ${key}`);
        }
        if (isPresentInCache) {
            const data = await cacheRedis.get(cacheKey);
            return JSON.parse(data);
        }
        const data = await fallback();
        if (data) {
            await cacheRedis.set(cacheKey, JSON.stringify(data));
        }
        return data;
    }
    logger.info(`Cache miss cache redis is not connected`);
    return fallback();
}

/**
 * 
 * @param {string} key 
 */
async function removeFromCache(key, fallback) {
    const cacheKey = createCacheKey(key);
    if (connected) {
        await cacheRedis.del(cacheKey);
    }
}

module.exports = {
    getCache,
    removeFromCache,
    cacheRedisConstants,
}
