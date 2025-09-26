const redis = require('@libs/redis');
const redisConstant = require('@/constants/redis');
const { logger } = require('@/libs');

module.exports = class CandidateResponseService {
    /** @type { import('../data-access/candidate-response.model').CandidateChatModel } */
    #model

    /** @param { import('../data-access/candidate-response.model').CandidateChatModel } */
    constructor(model) {
        this.#model = model;
    }

    /** @param {string} attemptId */
    async saveUserResponseToDB(attemptId) {
        const key = redisConstant.getChatHistory(attemptId);
        const isPresentInRedis = await redis.exists(key);
        if (!isPresentInRedis) {
            await redis.zrem(redisConstant.activeChatSet, attemptId);
            logger.info(`${attemptId} not present in the redis skipping.`);
            return;
        }
        const messages = await redis.lrange(key, 0, -1);
        if (messages) {
            await this.#model.updateOne({
                attemptId: attemptId,
            }, {
                $set: {
                    messages: messages,
                },
                $setOnInsert: {
                    attemptId: attemptId,
                }
            }, {
                upsert: true,
            });
        }
        await redis.zrem(redisConstant.activeChatSet, attemptId);
        await redis.del(redisConstant.getChatHistory(attemptId));
        return true;
    }

    /** @param {string} attemptId */
    async populateAttemptFromDBToRedis(attemptId) {
        const messages = await this.#model.findOne({
            attemptId,
        }, { messages: 1 }, {});
        if (!messages?.messages.length) {
            return false;
        }
        await redis.rpush(redisConstant.getChatHistory(attemptId), ...messages.messages);
        await redis.zadd(
            redisConstant.activeChatSet,
            redisConstant.getScoreForChat(),
            attemptId,
        )
        return true;
    }
}