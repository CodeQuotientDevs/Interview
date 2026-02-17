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
import { candidateInviteSchema, interviewContentSchema, messagesSchema } from "@/zod/candidate";
import logger from "@/lib/logger";
import { DashboardGraphDataSchema, DashboardSchema } from "@/zod/dashboard";
import { RecentInterviewSchema } from "@/components/data-table";

interface MainStoreState {
    sendMessageAi: (id: string, message: string, audioUrl?: string, type?: string, audioDuration?: number) => Promise<typeof messagesSchema._type>;
    interviewList: (page?: number, limit?: number, searchQuery?: string, sortBy?: string, sortOrder?: 'asc' | 'desc', type?: 'owned' | 'shared') => Promise<{
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
    getInterviewCandidateList: (id: string, page?: number, limit?: number, sortBy?: string, sortOrder?: 'asc' | 'desc') => Promise<{
        data: Array<typeof interviewCandidateListSchema._type>;
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
        meta?: {
            sharedAccess?: boolean;
        }
    }>;
    getDataForInterview: (id: string) => Promise<typeof interviewContentSchema._type>;
    cloneInterview: (id: string) => Promise<string>
    revaluate: (id: string, prompt?: string) => Promise<string>
    getCandidateAttempt: (interviewId: string, attemptId: string) => Promise<typeof interviewCandidateReportSchema._type>;
    concludeCandidateInterview: (attemptId: string) => Promise<void>;
    concludeInterview: (interviewId: string, attemptId?: string) => Promise<void>
    getDashboardStats: () => Promise<typeof DashboardSchema._type>;
    getDashboardGraphdata: (startDate?: Date, endDate?: Date) => Promise<typeof DashboardGraphDataSchema._type>;
    getInterviewsByDate: (date: Date, type: 'hour' | 'date' | 'month') => Promise<Array<typeof RecentInterviewSchema._type>>;
    getPresignedUrl: (contentType: string) => Promise<{ uploadUrl: string; fileUrl: string; key: string }>;
    getInterviewMeta: (id: string) => Promise<{ inviteStatus: string; completedAt?: string; startTime?: string; endTime?: string; candidate: { email: string }; currentTime?: number, isInitialized:boolean }>;
    shareInterview: (interviewId: string, email: string) => Promise<void>;
    unshareInterview: (interviewId: string, userId: string) => Promise<void>;
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
        async interviewList(page?: number, limit?: number, searchQuery?: string, sortBy?: string, sortOrder?: 'asc' | 'desc', type?: 'owned' | 'shared') {
            const res = await client.interviewList(page, limit, searchQuery, sortBy, sortOrder, type);
            return res;
        },
        async updateInterview(data) {
            const res = await client.updateInterview(data);
            return res;
        },
        async sendMessageAi(id, message, audioUrl, type, audioDuration) {
            const res = await client.sendMessage(id, message, audioUrl, type, audioDuration);
            return res;
        },
        async getInterviewCandidateList(id, page, limit, sortBy, sortOrder) {
            const res = await client.getCandidateInterviewList(id, page, limit, sortBy, sortOrder);
            return res;
        },
        async sendInterviewCandidate(id, data) {
            logger.info(`Data: `, data as unknown as undefined);
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
        async revaluate(id, prompt) {
            const res = await client.revaluateInterviewAttempt(id, prompt);
            return res.id;
        },
        async getCandidateAttempt(interviewId, attemptId) {
            const res = await client.getCandidateInterviewAttempt(interviewId, attemptId);
            return res;
        },
        async concludeInterview(interviewId, attemptId) {
            await client.concludeInterview(interviewId, attemptId ? [attemptId] : undefined);
        },
        async concludeCandidateInterview(attemptId) {
            await client.concludeCandidateInterview(attemptId);
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
        },
        async getPresignedUrl(contentType: string) {
            const res = await client.getPresignedUrl(contentType);
            return res;
        },
        async getInterviewMeta(id: string) {
            const res = await client.getInterviewMeta(id);
            return res;
        },
        async shareInterview(interviewId: string, email: string) {
            await client.shareInterview(interviewId, email);
        },
        async unshareInterview(interviewId: string, userId: string) {
            await client.unshareInterview(interviewId, userId);
        }
    };

    return create<MainStoreState>()(
        immer(() => ({
            ...initialValues,
        }))
    );
};