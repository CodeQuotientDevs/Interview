import { Router } from "express";

import { checkIfLogin } from "@app/v1/middleware";
import { setIntervalAsync } from "set-interval-async";
import { authRouter } from "./auth";
import { interviewRoute, interviewServices } from "./interview";
import { userServices } from "./user";
import { candidateRepo, candidateServices, createCandidateRoutes } from "./candidate";
import { candidateResponseService } from "./candidate-responses";
import { argsMap, logger } from "@root/libs";
import { sendEmail } from "@root/services/mailer";


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

if (argsMap.has("worker") && argsMap.get("worker") == "true") {
    const Worker = await import("../worker/candidateResponseWorker");
    const candidateWorkerInstance = new Worker.CandidateResponseWorker({
        candidateService: candidateServices,
        interviewService: interviewServices,
    });
    async function startReportGenFunc() {
        try {
            const result = await candidateWorkerInstance.saveSubmissionFromQueue();
            return result;
        } catch (error) {
            logger.error(error);
            let messageToSend = 'Error while saving the response';
            if (error instanceof Error) {
                messageToSend += `\nError: ${error.message}\n`;
                messageToSend += `Stack: ${error.stack}`;
            }
            await sendEmail('bhumit.rohilla@codequotient.com', messageToSend, 'Something went wrong unable to save the messages', false);
            return false;
        }
    }
    const timer = setIntervalAsync(async () => {
        await  startReportGenFunc();
    }, 10_000);

}