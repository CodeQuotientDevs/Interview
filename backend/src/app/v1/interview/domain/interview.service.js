const constants = require('@/constants');
const { interviewCreationSchema } = require('@/zod/interview');
const candidateModel = require('@/app/v1/candidate/data-access/candidate.models');


module.exports =  class InterviewService {
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
     * @param {{ page?: number }} paginationConfig 
     * @param {*} session 
     */
    listInterviewPaginated(paginationConfig, session) {
        throw new Error('Not implemented yet');
    }

    /**
     * 
     * @param {{ userId: string, orgId: string, role: number}} session 
     */
    async listInterview(session) {
        const findObj = {
            isActive: true,
            $or: [
                {deletedAt: { $exists: false }},
                {deletedAt: null}
            ]
        };
        switch(session.role) {
            case constants.roleNumberFromString.admin: {
                break;
            }
            case constants.roleNumberFromString.subAdmin: {
                findObj.orgId = session.orgId;
                break;
            }
            default: {
                findObj.orgId = session.orgId;
                findObj.createdBy = session.userId;
            }
        }
        const data = await this.#model.find(findObj, {});
        return data;
    }

    /**
     * 
     * @param { typeof interviewCreationSchema._type } interviewObj
     * @param {Session} sessionObj 
     * @param {{ timestamps?: boolean }} [options]
     */
    async createInterview(interviewObj, sessionObj, options) {
        return this.#model.create(interviewObj, sessionObj, options);
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

    /** @returns {Promise<{ interviews: { created: { today: number } }; interviewSessions: { scheduled: number; upcoming: number; concluded: { today: number; overall: number }; recent: Record<string, any>[] } }>} */
    async getStats() {
       const todayStart = new Date();
       todayStart.setHours(0, 0, 0, 0);
       const todayEnd = new Date();
       todayEnd.setHours(23, 59, 59, 999);

       // Count only original interview creations (first version of each interview)
       const createdTodayResult = await this.#model.model.aggregate([
           {
               $match: {
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

       const scheduledToday = await candidateModel.countDocuments({
           startTime: { $gte: todayStart, $lt: todayEnd }
       });
       const concludedToday = await candidateModel.countDocuments({
           completedAt: { $gte: todayStart, $lt: todayEnd }
       });
       const concluded = await candidateModel.countDocuments({ 
           completedAt: { $exists: true, $ne: null } 
       });
       const upcoming = await candidateModel.countDocuments({ 
           startTime: { $gt: todayEnd } 
       });

       // Get recent active interviews (only the latest version of each)
       const recentSessions = await candidateModel.find(
           { isActive: true }, 
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
                created: { today: createdToday }
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