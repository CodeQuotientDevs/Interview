const router = require('express').Router();
const middleware = require('@/middleware');
const constants = require('@/constants');
const { logger } = require('@libs');
const { checkPermissionForContentModification } = require('@/libs/utils'); 
const { interviewCreationSchema } = require('@/zod/interview');

/**
 * 
 * @param {{ interviewServices:  import('../domain/interview.service') }} param0 
 */
function createInterviewRoutes ({ interviewServices }) {

    router.get('/stats', middleware.authMiddleware.checkIfLogin, async (req, res) => {
        try {
            const stats = await interviewServices.getStats(req.session);
            return res.status(200).json(stats);
        } catch (error) {
            logger.error({
                endpoint: req.originalUrl,
                error: error?.message ?? error,
            });
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    router.get('/', middleware.authMiddleware.checkIfLogin, async (req, res, next) => {
        try {
            const list = await interviewServices.listInterview(req.session);
            return res.status(200).json(list);
        } catch (error) {
            logger.error({
                endpoint: 'interview GET /',
                error: error?.message,
                trace: error?.stack,
            });
            return res.status(500).json('Internal Server Error');
        }
    });

    router.post('/', middleware.authMiddleware.checkIfLogin, async (req, res, next) => {
        try {
            if (req.session.role === constants.roleNumberFromString.user) {
                return res.status(403).json({
                    error: 'Not authorized',
                });
            }
            if ('difficulty' in req.body) {
                req.body.difficulty = Object.entries(req.body.difficulty).map(([key, value]) => {
                    return {
                        skill: key,
                        ...value,
                    }
                });
            }
            const data = await interviewCreationSchema.safeParseAsync(req.body);
            if (!data.success) {
                return res.status(400).json({
                    error: 'Invalid payload',
                    details: {
                        error: data.error,
                    },
                });
            }
            const interview = await interviewServices.createInterview(req.body, req.session);
            return res.status(200).json({
                id: interview.id,
            });
        } catch (error) {
            logger.error({
                endpoint: 'interview POST /',
                error: error.toString(),
                trace: error?.stack,
                data: req.body,
            });
            return res.status(500).json('Internal Server Error');
        }
    });

    router.get('/:id', middleware.authMiddleware.checkIfLogin, async (req, res) => {
        const { id } = req.params;
        try {
            const interviewObj = await interviewServices.getInterviewById(id);
            if (!checkPermissionForContentModification(interviewObj, req.session)) {
                return res.status(403).json({
                    error: 'Not authorized',
                });
            }
            if (!interviewObj) {
                return res.status(404).json({
                    error: 'Interview not found',
                })
            }
            return res.json(interviewObj);
        } catch (error) {
            logger.error({
                endpoint: `interview PATCH /${id}`,
                error,
                data: req.body,
            });
            return res.status(500).json('Internal Server Error');
        }
    });

    router.patch('/:id', middleware.authMiddleware.checkIfLogin, async (req, res) => {
        const { id } = req.params;
        try {
            if ('difficulty' in req.body) {
                req.body.difficulty = Object.entries(req.body.difficulty).map(([key, value]) => {
                    return {
                        skill: key,
                        ...value,
                    }
                });
            }
            const data = await interviewCreationSchema.safeParseAsync(req.body, req.body);
            if (!data.success) {
                return res.status(400).json({
                    error: 'Payload is not valid',
                    details: data.error,
                });
            }
            const interviewObj = await interviewServices.getInterviewById(id);
            if (!interviewObj) {
                return res.status(404).json({
                    error: 'Interview not found',
                });
            }
            if (!checkPermissionForContentModification(interviewObj, req.session)) {
                return res.status(403).json({
                    error: 'Not authorized'
                });
            }
            const newInterviewObj = await interviewServices.updateInterview(id, data.data, req.session);
            return res.status(200).json({
                id: newInterviewObj.id,
            });
        } catch (error) {
            logger.error({
                endpoint: `interview PATCH /${id}`,
                error,
                data: req.body,
            });
            return res.status(500).json({error: 'Internal Server Error'});
        }
    });

    router.get('/clone/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const interviewObj = await interviewServices.getInterviewById(id);
            if (!interviewObj) {
                return res.status(404).json({
                    error: 'Interview Not Found',
                });
            }
            if (!checkPermissionForContentModification(interviewObj, req.session)) {
                return res.status(403).json({
                    error: 'Not Authorized',
                });
            }
            const objToSave = {
                ...interviewObj,
            }
            delete objToSave.id;
            delete objToSave._id;
            delete objToSave.createdBy;
            delete objToSave.orgId;
            delete objToSave.createdAt;

            objToSave.title = `${interviewObj.title}-clone-${Date.now()}`
            const clone = await interviewServices.createInterview(objToSave, req.session);
            return res.json({
                id: clone.id,
            });
        } catch (error) {
            logger.error({
                endpoint: `clone /${id}`,
                error,
            });
            return res.status(5005).json({
                error: 'Internal Server Error',
            })
        }
    });
    return router;
}

module.exports = {
    createInterviewRoutes,
};