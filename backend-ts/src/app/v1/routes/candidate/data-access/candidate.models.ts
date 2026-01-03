import mongoose from "mongoose";
import { modelString } from "@root/constants";
import type { Candidate } from "./candidate.model"
const { Schema, model } = mongoose;

const schema = new Schema<Candidate>({
    id: {
        type: Schema.ObjectId,
        default: () => new mongoose.Types.ObjectId(),
        required: true,
    },
    interviewId: {
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
    concludedAt: Date,
    summaryReport: {
        type: String,
    },
    revaluationStartDate: {
        type: Date,
    },
    revaluationPrompt: {
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
    inviteStatus: {
        type: String,
        enum: ['pending', 'processing', 'sent', 'failed'],
        default: 'pending',
    },
    attachments: [{
        url: String,
        content: String,
        originalName: String,
    }],
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

schema.virtual('interview', {
    ref: 'interview',
    localField: 'interviewId',
    foreignField: 'id',
    justOne: true
});

schema.virtual('user', {
    ref: 'user',
    localField: 'userId',
    foreignField: 'id',
    justOne: true
});

schema.index({ externalUserUniquenessKey: 1 }, { background: true, sparse: true });
schema.index({ id: 1 }, { background: true, unique: true });
schema.index({ userId: 1, interviewId: 1 }, { background: true, unique: true, partialFilterExpression: { externalUser: false } });

export default model<Candidate>(modelString.interviewAttempt, schema);
