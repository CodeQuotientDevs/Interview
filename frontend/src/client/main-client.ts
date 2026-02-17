import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { interviewItemSchema, interviewGetSchema, interviewUpdateSchema, interviewListItemSchema, interviewCandidateListSchema, interviewCandidateReportSchema } from '@/zod/interview';
import logger from '@/lib/logger';
import Zod from 'zod';
import { candidateInviteSchema, interviewContentSchema, messagesSchema } from '@/zod/candidate';
import { DashboardGraphDataSchema, DashboardSchema } from '@/zod/dashboard';
import { RecentInterviewSchema } from '@/components/data-table';

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
                if(error.status === 404){
                    throw new Error('Not Found');
                }
                throw new Error(error?.response?.data?.error ?? error.message);
            }
            logger.error(error);
            throw error;
        }
    }

    async getInterview(id: string) {
        const response = await this.requestWrapper(this._mainAPI.get(`/api/v1/interviews/${id}`));
        const rowResponse = response?.data;
        if (rowResponse && typeof rowResponse === 'object' && 'difficulty' in rowResponse && Array.isArray(rowResponse.difficulty)) {
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
            logger.error(`Invalid response by the server when getting interview details : `, response.data as undefined, validResponse.error);
            throw new Error('');
        }
        return validResponse.data;
    }
    async addInterview(data: typeof interviewItemSchema._type) {
        const response = await this.requestWrapper(this._mainAPI.post('/api/v1/interviews', data));
        const obj = Zod.object({ id: Zod.string() }).safeParse(response.data);
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

    async interviewList(page?: number, limit?: number, searchQuery?: string, sortBy?: string, sortOrder?: 'asc' | 'desc', type?: 'owned' | 'shared') {
        const params = new URLSearchParams();
        if (page) params.append('page', page.toString());
        if (limit) params.append('limit', limit.toString());
        if (searchQuery) params.append('searchQuery', searchQuery);
        if (sortBy) params.append('sortBy', sortBy);
        if (sortOrder) params.append('sortOrder', sortOrder);
        if (type) params.append('type', type);

        const response = await this.requestWrapper(this._mainAPI.get(`/api/v1/interviews?${params.toString()}`));
        const obj = await Zod.object({
            data: Zod.array(interviewListItemSchema),
            pagination: Zod.object({
                page: Zod.number(),
                limit: Zod.number(),
                total: Zod.number(),
                totalPages: Zod.number(),
                hasNext: Zod.boolean(),
                hasPrev: Zod.boolean()
            })
        }).safeParseAsync(response.data);
        if (!obj.success) {
            throw new Error('Something went wrong');
        }
        return obj.data;
    }

    async getCandidateInterviewList(id: string, page?: number, limit?: number, sortBy?: string, sortOrder?: 'asc' | 'desc') {
        const params = new URLSearchParams();
        if (page) params.append('page', page.toString());
        if (limit) params.append('limit', limit.toString());
        if (sortBy) params.append('sortBy', sortBy);
        if (sortOrder) params.append('sortOrder', sortOrder);

        const queryString = params.toString();
        const url = queryString ? `/api/v1/candidates/${id}?${queryString}` : `/api/v1/candidates/${id}`;
        const response = await this.requestWrapper(this._mainAPI.get(url));
        const obj = await Zod.object({
            data: Zod.array(interviewCandidateListSchema),
            pagination: Zod.object({
                page: Zod.number(),
                limit: Zod.number(),
                total: Zod.number(),
                totalPages: Zod.number(),
                hasNext: Zod.boolean(),
                hasPrev: Zod.boolean()
            }),
            meta: Zod.object({
                sharedAccess: Zod.boolean()
            }).optional()
        }).safeParseAsync(response.data);
        if (!obj.success) {
            throw new Error('Something went wrong');
        }
        return obj.data;
    }

    async getCandidateInterviewAttempt(interviewId: string, attemptId: string) {
        const response = await this.requestWrapper(this._mainAPI.get(`/api/v1/candidates/${interviewId}/${attemptId}`));
        const obj =  interviewCandidateReportSchema.safeParse(response.data);
        if (!obj.success) {
            throw new Error('Something went wrong');
        }
        return obj.data;
    }

    async shareInterview(interviewId: string, email: string) {
        const response = await this.requestWrapper(this._mainAPI.post(`/api/v1/interviews/${interviewId}/share`, { email }));
        return response.data;
    }

    async unshareInterview(interviewId: string, userId: string) {
        const response = await this.requestWrapper(this._mainAPI.delete(`/api/v1/interviews/${interviewId}/share/${userId}`));
        return response.data;
    }

    async sendInterviewCandidate(id: string, data: typeof candidateInviteSchema._type) {
        const response = await this.requestWrapper(this._mainAPI.post(`/api/v1/candidates/${id}`, data));
        const obj = await Zod.object({ id: Zod.string() }).safeParseAsync(response.data);
        if (!obj.success) {
            throw new Error('Something went wrong');
        }
        return obj.data;
    }

    async updateInterviewCandidate(interviewId: string, candidateId: string, data: typeof candidateInviteSchema._type) {
        const response = await this.requestWrapper(this._mainAPI.patch(`/api/v1/candidates/${interviewId}/${candidateId}`, data));
        const obj = await Zod.object({ id: Zod.string() }).safeParseAsync(response.data);
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

    async sendMessage(id: string, message: string, audioUrl?: string, type?: string, audioDuration?: number) {
        const response = await this.requestWrapper(this._mainAPI.post(`/api/v1/candidates/messages/${id}`, {
            userInput: message,
            audioUrl,
            type,
            audioDuration
        }));
        const obj = messagesSchema.safeParse(response.data);
        if (!obj.success) {
            throw new Error('Something went wrong');
        }
        return obj.data;
    }

    async getDataForInterview(id: string) {
        const response = await this.requestWrapper(this._mainAPI.get(`/api/v1/candidates/interview/${id}`));
        const obj = interviewContentSchema.safeParse(response.data);
        if (!obj.success) {
            throw new Error('Something went wrong');
        }
        return obj.data;
    }

    async revaluateInterviewAttempt(id: string, prompt?: string) {
        const response = await this.requestWrapper(this._mainAPI.patch(`/api/v1/candidates/revaluate/${id}`, { prompt }));
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
    
    async concludeCandidateInterview(attemptId: string) {
        const response = await this.requestWrapper(this._mainAPI.patch(`/api/v1/candidates/conclude-interview/${attemptId}`));
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
    async getDashboardGraphdata(startDate?: Date, endDate?: Date) {
        const params: { startDate?: string; endDate?: string } = {};

        if (startDate) {
            const utcStart = new Date(Date.UTC(
                startDate.getFullYear(),
                startDate.getMonth(),
                startDate.getDate(),
                0, 0, 0, 0
            ));
            params.startDate = utcStart.toISOString();
        }
        if (endDate) {
            // Normalize to UTC end of day to include the entire day
            const utcEnd = new Date(Date.UTC(
                endDate.getFullYear(),
                endDate.getMonth(),
                endDate.getDate(),
                23, 59, 59, 999
            ));
            params.endDate = utcEnd.toISOString();
        }

        const response = await this.requestWrapper(this._mainAPI.get(`/api/v1/candidates/metrics`, {
            params
        }));
        const obj = DashboardGraphDataSchema.safeParse(response.data);
        if (!obj.success) {
            throw new Error('Something went wrong');
        }
        return obj.data;
    }

    async getInterviewsByDate(date: Date, type: 'hour' | 'date' | 'month'): Promise<Array<Zod.infer<typeof RecentInterviewSchema>>> {
        const response = await this.requestWrapper(this._mainAPI.get(`/api/v1/candidates/metrics/date-details`, {
            params: {
                date: date.toISOString(),
                type
            }
        }));
        return response.data as Array<Zod.infer<typeof RecentInterviewSchema>>;
    }
    async getPresignedUrl(contentType: string):Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
        const response = await this.requestWrapper(this._mainAPI.get(`/api/v1/candidates/getPresignedUrl`, {
            params: {
                contentType
            }
        }));
        return response.data as { uploadUrl: string; fileUrl: string; key: string };
    }
    async getInterviewMeta(id: string) {
        const response = await this.requestWrapper(this._mainAPI.get(`/api/v1/candidates/interview-meta/${id}`));
        return response.data as { inviteStatus: string; completedAt?: string; startTime?: string; endTime?: string; candidate: { email: string }; currentTime?: number , isInitialized:boolean };
    }
}
