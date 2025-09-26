const constants = require('@/constants');
const { interviewCreationSchema } = require('@/zod/interview');

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
}