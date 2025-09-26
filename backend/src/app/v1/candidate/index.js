const candidateModel = require('./data-access/candidate.models');
const CandidateRepo = require('./data-access/candidate.repository');
const CandidateService = require('./domain/candidate.service');
const ExternalUserService = require('./domain/external.service');
const { createCandidateRoutes } =  require('./entry-points/candidate.route');

const candidateRepo = new CandidateRepo(candidateModel);
const externalService = new ExternalUserService(
    process.env.EXTERNAL_USER_SERVICE,
    process.env.EXTERNAL_USER_SERVICE_AUTH_TOKEN,
);
const candidateServices = new CandidateService(candidateRepo);

module.exports = {
    externalService,
    candidateServices,
    createCandidateRoutes,
}