const { default: mongoose } = require("mongoose");

module.exports = class UserRepository {
    /** @type { import("./user.model").UserModel } */
    model
    /** @param { import("./user.model").UserModel } model */
    constructor(model) {
        this.model = model;
    }
    /**
     * 
     * @param {string} id 
     * @param { import("mongoose").ProjectionType<import("./user.model").SingleUserModel> } projection
     */
    async findUserById(id, projection) {
        return this.model.findOne({ id}, projection, { lean: true });
    }

    /**
     * 
     * @param {{ [key: string]: string }} criteria 
     * @param {{ [key: string]: 1 }} projection 
     * @param {{ [key: string]: any }} options 
     * @returns 
     */
    async findOne(criteria, projection, options = {}) {
        options.lean = true;
        return this.model.findOne(criteria, projection, options);
    }

    /**
     * 
     * @param {{ [key: string]: string }} criteria 
     * @param {{ [key: string]: 1 }} projection 
     * @param {{ [key: string]: any }} options 
     * @returns 
     */
    async find(criteria, projection, options = {}) {
        options.lean = true;
        return this.model.find(criteria, projection, options);
    }

    async updateOne(criteria, updateObj, options = {}) {
        options.lean = true;
        const update = {
            id: new mongoose.Types.ObjectId(),
            email: updateObj.email,
            name: updateObj.name,
            phone: updateObj.phone,
        }
        const setObj = {
            name: updateObj.name,
        }
        if (update.phone) {
            setObj.phone = update.phone;
        }
        return this.model.findOneAndUpdate(criteria, {
            $set: setObj,
            $setOnInsert: {
                id: update.id,
                email: update.email,
            }
        }, {
            ...options,
            new: true,
            upsert: true,
        });
    }

    /**
     * @param {{email: string, name: string, phone: string }} userData 
     */
    async createUser( userData )  {
        userData.isActive = true;
        return new this.model(userData).save();
    }
    
    /**
     * 
     * @param {string} id
     * @param {import("mongoose").UpdateQuery<import("./user.model").SingleUserModel>} updateObj
     */
    async updateUserById( id, updateObj ) {
        return this.model.findOneAndUpdate({
            id: id,
        }, updateObj, { new: true })
    }
}