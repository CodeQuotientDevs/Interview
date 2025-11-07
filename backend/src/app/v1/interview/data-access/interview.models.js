const { Schema, model, mongo, default: mongoose } = require('mongoose');
const { modelString } = require('@/constants/index');

/** @type { Schema<import('./interview.model').Interview> } */
const schema = Schema({
    id: {
        type: Schema.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId(),
        required: true,
    },
    orgId: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    versionId: {
        type: Schema.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId(),
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true,
    },
    createdBy: {
        type: Schema.ObjectId,
        required: true,
    },
    deletedBy: {
        type: Schema.ObjectId,
    },
    duration: {
        type: Number,
        required: true,
    },
    firstCreatedAt: {
        type: Date,
        default: () => new Date(),
    },
    deletedAt: Date,
    generalDescriptionForAi: String,
    difficulty: {
        type: [{
            skill: String,
            difficulty: Number,
            weight: Number,
            duration: Number,
        }]
    },
    keywords: {
        type: [String],
    }
}, {
    timestamps: true,
});

schema.index({ id: 1, isActive: 1 }, { background: true, unique: true, partialFilterExpression: { isActive: true } });
schema.index({ id: 1, versionId: 1 }, { background: true, unique: true });
schema.index({ id: 1, createdAt: 1 }, { background: true, unique: false });
schema.index({ orgId: 1, createdBy: 1 }, { background: true, unique: false });

/** @type { import('./interview.model').InterviewModel } */
const interviewModel = model(modelString.interview, schema);
module.exports = interviewModel;
