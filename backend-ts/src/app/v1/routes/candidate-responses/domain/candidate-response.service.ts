import redis from '@services/redis';
import redisConstant from '@root/constants/redis';

import logger from "@libs/logger";
import { CandidateChat, CandidateResponseModel } from '../data-access/candidate-response.models';
import { Model } from 'mongoose';

export class CandidateResponseService {
    private model: Model<CandidateChat>;
    constructor(model: Model<CandidateChat>) {
        this.model = model;
    }

    async saveUserResponseToDB(attemptId: string): Promise<boolean | void> {
        const key = redisConstant.getChatHistory(attemptId);
        const isPresentInRedis = await redis.exists(key);
        if (!isPresentInRedis) {
            await redis.zrem(redisConstant.activeChatSet, attemptId);
            logger.info(`${attemptId} not present in the redis skipping.`);
            return;
        }
        const messages = await redis.lrange(key, 0, -1);
        if (messages) {
            await this.model.updateOne({
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

    async populateAttemptFromDBToRedis(attemptId: string): Promise<boolean> {
        const messages = await this.model.findOne({
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
        );
        return true;
    }
}

export default CandidateResponseService;