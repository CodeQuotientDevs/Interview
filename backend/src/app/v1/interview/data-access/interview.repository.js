const { logger } = require('@libs');

module.exports = class InterviewRepository {
    /** @type { import("./interview.model").InterviewModel } */
    model
    /** @param { import("./interview.model").InterviewModel } model */
    constructor(model) {
        this.model = model;
    }

    /**
     * 
     * @param {{ [key: string]: any}} obj 
     * @param {import("mongoose").UpdateQuery<import("./interview.model").Interview>} updateOperation
     * @returns 
     */
    async #findOneAndUpdate(obj, updateOperation) {
        return this.model.findOneAndUpdate(obj, updateOperation, { new: true });
    }

    /**
     * 
     * @param {string} id 
     * @param { import("mongoose").ProjectionType<import("./interview.model").InterviewModel> } projection
     */
    async findById(id, projection) {
        return this.model.findOne({ id, isActive: true }, projection, { lean: true });
    }

    async find(findObj, projection, options = {}) {
        options.lean = true;
        return this.model.find(findObj, projection, options);
    }

    async findOne(findObj, projection, options = {}) {
        options.lean = true;
        return this.model.findOne(findObj, projection, options);
    }

    /**
     * 
     * @param { Partial<import("./interview.model").Interview> } objToSave 
     * @param {{ userId: string, orgId: string }} session 
     */
    async create(objToSave, session) {
        objToSave.createdBy = session.userId;
        objToSave.orgId = session.orgId;
        return new this.model(objToSave).save();
    }

    /**
     * 
     * @param {string} id 
     * @param {Partial<import("./interview.model").Interview>} 
     * @param {{ userId: string, orgId: string }} session
     */
    async update(id, updateObj, session ) {
        const previousInterview = await this.#findOneAndUpdate({
            id: id,
            isActive: true,
        }, {
            $set: {
                isActive: false,
            }
        });
        if (!previousInterview) {
            return null;
        }
        try {
            updateObj.id = previousInterview.id;
            delete updateObj.versionId;
            updateObj.createdBy = session.userId;
            updateObj.orgId = previousInterview.orgId;
            return new this.model(updateObj).save();
        } catch (error) {
            this.#findOneAndUpdate({
                id: previousInterview.id,
                versionId: previousInterview.versionId,
            }, {
                $set: {
                    isActive: true,
                }
            }).catch((error) => {
                logger.error(`Error while fallback update in interview please do it manually`, { id: previousInterview.id, versionId: previousInterview.versionId, error });
            });
        }
    }

    /**
     * 
     * @param {string} id 
     * @param {{ userId: string, orgId: string }} session
     * @returns 
     */
    async delete(id, session) {
        return this.#findOneAndUpdate({
            id: id,
            isActive: true,
        }, {
            $set: {
                deletedBy: session.userId,
                deletedAt: new Date(),
            }
        });
    }
}