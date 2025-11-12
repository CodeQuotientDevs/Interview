import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import MainApi from "@/client/main-client";
import {
    interviewGetSchema,
    interviewItemSchema,
    interviewUpdateSchema,
    interviewListItemSchema,
    interviewCandidateListSchema,
    interviewCandidateReportSchema,
} from "@/zod/interview";
import type { Content } from "@google/generative-ai";
import { candidateInviteSchema } from "@/zod/candidate";
import logger from "@/lib/logger";
import { DashboardGraphDataSchema, DashboardSchema } from "@/zod/dashboard";
import { RecentInterviewSchema } from "@/components/data-table";

interface MainStoreState {
    sendMessageAi: (id: string, message: string) => Promise<Array<Content>>;
    interviewList: (page?: number, limit?: number) => Promise<{
        data: Array<typeof interviewListItemSchema._type>;
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getInterview: (id: string) => Promise<typeof interviewGetSchema._type>;
    addInterview: (data: typeof interviewItemSchema._type) => Promise<string>;
    updateInterview: (data: typeof interviewUpdateSchema._type) => Promise<string>;
    sendInterviewCandidate: (id: string, date: typeof candidateInviteSchema._type) => Promise<string>;
    updateInterviewCandidate: (interviewId: string, candidateId: string, data: typeof candidateInviteSchema._type) => Promise<string>;
    getInterviewCandidateList: (id: string) => Promise<Array<typeof interviewCandidateListSchema._type>>;
    getDataForInterview: (id: string) => Promise<{ completedAt?: Date, messages: Array<Content> }>;
    cloneInterview: (id: string) => Promise<string>
    revaluate: (id: string) => Promise<string>
    getCandidateAttempt: (interviewId: string, attemptId: string) => Promise<typeof interviewCandidateReportSchema._type>;
    concludeInterview: (interviewId: string, attemptId?: string) => Promise<void>
    getDashboardStats: () => Promise<typeof DashboardSchema._type>;
    getDashboardGraphdata: (startDate?: Date, endDate?: Date) => Promise<typeof DashboardGraphDataSchema._type>;
    getInterviewsByDate: (date: Date, type: 'hour' | 'date' | 'month') => Promise<Array<typeof RecentInterviewSchema._type>>;
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
        async interviewList(page?: number, limit?: number) {
            const res = await client.interviewList(page, limit);
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
        async updateInterviewCandidate(interviewId, candidateId, data) {
            const res = await client.updateInterviewCandidate(interviewId, candidateId, data);
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
            await client.concludeInterview(interviewId, attemptId ? [attemptId] : undefined);
        },
        async getDashboardStats() {
            const res = await client.getDashboardStats();
            return res;
        },
        async getDashboardGraphdata(startDate?: Date, endDate?: Date) {
            const res = await client.getDashboardGraphdata(startDate, endDate);
            return res;
        },
        async getInterviewsByDate(date: Date, type: 'hour' | 'date' | 'month') {
            const res = await client.getInterviewsByDate(date, type);
            return res;
        }
    };

    return create<MainStoreState>()(
        immer(() => ({
            ...initialValues,
        }))
    );
};