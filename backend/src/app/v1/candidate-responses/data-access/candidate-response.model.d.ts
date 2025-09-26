import type mongoose from "mongoose";

type CandidateChat = {
    id: string,
    messages: Array<string>,
    attemptId: string,
}

type CandidateChatModel = mongoose.Model<CandidateChat>