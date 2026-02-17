
import { Router, Request, Response } from 'express';


import { logger } from '@libs/logger';

import middleware from "@app/v1/middleware";
import { checkForSharedAccess, checkPermissionForContentModification } from "@app/v1/libs/checkPermission";


import { candidateCreateSchema, candidateUpdateSchema } from '@app/v1/zod/candidate';
import { sendInvite } from '@services/mailer';
import redis from '@services/redis';
import InterviewAiModel from '@app/v1/agents/InterviewAgentGraph';
import { userMessage } from '@app/v1/zod/interview';
import { MessageTypeEnum } from '@root/constants/message';
import { InviteStatusEnum } from '@root/constants/candidate';
import { addInviteJob } from '@services/queue';


import type InterviewService from "../../interview/domain/interview.service";
import type CandidateService from "../domain/candidate.service";
import type UserService from "../../user/domain/user.service";
import type CandidateResponseService from "../../candidate-responses/domain/candidate-response.service";
import { getPresignedUploadUrl } from '@root/services/s3';
import { formatDateTime } from '@root/libs/DateUtils';
import mongoose from 'mongoose';

interface createCandidateRoutesProps {
    candidateResponseService: CandidateResponseService,
    interviewServices: InterviewService,
    candidateServices: CandidateService,
    userServices: UserService,
    externalService: null,
}

export function createCandidateRoutes({ interviewServices, candidateServices, userServices, externalService, candidateResponseService }: createCandidateRoutesProps) {
    const router = Router();

    router.get("/getPresignedUrl", async (req: Request, res: Response) => {
        try {
            const contentType = req.query.contentType as string;

            if (!contentType) return res.status(400).json({ error: 'Content type is required' });

            const { uploadUrl, fileUrl, key } = await getPresignedUploadUrl(contentType);

            return res.json({ uploadUrl, fileUrl, key });
        } catch (error: any) {
            logger.error({ endpoint: `candidate GET /getPresignedUrl`, error: error?.message, trace: error?.stack });
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    })

    router.get('/metrics', middleware.authMiddleware.checkIfLogin, async (req: Request & { session?: Session }, res: Response) => {
        try {
            const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
            const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

            if (startDate && isNaN(startDate.getTime())) {
                return res.status(400).json({ error: 'Invalid startDate format' });
            }
            if (endDate && isNaN(endDate.getTime())) {
                return res.status(400).json({ error: 'Invalid endDate format' });
            }
            if (startDate && endDate && startDate > endDate) {
                return res.status(400).json({ error: 'startDate must be before or equal to endDate' });
            }

            const accessibleInterviews = await interviewServices.listInterview(req.session);
            const interviewIds = accessibleInterviews.map(interview => interview.id);

            const metricsData = await candidateServices.getMetrics({ startDate, endDate }, interviewIds);

            return res.json(metricsData);
        } catch (error) {
            logger.error({
                endpoint: req.originalUrl,
                error: error instanceof Error ? error.message : error,
            });
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    router.get('/metrics/date-details', middleware.authMiddleware.checkIfLogin, async (req: Request & { session?: Session }, res: Response) => {
        try {
            const date = req.query.date ? new Date(req.query.date as string) : null;
            const type = (req.query.type as 'date') || 'date';

            if (!date || isNaN(date.getTime())) {
                return res.status(400).json({ error: 'Invalid or missing date parameter' });
            }

            // Get accessible interviews for the current user
            const accessibleInterviews = await interviewServices.listInterview(req.session);
            const interviewIds = accessibleInterviews.map(interview => interview.id);

            const interviews = await candidateServices.getInterviewsByDate(date, type, interviewIds);

            return res.json(interviews);
        } catch (error) {
            logger.error({
                endpoint: req.originalUrl,
                error: error instanceof Error ? error.message : error,
            });
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    router.get('/:id', middleware.authMiddleware.checkIfLogin, async (req: Request & { session?: Session }, res: Response) => {
        const id = req.params.id as string;
        try {
            // Extract pagination params from query
            const page = parseInt((req.query as any).page) || 1;
            const limit = parseInt((req.query as any).limit) || 10;
            const sortBy = (req.query as any).sortBy || undefined;
            const sortOrder = (req.query as any).sortOrder || undefined;

            if (page < 1 || limit < 1 || limit > 100) {
                return res.status(400).json({
                    error: 'Invalid pagination parameters',
                    details: 'Page must be >= 1, limit must be between 1 and 100',
                });
            }

            const interviewObj = await interviewServices.getInterviewById(id);
            if (!interviewObj) {
                return res.status(404).json({ error: 'Interview Not Found' });
            }

            let sharedAccess = checkForSharedAccess(interviewObj, req.session);
            if (!sharedAccess && checkPermissionForContentModification(interviewObj, req.session)) {
                return res.status(403).json({ error: 'Not Authorized' });
            }

            const result = await candidateServices.listInterviewCandidatePaginated(id, { page, limit, sortBy, sortOrder });
            const list = result.data;
            return res.json({
                data: list,
                pagination: result.pagination,
                meta: {
                    sharedAccess
                }
            });
        } catch (error: any) {
            logger.error({ endpoint: `candidate GET /${id}`, error: error?.message, trace: error?.stack });
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

    router.post('/:id', middleware.authMiddleware.checkIfLogin, async (req: Request & { session?: Session }, res: Response) => {
        const id = req.params.id as string;
        try {
            const payload = await candidateCreateSchema.safeParseAsync(req.body);
            if (!payload.success) {
                return res.status(400).json({ error: 'Invalid payload', details: payload.error });
            }
            //check that this interview exists and user has access to it

            const interviewObj = await interviewServices.getInterviewById(id);
            if (!interviewObj) {
                return res.status(404).json({ error: 'Interview Not Found' });
            }

            if (checkPermissionForContentModification(interviewObj, req.session)) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const data = payload.data as any;
            const userObj = await userServices.createOrFindUser({ email: data.email, name: data.name, phone: data.phone });
            if (!userObj) {
                throw new Error("Something went wrong");
            }
            data.externalUser = false;
            data.userId = userObj.id;


            //check that this user doesn't already have an active candidate interview for this interview
            const existingCandidate = await candidateServices.getInterviewCandidate(id, userObj.id);

            if (existingCandidate) {
                return res.status(409).json({ error: 'Candidate is already invited for this Interview', errCode: "CANDIDATE_ALREADY_INVITED" });
            }


            // Transform { url, originalName }[] to object[] for model creation
            data.attachments = data?.attachments?.map((att: { url: string, originalName: string }) => ({ url: att.url, originalName: att.originalName, content: '' }));

            const candidateObj = await candidateServices.createCandidateInterview(interviewObj, data);

            // await sendInvite({
            //     id: candidateObj.id, name: userObj.name, email: userObj.email, duration: interviewObj.duration, startDate: candidateObj.startTime, endDate: candidateObj.endTime,
            // });

            await addInviteJob({
                candidateId: candidateObj.id,
                attachments: data.attachments, // Pass simple URLs to worker
                inviteData: {
                    id: candidateObj.id,
                    name: userObj.name,
                    email: userObj.email,
                    duration: interviewObj.duration,
                    startTime: candidateObj.startTime,
                    endTime: candidateObj.endTime,
                }
            });

            return res.status(200).json({ id: candidateObj.id, status: 'processing' });
        } catch (error: any) {
            logger.error({ endpoint: `candidate POST /${id}`, error: error?.message, trace: error?.stack });
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    router.get('/interview-meta/:id', async (req: Request, res: Response) => {
        const id = req.params.id as string;
        try {
            if (!id || !mongoose.Types.ObjectId.isValid(id)) {
                return res.status(404).json({ error: 'Interview attempt link not found' });
            }
            const candidateObj = await candidateServices.findById(id);
            if (!candidateObj) {
                return res.status(404).json({ error: 'Interview attempt link not found' });
            }
            const userObj = await userServices.getUserById(candidateObj.userId);
            if (!userObj) {
                throw new Error("User not found");
            }

            const serverTime = Date.now();
            const isInitialized=candidateObj.actualStartTime!==null;

            // // Check basic constraints similar to main endpoint but don't start anything
            // if (candidateObj.inviteStatus !== InviteStatusEnum.SENT) {
            //     return res.json({
            //         inviteStatus: candidateObj.inviteStatus,
            //         completedAt: candidateObj.completedAt,
            //         startTime: candidateObj.startTime,
            //         endTime: candidateObj.endTime,
            //         candidate: { email: userObj.email },
            //         currentTime: serverTime
            //     });
            // }
            // if (candidateObj.startTime.getTime() > serverTime) {
            //     return res.json({
            //         inviteStatus: candidateObj.inviteStatus,
            //         completedAt: candidateObj.completedAt,
            //         startTime: candidateObj.startTime,
            //         endTime: candidateObj.endTime,
            //         candidate: { email: userObj.email },
            //         currentTime: serverTime
            //     });
            // }

            // Return minimal data needed for verification
            return res.json({
                inviteStatus: candidateObj.inviteStatus,
                completedAt: candidateObj.completedAt,
                startTime: candidateObj.startTime,
                endTime: candidateObj.endTime,
                candidate: { email: userObj.email },
                currentTime: serverTime,
                isInitialized:isInitialized
            });
        } catch (error: any) {
            logger.error({ endpoint: `candidate/interview-meta GET /${id}`, error: error?.message, trace: error?.stack });
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    router.get('/interview/:id', async (req: Request & { session?: Session }, res: Response) => {
        const id = req.params.id as string;
        try {
            const candidateObj = await candidateServices.findById(id);
            if (!candidateObj) {
                return res.status(404).json({ error: 'Interview attempt link not found' });
            }
            const userObj = await userServices.getUserById(candidateObj.userId);
            if (!userObj) {
                throw new Error("User not found");
            }

            let idleWarningTime = process.env.IDLE_WARNING_TIME || 300;
            let idleSubmitTime = process.env.IDLE_SUBMIT_TIME || 600;

            if (candidateObj.inviteStatus !== InviteStatusEnum.SENT) {
                return res.json({
                    idleWarningTime,
                    idleSubmitTime,
                    inviteStatus: candidateObj.inviteStatus,
                    completedAt: candidateObj.completedAt, messages: [], candidate: { user: userObj, startTime: candidateObj.startTime }
                });
            }
            if (candidateObj.startTime.getTime() > Date.now()) {
                return res.json({
                    idleWarningTime,
                    idleSubmitTime,
                    inviteStatus: candidateObj.inviteStatus,
                    completedAt: candidateObj.completedAt, messages: [], candidate: { user: userObj, startTime: candidateObj.startTime }
                });
            }

            const interviewObj = await interviewServices.getInterviewById(candidateObj.interviewId, candidateObj.versionId);

            // if (checkPermissionForContentModification(interviewObj, req.session)) {
            //     return res.status(403).json({ error: 'Not authorized' });
            // }

            const agent = await InterviewAiModel.create({
                interview: interviewObj,
                candidate: candidateObj,
                modelToUse: "gemini-2.5-flash-lite",
                user: userObj,
                config: {
                    temperature: 0.7,
                    thinkingConfig: {
                        includeThoughts: true,
                        thinkingBudget: 2048,
                    },
                },
            })
            if (!candidateObj.actualStartTime) {
                await candidateServices.updateOne({ id }, { actualStartTime: new Date() });
            }
            let history = await agent.getHistory();
            if (!history.length) {
                if (candidateObj.endTime && candidateObj.endTime.getTime() < Date.now()) {
                    return res.status(409).json({ error: 'Interview has ended.' });
                }
                await agent.sendMessage("Lets start the interview");
                history = await agent.getHistory();
            }
            if (history[history.length - 1].role === 'human') {
                await agent.sendMessage();
                history = await agent.getHistory();
            }
            if (history[history.length - 1].role === "ai" && !history[history.length - 1].parsedResponse.confidence) {
                await agent.recreateLastMessage();
            }
            return res.json({
                idleWarningTime,
                idleSubmitTime,
                inviteStatus: candidateObj.inviteStatus,
                completedAt: candidateObj.completedAt, messages: history, candidate: { user: userObj, startTime: candidateObj.startTime }
            });
        } catch (error: any) {
            logger.error({ endpoint: `candidate/interview GET /${id}`, error: error?.message, trace: error?.stack });
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    router.post('/messages/:id', async (req: Request, res: Response) => {
        const id = req.params.id as string;
        try {
            const zodResponse = userMessage.safeParse(req.body);
            if (!zodResponse.success) {
                return res.status(400).json({ message: 'Bad request', details: zodResponse.error });
            }
            const candidateObj = await candidateServices.findById(id);
            if (!candidateObj) {
                return res.status(404).json({ error: 'Interview not found' });
            }
            if (candidateObj.completedAt) {
                return res.status(409).json({ error: 'Interview is already completed' });
            }
            const payload = zodResponse.data;
            logger.info(`User responded with: ${payload.userInput}`);
            const interviewObj = await interviewServices.getInterviewById(candidateObj.interviewId, candidateObj.versionId);

            const userObj = await userServices.getUserById(candidateObj.userId);
            if (!userObj) {
                throw new Error("User not found");
            }
            const agent = await InterviewAiModel.create({
                interview: interviewObj,
                candidate: candidateObj,
                modelToUse: "gemini-2.5-flash-lite",
                user: userObj,
                config: {
                    temperature: 0.7,
                    thinkingConfig: {
                        includeThoughts: true,
                        thinkingBudget: 2048,
                    },
                },
            });
            let history = await agent.getHistory();
            if (!history.length) {
                throw new Error("Invalid request");
            }
            if (history[history.length - 1].role === 'human') {
                await agent.sendMessage();
                history = await agent.getHistory();
            }
            if (history[history.length - 1].role === "ai" && !history[history.length - 1].parsedResponse.confidence) {
                await agent.recreateLastMessage();
                history = await agent.getHistory();
            }
            const response = await agent.sendMessage(payload.userInput, payload.audioUrl, payload.type as MessageTypeEnum, payload.audioDuration);
            if (response?.latestAiResponse?.structuredResponse?.isInterviewGoingOn === false) {
                await candidateServices.saveToSubmissionQueue(id);
                await candidateServices.updateOne({
                    id: id,
                }, {
                    $set: {
                        completedAt: new Date(),
                    }
                })
            }
            history = await agent.getHistory();
            return res.json(history);
        } catch (error: any) {
            logger.error(error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

    router.patch('/revaluate/:id', middleware.authMiddleware.checkIfLogin, async (req: Request & { session?: Session }, res: Response) => {
        const id = req.params.id as string;
        const { prompt } = req.body;
        try {
            const candidateObj = await candidateServices.findById(id);
            if (!candidateObj) return res.status(404).json({ error: 'Interview Attempt Not Found' });
            if (!candidateObj.completedAt) return res.status(409).json({ error: 'Interview is not completed yet.' });
            const interviewObj = await interviewServices.getInterviewById(candidateObj.interviewId);
            if (!interviewObj) return res.status(404).json({ error: 'Interview Not Found' });
            if (checkPermissionForContentModification(interviewObj, req.session)) return res.status(401).json({ error: 'Not Authorized' });
            await candidateResponseService.populateAttemptFromDBToRedis(id);
            await candidateServices.saveToSubmissionQueue(id);
            await candidateServices.updateOne({
                id: id,
            }, {
                $set: {
                    revaluationStartDate: new Date(),
                    revaluationPrompt: prompt,
                },
            });
            return res.status(200).json({ id: candidateObj.id });
        } catch (error: any) {
            logger.error(error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

    router.patch('/conclude-interviews/:interviewId', middleware.authMiddleware.checkIfLogin, async (req: Request, res: Response) => {
        try {
            const attemptIds = (req.body as any).attemptIds;
            const findObj: any = {
                interviewId: req.params.interviewId as string,
                $or: [{ completedAt: { $exists: false } }, { completedAt: null }],
            };
            if (attemptIds?.length) findObj.id = attemptIds;

            const candidatesWhoseInterviewIsNotConcluded = await candidateServices.find(findObj, { id: 1 }, {});
            await candidateServices.concludeCandidateInterview(candidatesWhoseInterviewIsNotConcluded.map((ele: any) => ele.id.toString()));
            return res.json({ id: candidatesWhoseInterviewIsNotConcluded.map((ele: any) => ele.id.toString()) });
        } catch (error: any) {
            logger.error({ endpoint: 'conclude-interview GET /', error: error?.message, trace: error?.stack });
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    });
    router.patch('/conclude-interview/:attemptId', middleware.authMiddleware.checkIfLogin, async (req: Request, res: Response) => {
        try {
            const attemptId = req.params.attemptId as string;
            await candidateServices.concludeCandidateInterview([attemptId]);
            return res.json({ id: attemptId });
        } catch (error: any) {
            logger.error({ endpoint: 'conclude-interview GET /', error: error?.message, trace: error?.stack });
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    });
    router.patch('/conclude-interviews/:interviewId', middleware.authMiddleware.checkIfLogin, async (req: Request, res: Response) => {
        try {
            const attemptIds = (req.body as any).attemptIds;
            const findObj: any = {
                interviewId: req.params.interviewId as string,
                $or: [{ completedAt: { $exists: false } }, { completedAt: null }],
            };
            if (attemptIds?.length) findObj.id = attemptIds;

            const candidatesWhoseInterviewIsNotConcluded = await candidateServices.find(findObj, { id: 1 }, {});
            await candidateServices.concludeCandidateInterview(candidatesWhoseInterviewIsNotConcluded.map((ele: any) => ele.id.toString()));
            return res.json({ id: candidatesWhoseInterviewIsNotConcluded.map((ele: any) => ele.id.toString()) });
        } catch (error: any) {
            logger.error({ endpoint: 'conclude-interview GET /', error: error?.message, trace: error?.stack });
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    router.get('/:interviewId/:id', middleware.authMiddleware.checkIfLogin, async (req: Request & { session?: Session }, res: Response) => {
        const interviewId = req.params.interviewId as string;
        const id = req.params.id as string;
        try {
            const interviewObj = await interviewServices.getInterviewById(interviewId);
            if (!interviewObj) return res.status(404).json({ error: 'Interview not found' });
            let sharedAccess=checkForSharedAccess(interviewObj, (req as any).session)
            if (!sharedAccess && checkPermissionForContentModification(interviewObj, (req as any).session)) return res.status(403).json({ error: 'Not Authorized' });
            const attempt = await candidateServices.findById(id);
            if (!attempt) return res.status(404).json({ error: 'Candidate attempt not found' });

            delete (attempt as any).interviewId;
            (attempt as any).interview = { _id: interviewObj._id, title: interviewObj.title, duration: interviewObj.duration };

            const userObj = await userServices.getUserById((attempt as any).userId);
            if (!userObj) {
                throw new Error("Something went wrong, User not found");
            }
            (attempt as any).email = userObj.email;
            (attempt as any).name = userObj.name;
            (attempt as any).phone = userObj.phone;

            return res.json(attempt);
        } catch (error: any) {
            console.log(error);
            logger.error({ endpoint: `/interviewAttempt interviewId: ${interviewId} id: ${id}`, trace: error?.stack, error: error?.message });
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

    router.patch('/:interviewId/:id', middleware.authMiddleware.checkIfLogin, async (req: Request & { session?: Session }, res: Response) => {
        const interviewId = req.params.interviewId as string;
        const id = req.params.id as string;
        try {
            logger.info(`PATCH request body: ${JSON.stringify(req.body)}`);
            const payload = await candidateUpdateSchema.safeParseAsync(req.body);
            if (!payload.success) {
                logger.error(`Validation failed: ${payload.error}`);
                return res.status(400).json({ error: 'Invalid payload', details: payload.error });
            }

            logger.info(`Validated payload: ${JSON.stringify(payload.data)}`);
            logger.info(`name: ${payload.data.name}, phone: ${payload.data.phone}, yearOfExperience: ${payload.data.yearOfExperience}`);

            const interviewObj = await interviewServices.getInterviewById(interviewId);
            if (!interviewObj) return res.status(404).json({ error: 'Interview not found' });
            if (checkPermissionForContentModification(interviewObj, (req as any).session)) return res.status(403).json({ error: 'Not authorized' });

            const candidateObj = await candidateServices.findById(id);
            if (!candidateObj) return res.status(404).json({ error: 'Candidate attempt not found' });
            if (candidateObj.interviewId.toString() !== interviewId) return res.status(400).json({ error: 'Candidate does not belong to this interview' });

            // Update user fields
            if (payload.data.name !== undefined || payload.data.phone !== undefined) {
                if (candidateObj.externalUser) {
                    logger.warn(`Attempted to update external user ${candidateObj.userId} - not implemented`);
                } else {
                    const userUpdateData: any = {};
                    if (payload.data.name !== undefined) userUpdateData.name = payload.data.name;
                    if (payload.data.phone !== undefined) userUpdateData.phone = payload.data.phone;

                    const existingUser = await userServices.getUserById(candidateObj.userId);
                    const updatedUser = await userServices.updateUserById(candidateObj.userId, { $set: userUpdateData });
                    logger.info(`User update result: ${updatedUser}`);
                }
            }

            // Update candidate fields
            const candidateUpdateData: any = {};
            if (payload.data.startTime !== undefined) candidateUpdateData.startTime = typeof payload.data.startTime === 'string' ? new Date(payload.data.startTime) : payload.data.startTime;
            if (payload.data.endTime !== undefined) candidateUpdateData.endTime = typeof payload.data.endTime === 'string' ? new Date(payload.data.endTime) : payload.data.endTime;
            if (payload.data.yearOfExperience !== undefined) candidateUpdateData.yearOfExperience = payload.data.yearOfExperience;
            if (payload.data.userSpecificDescription !== undefined) candidateUpdateData.userSpecificDescription = payload.data.userSpecificDescription;

            let shouldProcessAttachments = false;
            if (payload.data.attachments) {
                const existingAttachmentsMap = new Map<string, any>((candidateObj.attachments || []).map((att: any) => [att.url, att]));
                const mergedAttachments = payload.data.attachments.map((att: { url: string, originalName: string }) => {
                    const existing = existingAttachmentsMap.get(att.url);
                    return {
                        url: att.url,
                        originalName: att.originalName,
                        content: existing ? existing.content : ''
                    };
                });
                candidateUpdateData.attachments = mergedAttachments;

                if (mergedAttachments.some(att => !existingAttachmentsMap.has(att.url))) {
                    candidateUpdateData.inviteStatus = 'pending';
                    shouldProcessAttachments = true;
                }
            }

            logger.info(`Updating candidate ${id} with data: ${JSON.stringify(candidateUpdateData)}`);
            if (Object.keys(candidateUpdateData).length > 0) {
                const updateResult = await candidateServices.updateOne({ id }, { $set: candidateUpdateData });
                logger.info(`Candidate update result: ${updateResult}`);
            }

            const userObj = await userServices.getUserById(candidateObj.userId);
            if (!userObj) return res.status(404).json({ error: 'User not found' });

            if (shouldProcessAttachments) {
                await addInviteJob({
                    candidateId: candidateObj.id,
                    attachments: candidateUpdateData.attachments,
                    inviteData: {
                        id: candidateObj.id,
                        name: userObj.name,
                        email: userObj.email,
                        duration: interviewObj.duration,
                        startTime: candidateUpdateData.startTime || candidateObj.startTime,
                        endTime: candidateUpdateData.endTime || candidateObj.endTime,
                    }
                });
            } else {
                await sendInvite({
                    id: candidateObj.id, name: userObj.name, email: userObj.email, duration: interviewObj.duration, startTime: formatDateTime(candidateUpdateData.startTime || candidateObj.startTime, "asia/kolkata") as string, endTime: formatDateTime(candidateUpdateData.endTime || candidateObj.endTime, "asia/kolkata"),
                    jobTitle: ""
                });
                logger.info(`Resent invitation email to ${userObj.email} for candidate ${candidateObj.id}`);
            }

            return res.status(200).json({ id: candidateObj.id, message: 'Candidate updated successfully' });
        } catch (error: any) {
            logger.error({ endpoint: `candidate PATCH /${interviewId}/${id}`, error: error?.message, trace: error?.stack });
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    return router;
}

export default createCandidateRoutes;
