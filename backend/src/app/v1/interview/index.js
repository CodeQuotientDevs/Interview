const interviewModel = require('./data-access/interview.models');
const InterviewRepo = require('./data-access/interview.repository');
const InterviewService = require('./domain/interview.service');
const { createInterviewRoutes } = require('./entry-points/interview.route');

const interviewRepo = new InterviewRepo(interviewModel);
const interviewServices = new InterviewService(interviewRepo);
const interviewRoute = createInterviewRoutes({ interviewServices });
module.exports = {
    interviewRoute, interviewServices,
};
