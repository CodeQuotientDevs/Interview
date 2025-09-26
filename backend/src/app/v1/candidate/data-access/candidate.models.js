const { Schema, model, default: mongoose } = require('mongoose');
const { modelString } = require('@/constants');

/** @type { Schema<import('./candidate.model').Candidate } */
const schema = Schema({
    id: {
        type: Schema.ObjectId,
        default: () => new mongoose.Types.ObjectId(),
        required: true,
    },
    interviewId:  {
        type: Schema.ObjectId,
        required: true,
    },
    versionId: {
        type: Schema.ObjectId,
        required: true,
    },
    externalUser: {
        type: Boolean,
        required: true,
    },
    userId: {
        type: String,
        required: true,
    },
    externalUserUniquenessKey: {
        type: String,
    },
    userSpecificDescription: {
        type: String,
        required: true,
    },
    yearOfExperience: {
        type: Number,
        required: true,
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true,
    },
    startTime: {
        type: Date,
        required: true,
    },
    endTime: Date,
    score: Number,
    completedAt: Date,
    summaryReport: {
        type: String,
    },
    detailedReport: [{
        topic: String,
        score: Number,
        topicWeight: Number,
        detailedReport: String,
        questionsAsked: [{
            userAnswer: String,
            question: String,
            remarks: String,
            score: Number,
        }]
    }],
}, {
    timestamps: true,
});

schema.index({ externalUserUniquenessKey: 1 }, { background: true, sparse: true });
schema.index({ id: 1 }, { background: true, unique: true });
schema.index({ userId: 1, interviewId: 1 }, { background: true, unique: true, partialFilterExpression: { externalUser: false } });
module.exports = model(modelString.interviewAttempt, schema);
