import { CandidateResponseModel } from './data-access/candidate-response.models';
import { CandidateResponseService } from './domain/candidate-response.service';

export const candidateResponseService = new CandidateResponseService(CandidateResponseModel);
export default candidateResponseService;
