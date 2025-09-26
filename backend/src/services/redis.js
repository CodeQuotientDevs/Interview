const { Redis } = require('ioredis');
const redisClient = require('../libs/redis');
const sharedRedis = require('../libs/sharedRedis');

/** @typedef {import("ioredis").RedisCommander} RedisCommander */
/** @typedef {import("ioredis").Redis} Redis*/

/**
 * 
 * @param {Redis} redis 
 * @param {string[]} args 
 * @returns 
 */
function redisExecutor(redis, args) {
    let redisCommand = args.shift();
    return redis[redisCommand].apply(redis,args);
}


module.exports = {
    /** @type {<K extends keyof RedisCommander>(method: K, ...args: Parameters<RedisCommander[K]>) => ReturnType<RedisCommander[K]>} */
    redis: (...args) => {
        return redisExecutor(redisClient, args)
    },

    /** @type {<K extends keyof RedisCommander>(method: K, ...args: Parameters<RedisCommander[K]>) => ReturnType<RedisCommander[K]>} */
    sharedRedis: (...args) => {
        return redisExecutor(sharedRedis, args)
    },

    /**
     * @param {'redis' | 'redis2' | 'sharedRedis'} type
     * @returns {Redis}
     */
    getRedisInstance: (type) => {
        switch(type) {
            case 'redis': {
                return redisClient;
            }
            case 'sharedRedis': {
                return sharedRedis;
            }
        }
    }
}