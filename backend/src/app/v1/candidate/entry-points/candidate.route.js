const Zod = require('zod');
const middleware = require('@/middleware');
const redisConstant = require('@/constants/redis');
const { logger } = require('@libs');
const { checkPermissionForContentModification } = require('@/libs/utils');
const { candidateCreateSchema, createCandidateFromBackendSchema } = require('@/zod/candidate');
const { sendInvite } = require('@/libs/mailer');
const redis = require('@/libs/redis');
const InterviewAiModel = require('@/model/interviewModel');
const { userMessage } = require('@/zod/interview');
const dayjs = require('dayjs');

/**
 * @param {{ interviewServices: import('../../interview/domain/interview.service'), candidateServices: import('../domain/candidate.service'), userServices: import('../../user/domain/user.service'), externalService: import('../domain/external.service'), candidateResponseService: import('../../candidate-responses/domain/candidate-response.service') }}
 */
function createCandidateRoutes({ interviewServices, candidateServices, userServices, externalService, candidateResponseService }) {
    const router = require('express').Router();

    router.get("/metrics", middleware.authMiddleware.checkIfLogin, async (req, res) => {
        try {
            const daysLimit = parseInt(req.query.daysLimit ?? 1);
            const metrics = await candidateServices.getMetrics({ daysLimit });
            return res.json(metrics);
        } catch (error) {
            logger.error({
                endpoint: req.originalUrl,
                error: error?.message ?? error,
            });
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    router.get('/:id', middleware.authMiddleware.checkIfLogin, async (req, res, next) => {
        const { id } = req.params;
        try {
            const interviewObj = await interviewServices.getInterviewById(id);
            if (!interviewObj) {
                return res.status(404).json({
                    error: 'Interview Not Found'
                });
            }
            if (!checkPermissionForContentModification(interviewObj, req.session)) {
                return res.status(403).json({
                    error: 'Not Authorized',
                })
            }
            const list = await candidateServices.listInterviewCandidate(id);
            const usersToGet = new Set();
            const usersToGetFromExternalService = new Set();
            list.forEach((ele) => {
                if (ele.externalUser) {
                    return usersToGetFromExternalService.add(ele.userId);
                }
                return usersToGet.add(ele.userId);
            });
            const userMap = await userServices.getUserMap(Array.from(usersToGet), {name: 1, email: 1 });
            let userMapExternal = new Map();
            if (usersToGetFromExternalService.size) {
                userMapExternal = await externalService.getUsersInMap({_id: Array.from(usersToGetFromExternalService)}, { displayname: 1, email: 1});
            }
            list.forEach((ele) => {
                if (ele.externalUser) {
                    const userObj = userMapExternal.get(ele.userId.toString());
                    ele.name = userObj.displayname;
                    ele.email = userObj.email;
                    return;
                }
                const userObj = userMap.get(ele.userId.toString());
                ele.name = userObj.name;
                ele.email = userObj.email;
            });
            return res.json(list);
        } catch (error) {
            logger.error({
                endpoint: `candidate GET /${id}`,
                error: error?.message,
                trace: error?.stack,
            });
            return res.status(500).json({
                error: 'Internal server error',
            });
        }
    });

    router.post('/:id', middleware.authMiddleware.checkIfLogin, async (req, res) => {
        const { id } = req.params;
        try {
            const payload = await candidateCreateSchema.safeParseAsync(req.body);
            if (!payload.success) {
                return res.status(400).json({
                    error: 'Invalid payload',
                    details: payload.error,
                })
            };
            const interviewObj = await interviewServices.getInterviewById(id);
            if (!interviewObj) {
                return res.status(404).json({
                    error: 'Interview Not Found',
                });
            }

            if (!checkPermissionForContentModification(interviewObj, req.session)) {
                return res.status(403).json({
                    error: 'Not authorized',
                });
            }

            const data = payload.data;
            const userObj = await userServices.createOrFindUser({
                email: data.email,
                name: data.name,
                phone: data.phone,
            });
            data.externalUser = false;
            data.userId = userObj.id;
            const candidateObj = await candidateServices.createCandidateInterview(
                interviewObj, data
            );
            await sendInvite({ 
                id: candidateObj.id,
                name: userObj.name,
                email: userObj.email,
                duration: interviewObj.duration,
                startDate: candidateObj.startTime,
                endDate: candidateObj.endTime,
            });
            return res.status(200).json({
                id: candidateObj.id,
            });
        } catch (error) {
            logger.error({
                endpoint: `candidate POST /${id}`,
                error: error?.message,
                trace: error?.stack,
            });
            return res.status(500).json({
                error: 'Internal Server Error',
            })
        }
    });

    router.get('/interview/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const candidateObj = await candidateServices.findById(id);
            if (!candidateObj) {
                return res.status(404).json({
                    error: 'Interview attempt link not found',
                });
            }
            if (candidateObj.startTime.getTime() > Date.now()) {
                return res.status(409).json({
                    error: 'Interview has not started yet.',
                });
            }
            if (candidateObj.endTime && (candidateObj.endTime.getTime() < Date.now())) {
                return res.status(409).json({
                    error: 'Interview has ended.',
                });
            }
            const userObj = await userServices.getUserById(candidateObj.userId);
            const interviewObj = await interviewServices.getInterviewById(
                candidateObj.interviewId,
                candidateObj.versionId
            );
            const key = redisConstant.getChatHistory(candidateObj.id.toString());
            const chatHistory = [];
            let chatHistoryFromRedis = await redis.lrange(key, 0, -1);
            if (!chatHistoryFromRedis.length) {
                const result = await candidateResponseService.populateAttemptFromDBToRedis(id);
                if (result) {
                    chatHistoryFromRedis = await redis.lrange(key, 0, -1);
                    await redis.zadd(redisConstant.activeChatSet,
                        redisConstant.getScoreForChat(),
                        id,
                    );
                }

            }
            if (!chatHistoryFromRedis.length) {
                const aiModel = new InterviewAiModel('gemini-2.5-flash-lite', {
                    history: [],
                });
                const previouslyAskedQuestions = await candidateServices.previouslyAskedQuestions(interviewObj.id);
                const chat = InterviewAiModel.generateStartingMessageForInterview(
                    interviewObj,
                    candidateObj,
                    userObj,
                    previouslyAskedQuestions
                );
                logger.info({PromptUsed: chat});
                await aiModel.sendMessage(chat);
                const history = await aiModel.getHistory();
                await redis.del(key);
                await redis.lpush(key, ...history.map(ele => JSON.stringify(ele)).reverse());
                history.forEach((ele) => {
                    chatHistory.push(ele);
                });
            } else {
                chatHistoryFromRedis.forEach((ele) => {
                    chatHistory.push(JSON.parse(ele));
                })
            }
            const finalHistory = chatHistory.slice(1);
            return res.json({
                completedAt: candidateObj.completedAt,
                messages: finalHistory
            });
        } catch (error) {
            logger.error({
                endpoint: `candidate/interview GET /${id}`,
                error: error?.message,
                trace: error?.stack,
            });
            return res.status(500).json({
                error: 'Internal Server Error',
            })
        }
    });

    router.post('/messages/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const zodResponse = userMessage.safeParse(req.body);
            if (!zodResponse.success) {
                return res.status(400).json({
                    message: 'Bad request',
                    details: zodResponse.error,
                });
            }
            const candidateObj = await candidateServices.findById(id);
            if (!candidateObj) {
                return res.status(404).json({
                    error: 'Interview not found',
                });
            }
            if (candidateObj.completedAt) {
                return res.status(409).json({
                    error: 'Interview is already completed'
                })
            }
            const payload = zodResponse.data;
            logger.info(`User responded with: ${payload.userInput}`);
            const chatHistoryFromRedis = await redis.lrange(redisConstant.getChatHistory(id), 0, -1);
            if (!chatHistoryFromRedis.length) {
                throw new Error("Something went wrong");
            }

            const history = chatHistoryFromRedis.map(ele => JSON.parse(ele));
            const aiModel = new InterviewAiModel('gemini-2.5-flash-lite', {
                history: history,
                systemInstructions: 'You will be interviewing student on behalf of codequotient. Greet yourself accordingly.',
            });
            const response = await aiModel.sendMessage(payload.userInput, false, {
                isJSON: true,
            });
            const newHistory = await aiModel.getHistory();
            await redis.del(redisConstant.getChatHistory(id));
            await redis.lpush(redisConstant.getChatHistory(id), ...newHistory.map(ele => JSON.stringify(ele)).reverse());
            if ('text' in response.response) {
                const parsedResponse = InterviewAiModel.parseAiResponse(response.response.text());
                const schemaParser = Zod.object({
                    isInterviewGoingOn: Zod.boolean(),
                });
                const data = schemaParser.safeParse(parsedResponse);
                if (data.success) {
                    if (!data.data.isInterviewGoingOn) {
                        await candidateServices.saveToSubmissionQueue(id);
                    }
                }
            }
            await redis.zadd(redisConstant.activeChatSet,
                redisConstant.getScoreForChat(),
                id,
            );
            const finalHistory = newHistory.slice(1);
            return res.json(finalHistory);
        } catch (error) {
            logger.error(error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

    router.patch('/revaluate/:id', middleware.authMiddleware.checkIfLogin, async (req, res) => {
        const { id } = req.params;
        try {
            const candidateObj = await candidateServices.findById(id);
            if (!candidateObj) {
                return res.status(404).json({
                    error: 'Interview Attempt Not Found',
                });
            }
            if (!candidateObj.completedAt) {
                return res.status(409).json({
                    error: 'Interview is not completed yet.',
                });
            }
            const interviewObj = await interviewServices.getInterviewById(candidateObj.interviewId);
            if (!interviewObj) {
                return res.status(404).json({
                    error: 'Interview Not Found',
                });
            }
            if (!checkPermissionForContentModification(interviewObj, req.session)) {
                return res.status(401).json({
                    error: 'Not Authorized',
                });
            }
            await candidateResponseService.populateAttemptFromDBToRedis(id);
            await candidateServices.generateAndSaveUserReport(id, true);
            return res.status(200).json({
                id: candidateObj.id,
            });
        } catch (error) {
            logger.error(error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

    router.post('/createNewInterview/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const payload = await createCandidateFromBackendSchema.safeParseAsync(req.body);
            if (!payload.success) {
                return res.status(400).json({
                    error: 'Payload is not valid',
                });
            };
            const interviewObj = await interviewServices.getInterviewById(id);
            if (!interviewObj) {
                return res.status(404).json({
                    error: 'Interview is not valid.',
                });
            }
            const userData = {
                userId: payload.data.userId,
                startTime: payload.data.startTime,
                externalUserUniquenessKey: payload.data.externalUserUniquenessKey,
                yearOfExperience: payload.data.yearOfExperience,
                userSpecificDescription: payload.data.userSpecificDescription,
                externalUser: true,
            }
            const candidateObj = await candidateServices.createCandidateInterview(
                interviewObj,
                userData,
            )
            if (payload.data.sendEmail) {
                await sendInvite({ 
                    id: candidateObj.id,
                    name: userData.name,
                    email: userData.email,
                    duration: interviewObj.duration,
                    startDate: candidateObj.startTime,
                    endDate: candidateObj.endTime,
                });
            }
            return res.json({
                id: candidateObj.id
            });
        } catch (error) {
            logger.error({
                endpoint: `${req.path} ${req.method}`,
                error: error?.message ?? error,
                trace: error?.stack,
            });
            return res.status(500).json({
                error: 'Internal server error.',
            });
        }
    });

    router.patch('/conclude-interviews/:interviewId', async (req, res) => {
        try {
            const attemptIds = req.body.attemptIds;
            const findObj = {
                interviewId: req.params.interviewId,
                $or: [
                    {
                        completedAt: { $exists: false },
                    },
                    {
                        completedAt: null,
                    }
                ]
            }
            if (attemptIds?.length) {
                findObj.id = attemptIds;
            }
            const candidatesWhoseInterviewIsNotConcluded = await candidateServices.find(findObj, {id: 1}, {});
            await candidateServices.concludeCandidateInterview(candidatesWhoseInterviewIsNotConcluded.map(ele => ele.id.toString()));
            return res.json({
                id: candidatesWhoseInterviewIsNotConcluded.map(ele => ele.id.toString()),
            });
        } catch (error) {
            logger.error({
                endpoint: 'conclude-interview GET /',
                error: error?.message,
                trace: error?.stack,
            });
            return res.status(500).json({
                error: 'Internal Server Error',
            });
        }
    });

    router.get('/:interviewId/:id', async (req, res) => {
        const { interviewId, id } = req.params;
        try {
            const interviewObj = await interviewServices.getInterviewById(interviewId);
            if (!interviewObj) {
                return res.status(404).json({
                    error: 'Interview not found',
                });
            }
            if (!checkPermissionForContentModification(interviewObj, req.session)) {
                return res.status(403).json({
                    error: 'Not Authorized',
                });
            }
            const attempt = await candidateServices.findById(id);
            if (!attempt) {
                return res.status(404).json({
                    error: 'Candidate attempt not found',
                });
            }
            delete attempt.interviewId;
            attempt.interview = {
                _id: interviewObj._id,
                title: interviewObj.title
            };
            // const userMap = await userServices.getUserMap(Array.from(usersToGet), {name: 1, email: 1 });
            // const userMapExternal = await externalService.getUsersInMap({_id: Array.from(usersToGetFromExternalService)}, { displayname: 1, email: 1});
            if (attempt.externalUser) {
                const userObj = (await externalService.getUsers({ _id: attempt.userId.toString() }, { email: 1, displayname: 1 }, {}))?.[0] ?? { email: 'deletedUser', displayname: 'DELETED USER' };
                attempt.email = userObj.email;
                attempt.name = userObj.displayname;
            } else {
                const userObj = await userServices.getUserById(attempt.userId);
                attempt.email = userObj.email;
                attempt.name = userObj.name;
            }
            return res.json(attempt);
        } catch (error) {
            logger.error({
                endpoint: `/interviewAttempt interviewId: ${interviewId} id: ${id}`,
                trace: error?.stack,
                error: error?.message,
            });
            return res.status(500).json({
                error: 'Internal server error',
            });
        }
    });

    return router;
}

module.exports = {
    createCandidateRoutes,
};
