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
    createdBy: string,
    keywords: Array<string>,
    difficulty: Array<{
        skill: string,
        difficulty: number,
        weight: Number,
        duration: Number,
    }>
}

type InterviewModel = mongoose.Model<Interview>