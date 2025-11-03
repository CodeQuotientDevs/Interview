const redis = require('@/libs/redis');
const redisConstant = require('@/constants/redis');
const { sendInvite } = require('@libs/mailer');
const InterviewAiModel = require('@/model/interviewModel');
const { userReportSchema } = require('@/zod/candidate');
const { cacheRedisConstants, getCache, removeFromCache } = require('@/libs/cacheService');
const { redisService } = require('@/services');
const { candidateInterviewAttemptStatus } = require('@/constants');

module.exports = class Candidates {
    /** @type {import('../data-access/candidate.repository')} */
    #model

    /**
     * 
     * @param {import('../data-access/candidate.repository')} model
     */
    constructor(model) {
        this.#model = model;
    }

    /**
     * 
     * @param {string} interviewId 
     */
    async listInterviewCandidate(interviewId) {
        const findObj = {
            interviewId,
            isActive: true,
        }
        const data = await this.#model.find(findObj, {
            id: 1,
            interviewId: 1,
            versionId: 1,
            externalUser: 1,
            userId: 1,
            startTime: 1,
            endTime: 1,
            score: 1,
            completedAt: 1,
            summaryReport: 1,
            detailedReport: 1,
        });
        return data;
    }

    /**
     * 
     * @param {{ id: string, versionId: string }} interviewObj 
     * @param {{ [key: string]: any }} data 
     * @param {boolean} externalUser
     */
    async createCandidateInterview(interviewObj, data) {
        if (data.externalUser) {
            const userObj = await this.#model.findOne({
                userId: data.userId,
                externalUserUniquenessKey: data.externalUserUniquenessKey,
            });
            if (userObj) {
                return userObj;
            }
        }
        const objToSave = {
            interviewId: interviewObj.id,
            versionId: interviewObj.versionId,
            externalUser: data.externalUser,
            userId: data.userId,
            userSpecificDescription: data.userSpecificDescription,
            yearOfExperience: data.yearOfExperience,
            startTime: data.startTime,
            endTime: data.endTime,
        }
        if (data.externalUserUniquenessKey) {
            objToSave.externalUserUniquenessKey = data.externalUserUniquenessKey;
        }
        const candidateObj = await this.#model.create(objToSave);
        return candidateObj;

    }

    /**
     * 
     * @param {string} id 
     * @param {{ [key: string]: 1 }}
     * @returns 
     */
    async findById(id, projection = {}) {
        return this.#model.findOne({ id }, projection);
    }

    async updateOne(findObj, updateObj) {
        return this.#model.updateOne(findObj, updateObj);
    }

    async saveToSubmissionQueue(id) {
        return redis.zadd(redisConstant.completedInterview, Date.now(), id);
    }

    /**
     * 
     * @param {string} id 
     * @param {boolean?} revaludate
     * @returns 
     */
    async generateAndSaveUserReport(id, revaluate) {
        const history = await redis.lrange(redisConstant.getChatHistory(id), 0, -1);
        const parsedHistory = history.map(el => JSON.parse(el));
        const aiModel = new InterviewAiModel('gemini-2.5-flash', {
            history: parsedHistory,
            useReportSchema: true,
        });
        const message = await aiModel.getUserReport();
        if ('text' in message.response) {
            const response = InterviewAiModel.parseAiResponse(message.response.text());
            const parsedResponse = userReportSchema.safeParse(response);
            if (parsedResponse.error) {
                throw new Error(`Invalid Response by ai model for ${id}`);
            }
            if (parsedResponse.success) {
                const setObj = {
                    completedAt: new Date(),
                    score: parsedResponse.data.scorePercentage ?? 0,
                    summaryReport: parsedResponse.data.summaryReport,
                    detailedReport: parsedResponse.data.detailsDescription ?? [],
                }
                if (revaluate) {
                    delete setObj.completedAt;
                }
                const updateObj = {
                    $set: setObj,
                }
                const response = await this.updateOne({
                    id: id,
                }, updateObj);
                if (response.interviewId) {
                    await removeFromCache(cacheRedisConstants.getPreviouslyAskedQuestion(response.interviewId))
                }
                return response;
            }
        }
    }

    /**
     * 
     * @param {string} interviewId 
     */
    async #previouslyAskedQuestionsFromDB(interviewId) {
        const interviewAttempts = await this.#model.model.aggregate(
            [
                {
                    $match: {
                        interviewId: interviewId,
                        $and: [
                            { completedAt: { $exists: true } },
                            { completedAt: { $ne: null } },
                            { detailedReport: { $exists: true } }, 
                        ]
                    },
                },
                {
                    $unwind: "$detailedReport"
                }, {
                    $unwind: "$detailedReport.questionsAsked"
                },
                {
                    $group: {
                        "_id": "$interviewId",
                        "questionAsked": { $push: "$detailedReport.questionsAsked.question" }
                    }
                }
            ]
        );
        const questionsAsked = interviewAttempts[0]?.questionAsked ?? [];
        return questionsAsked;
    }

    /**
     * 
     * @param {string} interviewId 
     */
    async getAllCandidateInterviewStatus(interviewId) {
        const candidates = await this.#model.find({
            interviewId,
        }, {}, {});
        const candidateIdToObjectMap = new Map();

        /**
         * @type {Array<string>}
         */
        const candidateToCheckOfPendingOrNotStartedStatus = [];
        for (let index = 0; index < candidates.length; index++) {
            const candidate = candidates[index];
            candidateIdToObjectMap.set(candidate.id.toString(), candidate);
            if (candidate.completedAt) {
                candidate.completionStatus = candidateInterviewAttemptStatus.completed;
                break;
            }
            candidateToCheckOfPendingOrNotStartedStatus.push(candidate.id.toString());
        }

        // for (let index = 0; index < candidateToCheckOfPendingOrNotStartedStatus.length; index++) {
        //     const candidateId = candidateToCheckOfPendingOrNotStartedStatus[index];
        //     await 
        // }

        return candidates;
    }

    /**
     * 
     * @param {string} interviewId 
     */
    async previouslyAskedQuestions(interviewId) {
        return getCache(cacheRedisConstants.getPreviouslyAskedQuestion(interviewId), () => {
            return this.#previouslyAskedQuestionsFromDB(interviewId);
        });
    }

    async find(findObj, projection, options = {}) {
        options.lean = true;
        return this.#model.find(findObj, projection, options);
    }

    /**
     * 
     * @param {Array<string>} ids 
     */
    async concludeCandidateInterview(ids) {
        const redisPipeline = redis.pipeline();
        ids.forEach((id) => {
            redisPipeline.zadd(redisConstant.completedInterview, Date.now(), id);
        });
        return redisPipeline.exec();
    }

    /**
     * @param {{ daysLimit?: number }} [options]
     * @returns {Promise<{ date: string; label: string; scheduled: number; concluded: number }[]>}
    */
    async getMetrics(options) {
        const MIN_DAYS_LIMIT = 1;
        const MAX_DAYS_LIMIT = 400;
        const daysLimit = Math.max(MIN_DAYS_LIMIT, Math.min(options?.daysLimit ?? 7, MAX_DAYS_LIMIT));
        
        // Calculate start date
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - daysLimit);
        
        // Create separate aggregations for scheduled and concluded interviews
        let labelFormat;
        if (daysLimit === 1) {
            labelFormat = 'hour';
        } else if (daysLimit <= 60) {
            labelFormat = 'date';
        } else {
            labelFormat = 'month';
        }

        // Get scheduled interviews grouped by startTime
        const scheduledMetrics = await this.#model.model.aggregate([
            {
                $match: {
                    startTime: { $gte: startDate, $lte: endDate },
                    isActive: true
                }
            },
            {
                $group: {
                    _id: labelFormat === 'hour' ? {
                        year: { $year: "$startTime" },
                        month: { $month: "$startTime" },
                        day: { $dayOfMonth: "$startTime" },
                        hour: { $hour: "$startTime" }
                    } : labelFormat === 'date' ? {
                        year: { $year: "$startTime" },
                        month: { $month: "$startTime" },
                        day: { $dayOfMonth: "$startTime" }
                    } : {
                        year: { $year: "$startTime" },
                        month: { $month: "$startTime" }
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get concluded interviews grouped by completedAt
        const concludedMetrics = await this.#model.model.aggregate([
            {
                $match: {
                    completedAt: { $gte: startDate, $lte: endDate },
                    isActive: true
                }
            },
            {
                $group: {
                    _id: labelFormat === 'hour' ? {
                        year: { $year: "$completedAt" },
                        month: { $month: "$completedAt" },
                        day: { $dayOfMonth: "$completedAt" },
                        hour: { $hour: "$completedAt" }
                    } : labelFormat === 'date' ? {
                        year: { $year: "$completedAt" },
                        month: { $month: "$completedAt" },
                        day: { $dayOfMonth: "$completedAt" }
                    } : {
                        year: { $year: "$completedAt" },
                        month: { $month: "$completedAt" }
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Merge the results
        const metricsMap = new Map();
        
        // Add scheduled counts
        scheduledMetrics.forEach(metric => {
            const key = JSON.stringify(metric._id);
            metricsMap.set(key, { 
                _id: metric._id, 
                scheduled: metric.count, 
                concluded: 0 
            });
        });

        // Add concluded counts
        concludedMetrics.forEach(metric => {
            const key = JSON.stringify(metric._id);
            const existing = metricsMap.get(key);
            if (existing) {
                existing.concluded = metric.count;
            } else {
                metricsMap.set(key, { 
                    _id: metric._id, 
                    scheduled: 0, 
                    concluded: metric.count 
                });
            }
        });

        const metrics = Array.from(metricsMap.values()).sort((a, b) => {
            // Sort by year, month, day, hour
            if (a._id.year !== b._id.year) return a._id.year - b._id.year;
            if (a._id.month !== b._id.month) return a._id.month - b._id.month;
            if (a._id.day !== undefined && b._id.day !== undefined && a._id.day !== b._id.day) return a._id.day - b._id.day;
            if (a._id.hour !== undefined && b._id.hour !== undefined && a._id.hour !== b._id.hour) return a._id.hour - b._id.hour;
            return 0;
        });

        // Format the results with proper labels and dates
        const formattedMetrics = metrics.map(metric => {
            let date, label;
            
            if (labelFormat === 'hour') {
                const dateObj = new Date(metric._id.year, metric._id.month - 1, metric._id.day, metric._id.hour);
                date = dateObj.toISOString();
                label = `${metric._id.hour.toString().padStart(2, '0')}:00`;
            } else if (labelFormat === 'date') {
                const dateObj = new Date(metric._id.year, metric._id.month - 1, metric._id.day);
                date = dateObj.toISOString();
                label = `${metric._id.day}/${metric._id.month}`;
            } else {
                const dateObj = new Date(metric._id.year, metric._id.month - 1, 1);
                date = dateObj.toISOString();
                label = `${metric._id.month}/${metric._id.year}`;
            }

            return {
                date,
                label,
                scheduled: metric.scheduled,
                concluded: metric.concluded
            };
        });

        return formattedMetrics;
    }

}
