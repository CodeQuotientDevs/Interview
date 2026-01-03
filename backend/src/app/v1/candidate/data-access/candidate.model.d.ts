import type mongoose from "mongoose"
type inviteStatus = 'pending' | 'processing' | 'sent' | 'failed'

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
    userSpecificDescription: string,
    attachments: Array<{
        url: string,
        content: string,
    }>,
    inviteStatus: inviteStatus,
    yearOfExperience: number,
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