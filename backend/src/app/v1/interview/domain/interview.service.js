const constants = require('@/constants');
const { interviewCreationSchema } = require('@/zod/interview');
const candidateModel = require('@/app/v1/candidate/data-access/candidate.models');
const { default: mongoose } = require('mongoose');


module.exports = class InterviewService {
    /** @type {import('../data-access/interview.repository')} */
    #model

    /** @param {import('../data-access/interview.repository')} model */
    constructor(model) {
        this.#model = model;
    }

    /**
     * 
     * @param {string} id 
     * @param {string?} versionId
     */
    getInterviewById(id, versionId) {
        const findObj = {
            id,
        };
        if (versionId) {
            findObj.versionId = versionId;
        } else {
            findObj.isActive = true;
        }
        return this.#model.findOne(findObj, {});
    }

    /**
     * 
     * @param {{ page?: number, limit?: number }} paginationConfig 
     * @param {{ userId: string, orgId: string, role: number}} session 
     */
    async listInterviewPaginated(paginationConfig, session) {
        const { page = 1, limit = 10 } = paginationConfig;
        const skip = (page - 1) * limit;

        const findObj = {
            isActive: true,
            createdBy: new mongoose.Types.ObjectId(session.userId)
        };

        // Get total count for pagination metadata
        const total = await this.#model.model.countDocuments(findObj);

        // Get paginated data
        const data = await this.#model.find(findObj, {}, {
            skip,
            limit,
            sort: { createdAt: -1 } // Sort by newest first
        });

        const totalPages = Math.ceil(total / limit);

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };
    }

    /**
     * 
     * @param {{ userId: string, orgId: string, role: number}} session 
     */
    async listInterview(session) {
        const findObj = {
            isActive: true,
            createdBy: new mongoose.Types.ObjectId(session.userId)
        };
        const data = await this.#model.find(findObj, {});
        return data;
    }

    /**
     * 
     * @param { typeof interviewCreationSchema._type } interviewObj
     * @param {Session} sessionObj 
     */
    async createInterview(interviewObj, sessionObj) {
        return this.#model.create(interviewObj, sessionObj);
    }

    /**
     * 
     * @param {string} interviewId 
     * @param {typeof interviewCreationSchema._type} updateObj 
     * @param {Session} sessionObj 
     */
    async updateInterview(interviewId, updateObj, sessionObj) {
        return this.#model.update(interviewId, updateObj, sessionObj);
    }

    /**
     * @param {{ userId: string; orgId: string; role: number }} session
     * @returns {Promise<{ interviews: { created: { today: number; overall: number } }; interviewSessions: { scheduled: number; upcoming: number; concluded: { today: number; overall: number }; recent: Record<string, any>[] } }>}
     */
    async getStats(session) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // Build filter object based on user role
        const interviewFilter = {
            isActive: true,
            createdBy: new mongoose.Types.ObjectId(session.userId)
        };

        // Count total unique interviews created by user (only latest version of each)
        const createdTotalResult = await this.#model.model.aggregate([
            {
                $match: interviewFilter
            },
            {
                $group: {
                    _id: "$id"
                }
            },
            {
                $count: "total"
            }
        ]);
        const createdTotal = createdTotalResult.length > 0 ? createdTotalResult[0].total : 0;

        // Count interviews created today (only first version of each interview)
        const createdTodayResult = await this.#model.model.aggregate([
            {
                $match: {
                    ...interviewFilter,
                    createdAt: { $gte: todayStart, $lt: todayEnd }
                }
            },
            {
                $sort: { id: 1, createdAt: 1 }
            },
            {
                $group: {
                    _id: "$id",
                    firstCreated: { $first: "$createdAt" }
                }
            },
            {
                $match: {
                    firstCreated: { $gte: todayStart, $lt: todayEnd }
                }
            },
            {
                $count: "total"
            }
        ]);
        const createdToday = createdTodayResult.length > 0 ? createdTodayResult[0].total : 0;

        // Get interview IDs that match the filter for candidate queries
        const accessibleInterviews = await this.#model.find(interviewFilter, { id: 1 });
        const interviewIds = accessibleInterviews.map(interview => interview.id);

        const scheduledToday = await candidateModel.countDocuments({
            interviewId: { $in: interviewIds },
            startTime: { $gte: todayStart, $lt: todayEnd }
        });
        const concludedToday = await candidateModel.countDocuments({
            interviewId: { $in: interviewIds },
            completedAt: { $gte: todayStart, $lt: todayEnd }
        });
        const concluded = await candidateModel.countDocuments({
            interviewId: { $in: interviewIds },
            completedAt: { $exists: true, $ne: null }
        });
        const upcoming = await candidateModel.countDocuments({
            interviewId: { $in: interviewIds },
            startTime: { $gt: todayEnd }
        });

        // Get recent active interviews (only the latest version of each)
        const recentSessions = await candidateModel.find(
            {
                interviewId: { $in: interviewIds },
                isActive: true
            },
            { interviewId: 1, userId: 1, startTime: 1, createdAt: 1, completedAt: 1, score: 1 },
        )
            .populate({
                path: 'interview',
                select: '_id id title duration'
            })
            .populate({
                path: 'user',
                select: '_id name email'
            })
            .sort({ completedAt: -1 })
            .limit(10);

        return {
            interviews: {
                created: { today: createdToday, overall: createdTotal }
            },
            interviewSessions: {
                concluded: { today: concludedToday, overall: concluded },
                scheduled: scheduledToday,
                upcoming,
                recent: recentSessions
            }
        };
    }
}