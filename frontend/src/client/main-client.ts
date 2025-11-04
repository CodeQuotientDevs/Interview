import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { interviewItemSchema, interviewGetSchema, interviewUpdateSchema, interviewListItemSchema, interviewCandidateListSchema, interviewCandidateReportSchema } from '@/zod/interview';
import logger from '@/lib/logger';
import Zod from 'zod';
import type { Content } from '@google/generative-ai';
import { candidateInviteSchema, interviewContentSchema } from '@/zod/candidate';
import { DashboardGraphDataSchema, DashboardSchema } from '@/zod/dashboard';

export default class MainClient {
    private url: string
    private _mainAPI: AxiosInstance
    constructor(url: string) {
        this.url = url;
        this._mainAPI = axios.create({
            baseURL: this.url,
            headers: {
                'Content-Type': 'application/json',
            },
            withCredentials: true,
        })
    }

    async requestWrapper(promise: Promise<AxiosResponse<unknown, unknown>>) {
        try {
            const data = await promise;
            return data;
        } catch (error) {
            if (error instanceof AxiosError) {
                if (error.status === 401) {
                    window.location.reload();
                }
                throw new Error(error?.response?.data?.error ?? error.message);
            }
            logger.error(error);
            throw error;
        }
    }

    async getInterview(id: string) {
        const response  = await this.requestWrapper(this._mainAPI.get(`/api/v1/interviews/${id}`));
        const rowResponse = response?.data;
        if ( rowResponse && typeof rowResponse === 'object' && 'difficulty' in rowResponse && Array.isArray(rowResponse.difficulty)) {
            const difficulty: Record<string, unknown> = {};
            rowResponse.difficulty.map((ele: unknown) => {
                if (typeof ele === 'object'
                    && ele && 'skill' in ele
                    && typeof ele.skill === 'string'
                    && 'difficulty' in ele) {
                    difficulty[ele.skill] = ele;
                }
            })
            rowResponse.difficulty = difficulty;
        }
        const validResponse = interviewGetSchema.safeParse(rowResponse);
        if (!validResponse.success) {
            logger.error(`Invalid response by the server when getting interview details : `, response.data, validResponse.error);
            throw new Error('');
        }
        return validResponse.data;
    }
    async addInterview(data: typeof interviewItemSchema._type) {
        const response = await this.requestWrapper(this._mainAPI.post('/api/v1/interviews', data));
        const obj = Zod.object({id: Zod.string()}).safeParse(response.data);
        if (!obj.success) {
            throw new Error('Something went wrong');
        }
        return obj.data.id;
    }

    async updateInterview(data: typeof interviewUpdateSchema._type) {
        const response = await this.requestWrapper(this._mainAPI.patch(`/api/v1/interviews/${data.id}`, data));
        const obj = Zod.object({ id: Zod.string() }).safeParse(response.data);
        if (!obj.success) {
            throw new Error('Something went wrong');
        }
        return obj.data.id;
    }

    async interviewList() {
        const response = await this.requestWrapper(this._mainAPI.get('/api/v1/interviews'));
        const obj = await Zod.array(interviewListItemSchema).safeParseAsync(response.data);
        if (!obj.success) {
            throw new Error('Something went wrong');
        }
        logger.info('Actual Data: ',obj.data);
        return obj.data;
    }

    async getCandidateInterviewList(id: string) {
        const response = await this.requestWrapper(this._mainAPI.get(`/api/v1/candidates/${id}`));
        const obj = await Zod.array(interviewCandidateListSchema).safeParseAsync(response.data);
        if (!obj.success) {
            logger.error('Type Error: ', obj);
            throw new Error('Something went wrong');
        }
        logger.info('Actual Data: ', obj.data);
        return obj.data;
    }

    async getCandidateInterviewAttempt(interviewId: string, attemptId: string) {
        const response = await this.requestWrapper(this._mainAPI.get(`/api/v1/candidates/${interviewId}/${attemptId}`));
        const obj = await interviewCandidateReportSchema.safeParse(response.data);
        if (!obj.success) {
            throw new Error('Something went wrong');
        }
        return obj.data;
    }

    async sendInterviewCandidate(id: string, data: typeof candidateInviteSchema._type) {
        const response = await this.requestWrapper(this._mainAPI.post(`/api/v1/candidates/${id}`, data));
        const obj = await Zod.object({ id: Zod.string()}).safeParseAsync(response.data);
        if (!obj.success) {
            throw new Error('Something went wrong');
        }
        return obj.data;
    }

    async cloneInterview(id: string) {
        const response = await this.requestWrapper(this._mainAPI.get(`/api/v1/interviews/clone/${id}`));
        const obj = await Zod.object({ id: Zod.string() }).safeParseAsync(response.data);
        if (!obj.success) {
            throw new Error('Something went wrong');
        }
        return obj.data;
    }

    async sendMessage(id: string, message: string) {
        const response = await this.requestWrapper(this._mainAPI.post(`/api/v1/candidates/messages/${id}`, {
            userInput: message,
        }));
        return response.data as Array<Content>;
    }

    async getDataForInterview(id: string) {
        const response = await this.requestWrapper(this._mainAPI.get(`/api/v1/candidates/interview/${id}`));
        const obj = interviewContentSchema.safeParse(response.data);
        if (!obj.success) {
            throw new Error('Something went wrong');
        }
        return {
            completedAt: obj.data.completedAt,
            messages: obj.data.messages
        } as { completedAt?: Date, messages: Array<Content> }
    }

    async revaluateInterviewAttempt(id: string) {
        const response = await this.requestWrapper(this._mainAPI.patch(`/api/v1/candidates/revaluate/${id}`));
        const obj = Zod.object({ id: Zod.string() }).safeParse(response.data);
        if (!obj.success) {
            throw new Error('Something went wrong');
        }
        return obj.data;
    }

    async concludeInterview(interviewId: string, attemptIds?: Array<string>) {
        const response = await this.requestWrapper(this._mainAPI.patch(`/api/v1/candidates/conclude-interviews/${interviewId}`, { attemptIds }));
        return response.data;
    }
    async getDashboardStats() {
        const response = await this.requestWrapper(this._mainAPI.get('/api/v1/interviews/stats'));
        const obj = DashboardSchema.safeParse(response.data);
        if (!obj.success) {
            throw new Error('Something went wrong');
        }
        return obj.data;
    }
    async getDashboardGraphdata(daysLimit?: number) {
        const response = await this.requestWrapper(this._mainAPI.get(`/api/v1/candidates/metrics`, {
            params: {
                daysLimit
            }
        }));
        const obj = DashboardGraphDataSchema.safeParse(response.data);
        if (!obj.success) {
            throw new Error('Something went wrong');
        }
        return obj.data;
    }
}
