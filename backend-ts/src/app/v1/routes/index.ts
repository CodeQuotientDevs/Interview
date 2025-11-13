import { Router } from "express";

import { checkIfLogin } from "@app/v1/middleware";

import { authRouter } from "./auth";
import { interviewRoute, interviewServices } from "./interview";
import { userServices } from "./user";
import { candidateRepo, candidateServices, createCandidateRoutes } from "./candidate";
import { candidateResponseService } from "./candidate-responses";


const candidateRoute = createCandidateRoutes({
    userServices: userServices,
    candidateServices: candidateServices,
    interviewServices: interviewServices,
    externalService: null,
    candidateResponseService: candidateResponseService,
})

const router = Router();

router.use('/interviews', interviewRoute);
router.use('/candidates', candidateRoute);
router.use('/auth', authRouter);

export default router;