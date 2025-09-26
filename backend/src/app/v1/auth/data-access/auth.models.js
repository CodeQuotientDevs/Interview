
const { Schema, model, default: mongoose } = require('mongoose');
const { modelString, roleNumberFromString } = require('@/constants');

/** @type { Schema<import('./auth.model').UserModel } */
const schema = Schema({
    id: {
        type: Schema.ObjectId,
        default: () => new mongoose.Types.ObjectId(),
        required: true,
    },
    orgId: {
        type: Schema.ObjectId,
        default: () => new mongoose.Types.ObjectId(),
        required: true,
    },
    role: {
        type: Number,
        required: true,
        default: roleNumberFromString.subAdmin,
    },
    userId: {
        type: String,
        required: false,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
    },
    loginType: {
        type: Number,
        
    },
}, {
    timestamps: true,
});

schema.index({ userId: 1 }, { sparse: true })
schema.index({ id: 1 }, { background: true, unique: true });
schema.index({ email: 1 }, { background: true, unique: true });
module.exports = model(modelString.auth, schema);
