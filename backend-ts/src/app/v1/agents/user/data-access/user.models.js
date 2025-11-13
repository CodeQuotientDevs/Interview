const { Schema, model, default: mongoose } = require('mongoose');
const { modelString } = require('@/constants');


/** @type { mongoose.Schema<import('./user.model').SingleUserModel> } */
const schema = Schema({
    id: {
        type: Schema.ObjectId,
        default: () => new mongoose.Types.ObjectId(),
    },
    email: {
        type: String,
        required: true,
    },
    isActive: {
        type: Boolean,
    },
    name: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
}, { 
    timestamps: true,
});

schema.index({ id: 1 }, { background: true, unique: true, });
schema.index({ email: 1 }, { background: true, unique: true });

/** @type { import('./user.model').UserModel } */
const userModel = model(modelString.user, schema);
module.exports = userModel;
