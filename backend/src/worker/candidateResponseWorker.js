const { logger } = require('@/libs');
const redisService = require('@/services/redis');
const redisConstant = require('@/constants/redis');


module.exports = class CandidateResponseWorker{
    /** @type { import('@/app/v1/candidate-responses/domain/candidate-response.service') } */
    #candidateResponseService

    /** @type { import('@/app/v1/candidate/domain/candidate.service') } */
    #candidateService
    constructor({ candidateResponseService, candidateService }) {
        this.#candidateResponseService = candidateResponseService;
        this.#candidateService = candidateService;
    }

    /**
     * 
     * @returns {boolean}
     */
    async saveTopResultFromRedis() {
        const attemptId = (await redisService.getRedisInstance('redis').zrange(redisConstant.activeChatSet, 0, Date.now(), 'BYSCORE', 'LIMIT', 0, 1))?.[0] ?? null;
        if (!attemptId) {
            return false;
        }
        await redisService.getRedisInstance('redis').zincrby(redisConstant.activeChatSet, 10 * 60 * 1000, attemptId)
        logger.info(`Save message history for attempt ${attemptId}`);
        const result = await this.#candidateResponseService.saveUserResponseToDB(attemptId);
        return result;
    }

    async saveSubmissionFromQueue() {
        const attemptId = (await redisService.getRedisInstance('redis').zrange(redisConstant.completedInterview, 0, Date.now(), 'BYSCORE', 'LIMIT', 0, 1))?.[0] ?? null;
        if (!attemptId) {
            return false;
        }
        await redisService.getRedisInstance('redis').zincrby(redisConstant.activeChatSet, 10 * 60 * 1000, attemptId)
        logger.info(`Generating report attempt ${attemptId}`);
        const result = await this.#candidateService.generateAndSaveUserReport(attemptId);
        await redisService.getRedisInstance('redis').zrem(redisConstant.completedInterview, attemptId);
        return result;
    }
}