import { Router, Request, Response, NextFunction } from 'express';
import middleware from '@app/v1/middleware';
import constants from '@root/constants';
import { logger } from '@libs/logger';
import { checkPermissionForContentModification } from '@app/v1/libs/checkPermission';
import { interviewCreationSchema } from '@app/v1/zod/interview';

import type { InterviewService } from "../domain/interview.service"

type Services = {
    interviewServices: InterviewService,
}

export function createInterviewRoutes({ interviewServices }: Services ) {
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

            if (page < 1 || limit < 1 || limit > 100) {
                return res.status(400).json({
                    error: 'Invalid pagination parameters',
                    details: 'Page must be >= 1, limit must be between 1 and 100',
                });
            }

            const result = await interviewServices.listInterviewPaginated({ page, limit }, req.session);
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

            if (!checkPermissionForContentModification(interviewObj, req.session)) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            return res.json(interviewObj);
        } catch (error: any) {
            logger.error({ endpoint: `interview GET /${id}`, error, data: req.body });
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    });

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

            if (!checkPermissionForContentModification(interviewObj, req.session)) {
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
            if (!checkPermissionForContentModification(interviewObj, req.session)) {
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

    return router;
}

export default createInterviewRoutes;
