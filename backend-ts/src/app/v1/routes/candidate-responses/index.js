const candidateResponseModel = require('./data-access/candidate-response.models');
const CandidateResponseService = require('./domain/candidate-response.service');

const candidateResponseService = new CandidateResponseService(candidateResponseModel);

module.exports = {
    candidateResponseService,
}
