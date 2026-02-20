import { Router, Request, Response, NextFunction } from 'express';
import middleware from '@app/v1/middleware';
import constants from '@root/constants';
import { logger } from '@libs/logger';
import { checkForSharedAccess, checkPermissionForContentModification } from '@app/v1/libs/checkPermission';
import { interviewCreationSchema } from '@app/v1/zod/interview';

import type { InterviewService } from "../domain/interview.service"
import { authService } from '../../auth';

type Services = {
    interviewServices: InterviewService,
}

export function createInterviewRoutes({ interviewServices }: Services) {
    const router = Router();

    router.get('/stats', middleware.authMiddleware.checkIfLogin, async (req: Request & { session?: Session }, res: Response) => {
        try {
            const stats = await interviewServices.getStats(req.session);
            return res.status(200).json(stats);
        } catch (error: any) {
            logger.error({ endpoint: req.originalUrl, error: error?.message ?? error });
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    });



    router.get('/', middleware.authMiddleware.checkIfLogin, async (req: Request & { session?: Session }, res: Response, next: NextFunction) => {
        try {
            const page = parseInt((req.query as any).page) || 1;
            const limit = parseInt((req.query as any).limit) || 10;
            const searchQuery = (req.query as any).searchQuery || undefined;
            const sortBy = (req.query as any).sortBy || undefined;
            const sortOrder = (req.query as any).sortOrder || undefined;
            const type = (req.query as any).type || undefined;

            if (page < 1 || limit < 1 || limit > 100) {
                return res.status(400).json({
                    error: 'Invalid pagination parameters',
                    details: 'Page must be >= 1, limit must be between 1 and 100',
                });
            }

            const result = await interviewServices.listInterviewPaginated({ page, limit, searchQuery, sortBy, sortOrder }, req.session, type);
            return res.status(200).json(result);
        } catch (error: any) {
            logger.error({ endpoint: 'interview GET /', error: error?.message, trace: error?.stack });
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    });


    router.post('/', middleware.authMiddleware.checkIfLogin, async (req: Request & { session?: Session }, res: Response, next: NextFunction) => {
        try {
            if ((req.session as any)?.role === constants.roleNumberFromString.user) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            if ('difficulty' in req.body) {
                req.body.difficulty = Object.entries(req.body.difficulty).map(([key, value]) => ({ skill: key, ...(value && typeof value === 'object' ? (value as Record<string, unknown>) : {}) }));
            }

            const data = await interviewCreationSchema.safeParseAsync(req.body);
            if (!data.success) {
                return res.status(400).json({ error: 'Invalid payload', details: { error: data.error } });
            }

            const interview = await interviewServices.createInterview(req.body, req.session);
            return res.status(200).json({ id: interview.id });
        } catch (error: any) {
            logger.error({ endpoint: 'interview POST /', error: error?.toString(), trace: error?.stack, data: req.body });
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    router.get('/:id', middleware.authMiddleware.checkIfLogin, async (req: Request & { session?: Session }, res: Response) => {
        const { id } = req.params;
        try {
            const interviewObj = await interviewServices.getInterviewById(id);
            if (!interviewObj) {
                return res.status(404).json({ error: 'Interview not found' });
            }
            const sharedAccess = checkForSharedAccess(interviewObj, req.session)
            if (!sharedAccess && checkPermissionForContentModification(interviewObj, req.session)) {
                return res.status(403).json({ error: 'Not authorized' });
            }
            //get the users details which have access to this interview
            const users = await interviewServices.getUsersWithAccess(interviewObj.id);

            return res.json({ ...interviewObj, users });
        } catch (error: any) {
            logger.error({ endpoint: `interview GET /${id}`, error, data: req.body });
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    router.post("/:id/share", middleware.authMiddleware.checkIfLogin, async (req: Request & { session?: Session }, res: Response) => {
        const { id } = req.params;
        try {
            const interviewObj = await interviewServices.getInterviewById(id);
            if (!interviewObj) {
                return res.status(404).json({ error: 'Interview not found' });
            }

            if (checkPermissionForContentModification(interviewObj, req.session)) {
                return res.status(403).json({ error: 'Not authorized' });
            }
            if (!req.body.email) {
                return res.status(400).json({ error: 'Email is required' });
            }

            const users = await authService.find({ email: req.body.email }, { id: 1 });
            if (!users || users.length === 0) {
                return res.status(409).json({ error: 'User not found' });
            }
            const userId = users[0].id;

            if (String(userId) === (req.session as any).userId) {
                return res.status(400).json({ error: 'Cannot share with yourself' });
            }
            if(interviewObj.sharedIds){
                if (interviewObj.sharedIds.map(ele => String(ele)).includes(String(userId))) {
                    return res.status(400).json({ error: 'Already shared with this user' });
                }
            }


            const newInterviewObj = await interviewServices.shareInterview(id, userId, req.session);
            return res.status(200).json({ id: newInterviewObj.id });
        } catch (error: any) {
            console.log(error?.message);
            logger.error({ endpoint: `interview POST /${id}/share`, error, data: req.body });
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    })


    router.delete("/:id/share/:sharedId", middleware.authMiddleware.checkIfLogin, async (req: Request & { session?: Session }, res: Response) => {
        const { id, sharedId } = req.params;
        try {
            const interviewObj = await interviewServices.getInterviewById(id);
            if (!interviewObj) {
                return res.status(404).json({ error: 'Interview not found' })
            }
            if (checkPermissionForContentModification(interviewObj, req.session)) {
                return res.status(403).json({ error: 'Not authorized' })
            }
            const newInterviewObj = await interviewServices.unshareInterview(id, sharedId, req.session);
            return res.status(200).json({ id: newInterviewObj.id });
        } catch (error: any) {
            logger.error({ endpoint: `interview DELETE /${id}/share`, error, data: req.body });
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    })

    router.patch('/:id', middleware.authMiddleware.checkIfLogin, async (req: Request & { session?: Session }, res: Response) => {
        const { id } = req.params;
        try {
            if ('difficulty' in req.body) {
                req.body.difficulty = Object.entries(req.body.difficulty).map(([key, value]) => ({ skill: key, ...(value && typeof value === 'object' ? (value as Record<string, unknown>) : {}) }));
            }

            const data = await interviewCreationSchema.safeParseAsync(req.body, req.body);
            if (!data.success) {
                return res.status(400).json({ error: 'Payload is not valid', details: data.error });
            }

            const interviewObj = await interviewServices.getInterviewById(id);
            if (!interviewObj) {
                return res.status(404).json({ error: 'Interview not found' });
            }

            if (checkPermissionForContentModification(interviewObj, req.session)) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const newInterviewObj = await interviewServices.updateInterview(id, data.data, req.session);
            return res.status(200).json({ id: newInterviewObj.id });
        } catch (error: any) {
            logger.error({ endpoint: `interview PATCH /${id}`, error, data: req.body });
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    router.get('/clone/:id', async (req: Request & { session?: Session }, res: Response) => {
        const { id } = req.params;
        try {
            const interviewObj = await interviewServices.getInterviewById(id);
            if (!interviewObj) {
                return res.status(404).json({ error: 'Interview Not Found' });
            }
            if (checkPermissionForContentModification(interviewObj, req.session)) {
                return res.status(403).json({ error: 'Not Authorized' });
            }

            const objToSave = { ...interviewObj } as any;
            delete objToSave.id;
            delete objToSave._id;
            delete objToSave.createdBy;
            delete objToSave.orgId;
            delete objToSave.createdAt;

            objToSave.title = `${interviewObj.title}-clone-${Date.now()}`;
            const clone = await interviewServices.createInterview(objToSave, req.session);
            return res.json({ id: clone.id });
        } catch (error: any) {
            logger.error({ endpoint: `clone /${id}`, error });
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    });
    router.get("/recent-sessions/date", async (req: Request & { session?: Session }, res: Response) => {
        try {
            const { date } = req.query;

            if (!date || typeof date !== "string") {
                return res.status(400).json({
                    error: "Please provide ?date=YYYY-MM-DD",
                });
            }

            const startDate = new Date(date);
            if (isNaN(startDate.getTime())) {
                return res.status(400).json({ error: "Invalid date format" });
            }

            const sessions = await interviewServices.getSessionsOfDay(req.session, startDate)

            return res.status(200).json({
                date: startDate,
                count: sessions.length,
                data: sessions,
            });
        } catch (err) {
            console.error("Error fetching sessions by date:", err);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    return router;
}

export default createInterviewRoutes;
