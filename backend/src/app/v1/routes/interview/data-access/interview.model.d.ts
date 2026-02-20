import type mongoose from "mongoose"

type Interview = {
    id: mongoose.Types.ObjectId,
    orgId: mongoose.Types.ObjectId,
    title: string,
    versionId: mongoose.Types.ObjectId,
    isActive: boolean,
    duration: number,
    generalDescriptionForAi: string,
    deletedBy: mongoose.Types.ObjectId,
    deletedAt: Date,
    firstCreatedAt: Date,
    keywords: Array<string>,
    createdBy: mongoose.Types.ObjectId,
    difficulty: Array<{
        skill: string,
        difficulty: number,
        weight: Number,
        duration: Number,
        questionList: string,
    }>
    sharedIds: Array<{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Auth"
    }>
}

type InterviewModel = mongoose.Model<Interview>