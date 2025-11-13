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
     * @param {{ startDate?: Date, endDate?: Date }} [options]
     * @param {string[]} [interviewIds] - Array of accessible interview IDs to filter by
     * @returns {Promise<{ labelFormat: "hour" | "date" | "month"; metrics: { date: string; label: string; scheduled: number; concluded: number }[] }>}
    */
    async getMetrics(options, interviewIds = []) {
        const locales = "en-US";
        const MAX_DATE_RANGE_DAYS = 400;

        const now = new Date();

        let endDate = options?.endDate || now;
        let startDate = options?.startDate;

        if (!startDate) {
            startDate = new Date(endDate);
            startDate.setDate(endDate.getDate() - 7);
        }

        if (endDate > now) {
            endDate = now;
        }

        console.log('Before adjustments:', {
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString()
        });

        if (startDate > endDate) {
            startDate = new Date(endDate);
            startDate.setDate(endDate.getDate() - 7);
            console.log('Adjusted startDate because it was after endDate');
        }

        // Calculate the difference in days
        let diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        console.log('Initial diffDays:', diffDays);

        if (diffDays > MAX_DATE_RANGE_DAYS) {
            startDate = new Date(endDate);
            startDate.setDate(endDate.getDate() - MAX_DATE_RANGE_DAYS);
            // Recalculate after adjustment
            diffTime = Math.abs(endDate.getTime() - startDate.getTime());
            diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            console.log('Adjusted to MAX_DATE_RANGE_DAYS, new diffDays:', diffDays);
        }

        console.log('After adjustments:', {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            diffDays
        });

        let labelFormat = 'date';
        // if (diffDays <= 1) {
        //     labelFormat = 'hour';
        // } else if (diffDays <= 180) {
        //     labelFormat = 'date';
        // } else {
        //     labelFormat = 'month';
        // }

        console.log('Selected labelFormat:', labelFormat);

        const baseMatch = {
            startTime: { $gte: startDate, $lte: endDate },
            isActive: true
        };

        baseMatch.interviewId = { $in: interviewIds };

        // Get scheduled interviews grouped by startTime
        const scheduledMetrics = await this.#model.model.aggregate([
            {
                $match: baseMatch
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

        const concludedMatch = {
            completedAt: { $gte: startDate, $lte: endDate },
            isActive: true
        };
        
        concludedMatch.interviewId = { $in: interviewIds };

        const concludedMetrics = await this.#model.model.aggregate([
            {
                $match: concludedMatch
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

        console.log('Aggregation Results:', {
            scheduledCount: scheduledMetrics.length,
            concludedCount: concludedMetrics.length,
            scheduledSample: scheduledMetrics.slice(0, 3),
            concludedSample: concludedMetrics.slice(0, 3)
        });

        const metricsMap = new Map();

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
            if (a._id.year !== b._id.year) return a._id.year - b._id.year;
            if (a._id.month !== b._id.month) return a._id.month - b._id.month;
            if (a._id.day !== undefined && b._id.day !== undefined && a._id.day !== b._id.day) return a._id.day - b._id.day;
            if (a._id.hour !== undefined && b._id.hour !== undefined && a._id.hour !== b._id.hour) return a._id.hour - b._id.hour;
            return 0;
        });

        const intlOptions = labelFormat === 'hour' ? { hour: '2-digit', hour12: false } :
            labelFormat === 'date' ? { month: 'short', day: 'numeric' } :
            { month: 'short', year: 'numeric' };
        
        const formattedMetrics = metrics.map(metric => {
            let date, label;
            
            if (labelFormat === 'hour') {
                const dateObj = new Date(metric._id.year, metric._id.month - 1, metric._id.day, metric._id.hour);
                date = dateObj.toISOString();
                label = dateObj.toLocaleString(locales, intlOptions);
            } else if (labelFormat === 'date') {
                const dateObj = new Date(metric._id.year, metric._id.month - 1, metric._id.day);
                date = dateObj.toISOString();
                label = dateObj.toLocaleString(locales, intlOptions);
            } else {
                const dateObj = new Date(metric._id.year, metric._id.month - 1, 1);
                date = dateObj.toISOString();
                label = dateObj.toLocaleString(locales, intlOptions);
            }

            return {
                date,
                label,
                scheduled: metric.scheduled,
                concluded: metric.concluded
            };
        });

        return {labelFormat: {locales, type: labelFormat, intlOptions }, metrics: formattedMetrics };
    }

    /**
     * Get interviews for a specific date
     * @param {Date} date - The date to query
     * @param {'hour' | 'date' | 'month'} type - The granularity type
     * @param {string[]} interviewIds - Array of accessible interview IDs
     * @returns {Promise<Array>}
     */
    async getInterviewsByDate(date, type, interviewIds = []) {
        let startDate, endDate;

        // Set date range based on type
        if (type === 'hour') {
            startDate = new Date(date);
            startDate.setMinutes(0, 0, 0);
            endDate = new Date(startDate);
            endDate.setHours(startDate.getHours() + 1);
        } else if (type === 'date') {
            startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 1);
        } else if (type === 'month') {
            startDate = new Date(date);
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setMonth(startDate.getMonth() + 1);
        }

        // Query for interviews in the date range using populate (same as recent interviews)
        const interviews = await this.#model.model.find(
            {
                interviewId: { $in: interviewIds },
                startTime: { $gte: startDate, $lt: endDate },
                isActive: true
            },
            { interviewId: 1, userId: 1, startTime: 1, createdAt: 1, completedAt: 1 }
        )
        .populate({
            path: 'interview',
            select: '_id id title duration'
        })
        .populate({
            path: 'user',
            select: '_id id name email'
        })
        .sort({ startTime: -1 });

        return interviews;
    }

}
