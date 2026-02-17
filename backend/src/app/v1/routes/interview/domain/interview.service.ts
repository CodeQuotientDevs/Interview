import constants from '@root/constants';
import { interviewCreationSchema } from '@app/v1/zod/interview';
import candidateModel from '@app/v1/routes/candidate/data-access/candidate.models';
import mongoose, { Document, Model, Types } from 'mongoose';
import { z } from 'zod';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import type InterviewRepositoryInterface from "../data-access/interview.repository"
import { InterviewTypeEnum } from '@root/constants/candidate';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Types
 */
type PaginationConfig = { page?: number; limit?: number; searchQuery?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' };
type InterviewCreation = z.infer<typeof interviewCreationSchema>;

type CandidateDoc = Document & {
    interviewId: string;
    startTime?: Date;
    completedAt?: Date | null;
    isActive?: boolean;
    score?: number;
    userId?: Types.ObjectId | string;
};

type RecentSession = {
    interviewId: string;
    userId?: Types.ObjectId | string;
    startTime?: Date;
    createdAt?: Date;
    completedAt?: Date | null;
    score?: number;
    interview?: { _id?: any; id?: string; title?: string; duration?: number };
    user?: { _id?: any; name?: string; email?: string };
};

export type GetStatsResult = {
    interviews: {
        created: { today: number; overall: number };
    };
    interviewSessions: {
        scheduled: number;
        upcoming: number;
        concluded: { today: number; overall: number };
        recent: RecentSession[];
    };
};


function getTodayRange(tz: string) {
    const start = dayjs().tz(tz).startOf('day').toDate();
    const end = dayjs().tz(tz).endOf('day').toDate();
    return { start, end };
}

function escapeRegex(text: string) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export class InterviewService {
    private model: InterviewRepositoryInterface;
    private timezone: string;

    constructor(model: InterviewRepositoryInterface) {
        this.model = model;
        this.timezone = 'UTC';
    }

    getInterviewById(id: string, versionId?: string) {
        const findObj: Record<string, any> = { id };
        if (versionId) {
            findObj.versionId = versionId;
        } else {
            findObj.isActive = true;
        }
        return this.model.findOne(findObj, {});
    }

    async listInterviewPaginated(paginationConfig: PaginationConfig, session: Session, type?: InterviewTypeEnum) {
        const { page = 1, limit = 10, searchQuery, sortBy, sortOrder } = paginationConfig;
        const skip = (page - 1) * limit;

        const findObj: Record<string, any> = {
            isActive: true
        };

        // Apply search filter
        if (searchQuery) {
            findObj.title = { $regex: new RegExp(escapeRegex(searchQuery), 'i') };
        }
        if (type === InterviewTypeEnum.SHARED) {
            findObj.sharedIds = new mongoose.Types.ObjectId(session.userId)
        }
        else {
            findObj.createdBy = new mongoose.Types.ObjectId(session.userId)
        }

        // Apply sorting
        let sortOption: Record<string, 1 | -1> = { createdAt: -1 }; // Default sort
        if (sortBy) {
            const sortDirection = sortOrder === 'desc' ? -1 : 1;
            sortOption = { [sortBy]: sortDirection };
        }
        // collation for case-insensitive sorting
        const collation = {
            locale: 'en',
            strength: 2  // Case-insensitive comparison
        };

        const total = await this.model.model.countDocuments(findObj);
        const data = await this.model.find(findObj, {}, {
            skip,
            limit,
            sort: sortOption,
            collation
        });

        const totalPages = Math.ceil(total / limit);

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        };
    }

    async listInterview(session: Session) {
        const findObj = {
            isActive: true,
            createdBy: new mongoose.Types.ObjectId(session.userId),
        };
        return this.model.find(findObj, {});
    }

    async createInterview(interviewObj: InterviewCreation, sessionObj: Session) {
        if (!sessionObj.userId || !sessionObj.orgId) {
            throw new Error('Invalid session: userId and orgId are required');
        }
        const sess: { userId: string; orgId: string } = {
            userId: sessionObj.userId,
            orgId: sessionObj.orgId,
        };
        return this.model.create(interviewObj, sess);
    }

    async updateInterview(interviewId: string, updateObj: InterviewCreation, sessionObj: Session) {
        if (!sessionObj.userId || !sessionObj.orgId) {
            throw new Error('Invalid session: userId and orgId are required');
        }
        const sess: { userId: string; orgId: string } = {
            userId: sessionObj.userId,
            orgId: sessionObj.orgId,
        };
        return this.model.update(interviewId, updateObj, sess);
    }

    async getUsersWithAccess(interviewId: string) {
        //get the sharedIds and then use that sharedIds to get user data
        const pipeline = [
            {
                $match: {
                    id: new mongoose.Types.ObjectId(interviewId),
                    isActive: true
                }
            },
            {
                $unwind: "$sharedIds"
            },
            {
                $lookup: {
                    from: "auths",
                    localField: "sharedIds",
                    foreignField: "id",
                    as: "authInfo"
                }
            },
            {
                $unwind: "$authInfo"
            },
            {
                $replaceRoot: {
                    newRoot: "$authInfo"
                }
            }
        ];

        const usersData = await this.model.aggregate(pipeline);
        return usersData;
    }

    async shareInterview(interviewId: string, userId: string, sessionObj: Session) {
        if (!sessionObj.userId || !sessionObj.orgId) {
            throw new Error('Invalid session: userId and orgId are required');
        }
        const sess: { userId: string; orgId: string } = {
            userId: sessionObj.userId,
            orgId: sessionObj.orgId,
        };

        const interview = await this.getInterviewById(interviewId);
        if (!interview) {
            throw new Error('Interview not found');
        }

        const sharedIds = interview.sharedIds || [];
        // Prevent duplicate sharing
        if (!sharedIds.some((id: any) => id.type.toString() === userId)) {
            const { _id, createdAt, updatedAt, ...rest } = interview;
            const updatedInterview = {
                ...rest,
                sharedIds: [...sharedIds, new mongoose.Types.ObjectId(userId)]
            };

            return this.model.update(interviewId, updatedInterview as any, sess);
        }
        return interview;
    }


    async unshareInterview(interviewId: string, userId: string, sessionObj: Session) {
        if (!sessionObj.userId || !sessionObj.orgId) {
            throw new Error('Invalid session: userId and orgId are required');
        }
        const sess: { userId: string; orgId: string } = {
            userId: sessionObj.userId,
            orgId: sessionObj.orgId,
        };

        const interview = await this.getInterviewById(interviewId);

        const sharedIds = interview.sharedIds || [];
        // Prevent duplicate sharing
        const filteredSharedIds = sharedIds.filter((id: mongoose.Types.ObjectId) => id.toString() !== userId)
        const { _id, createdAt, updatedAt, ...rest } = interview;
        const updatedInterview = {
            ...rest,
            sharedIds: filteredSharedIds
        };

        return this.model.model.updateOne({ id: interviewId,isActive:true }, updatedInterview as any);
    }

    async getStats(session: Session): Promise<GetStatsResult> {
        const { start: todayStart, end: todayEnd } = getTodayRange(this.timezone);

        const interviewFilter = {
            isActive: true,
            createdBy: new mongoose.Types.ObjectId(session.userId),
        };

        // total interviews
        const createdTotalResult = await this.model.model.aggregate([
            { $match: interviewFilter },
            { $group: { _id: '$id' } },
            { $count: 'total' },
        ]);
        const createdTotal = createdTotalResult[0]?.total || 0;

        // created today
        const createdTodayResult = await this.model.model.aggregate([
            { $match: { ...interviewFilter, createdAt: { $gte: todayStart, $lt: todayEnd } } },
            { $sort: { id: 1, createdAt: 1 } },
            { $group: { _id: '$id', firstCreated: { $first: '$createdAt' } } },
            { $match: { firstCreated: { $gte: todayStart, $lt: todayEnd } } },
            { $count: 'total' },
        ]);
        const createdToday = createdTodayResult[0]?.total || 0;

        const accessibleInterviews = await this.model.find(interviewFilter, { id: 1 });
        const interviewIds = accessibleInterviews.map((i: any) => i.id);
        if (interviewIds.length === 0) {
            return {
                interviews: { created: { today: 0, overall: 0 } },
                interviewSessions: {
                    scheduled: 0,
                    upcoming: 0,
                    concluded: { today: 0, overall: 0 },
                    recent: [],
                },
            };
        }

        const scheduledToday = await candidateModel.countDocuments({
            interviewId: { $in: interviewIds },
            startTime: { $gte: todayStart, $lt: todayEnd },
        });

        const concludedToday = await candidateModel.countDocuments({
            interviewId: { $in: interviewIds },
            completedAt: { $gte: todayStart, $lt: todayEnd },
        });

        const concludedOverall = await candidateModel.countDocuments({
            interviewId: { $in: interviewIds },
            completedAt: { $exists: true, $ne: null },
        });

        const upcoming = await candidateModel.countDocuments({
            interviewId: { $in: interviewIds },
            startTime: { $gt: todayEnd },
        });

        const recentSessions = await candidateModel.find(
            { interviewId: { $in: interviewIds }, isActive: true },
            { interviewId: 1, userId: 1, startTime: 1, createdAt: 1, completedAt: 1, score: 1 }
        )
            .populate({ path: 'interview', select: '_id id title duration' })
            .populate({ path: 'user', select: '_id name email' })
            .sort({ completedAt: -1 })
            .limit(10) as unknown as RecentSession[];

        return {
            interviews: {
                created: { today: createdToday, overall: createdTotal },
            },
            interviewSessions: {
                concluded: { today: concludedToday, overall: concludedOverall },
                scheduled: scheduledToday,
                upcoming,
                recent: recentSessions,
            },
        };
    }
    async getSessionsOfDay(session: Session, date: Date) {
        const interviewFilter = {
            isActive: true,
            createdBy: new mongoose.Types.ObjectId(session.userId),
        };

        const startDate = date;
        const endDate = startDate;
        endDate.setHours(23, 59, 59, 999);

        const accessibleInterviews = await this.model.find(interviewFilter, { id: 1 });
        const interviewIds = accessibleInterviews.map((i: any) => i.id);
        const sessions = await candidateModel
            .find(
                {
                    interviewId: { $in: interviewIds },
                    isActive: true,
                    completedAt: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                },
                {
                    interviewId: 1,
                    userId: 1,
                    startTime: 1,
                    createdAt: 1,
                    completedAt: 1,
                    score: 1,
                }
            )
            .populate({
                path: "interview",
                select: "_id id title duration",
            })
            .populate({
                path: "user",
                select: "_id name email",
            })
            .sort({ completedAt: -1 });
        return sessions;
    }
}


export default InterviewService;