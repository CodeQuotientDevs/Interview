import type mongoose from "mongoose"

type Candidate = {
    id: mongoose.Types.ObjectId,
    versionId: mongoose.Types.ObjectId,
    interviewId: mongoose.Types.ObjectId,
    externalUser: boolean,
    userId: string,
    score: number,
    endTime: Date,
    startTime: Date,
    completedAt: Date,
    concludedAt: Date,
    userSpecificDescription: string,
    yearOfExperience: number,
    externalUserUniquenessKey?: string,
    isActive: boolean,
    inviteStatus: 'pending' | 'processing' | 'completed' | 'failed',
    attachments: { url: string, content: string, originalName: string }[],
    summaryReport?: string,
    revaluationStartDate?: Date,
    revaluationPrompt?: string,
    detailedReport: Array<{
        topic: string,
        score: number,
        topicWeight: number,
        detailedReport: string,
        questionsAsked: Array<{
            question: string,
            score: number,
            userAnswer: string,
            remarks: string,
        }>
    }>
}

type CandidateModel = mongoose.Model<Candidate>