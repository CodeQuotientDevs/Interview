import CandidateService from "./domain/candidate.service";
import CandidateRepo from "./data-access/candidate.repository";
import candidateModel from "./data-access/candidate.models";

export * from "./entry-points/candidate.route";

export const candidateRepo = new CandidateRepo(candidateModel);
export const candidateServices = new CandidateService(candidateRepo);
