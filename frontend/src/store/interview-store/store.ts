import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import MainApi from "@/client/main-client";
import {
    interviewGetSchema,
    interviewItemSchema,
    interviewUpdateSchema,
    interviewListItemSchema,
    interviewCandidateListSchema,
}  from "@/zod/interview";
import type { Content } from "@google/generative-ai";
import { candidateInviteSchema } from "@/zod/candidate";
import logger from "@/lib/logger";

interface MainStoreState {
    sendMessageAi: (id: string, message: string) => Promise<Array<Content>>;
    interviewList: () => Promise<Array<typeof interviewListItemSchema._type>>;
    getInterview: (id: string) => Promise<typeof interviewGetSchema._type>;
    addInterview: (data: typeof interviewItemSchema._type) => Promise<string>;
    updateInterview: (data: typeof interviewUpdateSchema._type) => Promise<string>;
    sendInterviewCandidate: (id: string, date: typeof candidateInviteSchema._type) => Promise<string>;
    getInterviewCandidateList: (id: string) => Promise<Array<typeof interviewCandidateListSchema._type>>;
    getDataForInterview: (id: string) => Promise<{ completedAt?: Date, messages: Array<Content> }>;
    cloneInterview: (id: string) => Promise<string>
    revaluate: (id: string) => Promise<string>
    getCandidateAttempt: (interviewId: string, attemptId: string) => Promise<typeof interviewCandidateListSchema._type>;
    concludeInterview: (interviewId: string, attemptId?: string) => Promise<void>
}


export const createMainStore = (client: MainApi) => {
	const initialValues: MainStoreState = {
        async getInterview(id: string) {
            const res = await client.getInterview(id);
            return res;
        },
        async addInterview(data) {
            const res = await client.addInterview(data);
            return res;
        },
        async interviewList() {
            const res = await client.interviewList();
            return res;
        },
        async updateInterview(data) {
            const res = await client.updateInterview(data);
            return res;
        },
        async sendMessageAi(id, message) {
            const res = await client.sendMessage(id, message);
            return res;
        },
        async getInterviewCandidateList(id) {
            const res = await client.getCandidateInterviewList(id);
            return res;
        },
        async sendInterviewCandidate(id, data) {
            logger.info(`Data: `, data);
            const res = await client.sendInterviewCandidate(id, data);
            return res.id;
        },
        async getDataForInterview(id) {
            const res = await client.getDataForInterview(id);
            return res;
        },
        async cloneInterview(id) {
            const res = await client.cloneInterview(id);
            return res.id;
        },
        async revaluate(id) {
            const res = await client.revaluateInterviewAttempt(id);
            return res.id;
        },
        async getCandidateAttempt(interviewId, attemptId) {
            const res = await client.getCandidateInterviewAttempt(interviewId, attemptId);
            return res;
        },
        async concludeInterview(interviewId, attemptId) {
            await client.concludeInterview(interviewId, attemptId?[attemptId]: undefined);
        },
	};

	return create<MainStoreState>()(
		immer(() => ({
			...initialValues,
		}))
	);
};