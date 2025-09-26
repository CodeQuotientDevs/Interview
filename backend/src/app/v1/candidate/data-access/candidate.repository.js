const { logger } = require('@libs');

module.exports = class InterviewCandidate{
    /** @type { import('./candidate.model').CandidateModel } */
    model

    /** @param { import('./candidate.model').CandidateModel } model */
    constructor(model) {
        this.model = model;
    }

    async findOne(findObj, projection, options = {}) {
        options.lean = true;
        return this.model.findOne(findObj, projection, options);
    }

    async find(findObj, projection, options = {}) {
        options.lean = true;
        return this.model.find(findObj, projection, options);
    }

    /**
     * 
     * @param { Partial<import('./candidate.model').Candidate } objToSave 
     * @param {*} session 
     * @returns 
     */
    async create(objToSave, session) {
        return new this.model(objToSave).save();
    }

    async updateOne(findObj, objToUpdate, options = {}) {
        options.lean = true;
        options.new = true;
        return this.model.findOneAndUpdate(findObj, objToUpdate, options);
    }
}