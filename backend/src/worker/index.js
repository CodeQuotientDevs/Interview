const logger = require('@/libs/logger');
const CandidateWorker = require('./candidateResponseWorker');

const candidateResponseModel = require('@/app/v1/candidate-responses/data-access/candidate-response.models');
const CandidateResponseService = require('@/app/v1/candidate-responses/domain/candidate-response.service');


const interviewCandidateModel = require('@/app/v1/candidate/data-access/candidate.models');
const InterviewCandidate = require('@/app/v1/candidate/data-access/candidate.repository');
const CandidateService = require('@/app/v1/candidate/domain/candidate.service');
const candidateRepo = new InterviewCandidate(interviewCandidateModel);


const { sendEmail } = require('@/libs/mailer');

const candidateResponseService = new CandidateResponseService(candidateResponseModel);
const candidateService = new CandidateService(candidateRepo);
const candidateWorkerInstance = new CandidateWorker({ candidateResponseService, candidateService });

async function startSaveFunction() {
    try {
        const result = await candidateWorkerInstance.saveTopResultFromRedis();
        setTimeout(startSaveFunction, 1000);
        return result;
    } catch (error) {
        logger.error(error);
        const messageToSend = `${error}\n${error?.stack}`
        await sendEmail('bhumit.rohilla@codequotient.com', messageToSend, 'Something went wrong unable to save the messages', false);
        return false;
    }
}

async function startReportGenFunc() {
    try {
        const result = await candidateWorkerInstance.saveSubmissionFromQueue();
        setTimeout(startReportGenFunc, 1000);
        return result;
    } catch (error) {
        logger.error(error);
        const messageToSend = `${error}\n${error?.stack}`
        await sendEmail('bhumit.rohilla@codequotient.com', messageToSend, 'Something went wrong unable to save the messages', false);
        return false;
    }
}

setTimeout(async () => {
    const result = await startReportGenFunc();
    if (!result) {
        return;
    }
    setTimeout(startReportGenFunc, 1000);
}, 1000);

setTimeout(async () => {
    const result = await startSaveFunction();
    if (!result) {
        return;
    }
    setTimeout(startSaveFunction, 1000);
}, 1000);