const Router = require('express').Router;
const { logger } = require('@/libs');
const formidable = require('formidable');

/**
 * 
 * @param {{ resumeService: null, fileUploadHandler: import('formidable/Formidable') }} param0 
 * @returns 
 */
function createResumeRoute({ resumeService, fileUploadHandler }) {
    const router = Router();
    router.get('/resume', fileUploadHandler, async (req, res) => {
        try {
            logger.info(req.body);
        } catch (error) {
            logger.error({
                endpoint: `GET /resume`,
                error: error,
            });
            return res.status(500).json({
                error: 'Internal Server Error',
            });
        }
    });

    return router;
}

module.exports = {
    createResumeRoute,
}