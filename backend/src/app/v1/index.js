const router = require('express').Router();
const { interviewRoute, interviewServices } = require('./interview');
const { userServices } = require('./user');
const { candidateServices, externalService, createCandidateRoutes } = require('./candidate');
const { resumeRoute } = require('./resume');
const { candidateResponseService } = require('./candidate-responses');
const { checkIfLogin } = require('@/middleware/authMiddleware');
const { authRouter } = require('./auth');

const candidateRoute = createCandidateRoutes({
    userServices: userServices,
    candidateServices: candidateServices,
    interviewServices: interviewServices,
    externalService: externalService,
    candidateResponseService: candidateResponseService,
})

router.use('/interviews', interviewRoute);
router.use('/candidates', candidateRoute);
router.use('/resume', checkIfLogin, resumeRoute);
router.use('/auth', authRouter);

module.exports = router;