

module.exports = class AuthService {
    /**
     * @type {import('../data-access/auth.repository')}
     */
    #model

    constructor(model) {
        this.#model = model;
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

    async createOne(saveObj) {
        return this.#model.save(saveObj)
    }

    async findOne(criteria, projection, options = {}) {
        return this.#model.findOne(criteria, projection, options);
    }

    async updateOne(objToUpdate, updateObj, options = {}) {
        return this.#model.updateOne(objToUpdate, updateObj, options);
    }
}