
module.exports = class UserService{
    /** @type { import('../data-access/user.repository') } */
    #model

    /** @param { import('../data-access/user.repository') } model */
    constructor(model) {
        this.#model = model;
    }

    async createOrFindUser(data) {
        return this.#model.updateOne({
            email: data.email,
        }, data);
    }

    /**
     * 
     * @param {Array<string>} ids 
     */
    async getUserMap(ids, projection, options = {}) {
        const users = await this.#model.find({ id: ids }, {...projection, id: 1}, options);
        const userMap = new Map();
        users.forEach((user) => {
            userMap.set(user.id.toString(), user);
        });
        return userMap;
    }

    /**
     * 
     * @param {string} id 
     */
    async getUserById(id) {
        return this.#model.findUserById(id, {});
    }
}