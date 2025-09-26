
module.exports = class AuthModel{
    /**@type {import('../data-access/auth.models')}  */
    #model

    constructor(model) {
        this.model = model;
    }

    async findOne(findObj, projection, options = {}) {
        options.lean = true;
        return this.model.findOne(findObj, projection, options);
    }
    
    async save(objToSave) {
        return new this.model(objToSave).save();
    }

    async find(findObj, projection, options = {}) {
        options.lean = true;
        return this.model.find(findObj, projection, options);
    }
}