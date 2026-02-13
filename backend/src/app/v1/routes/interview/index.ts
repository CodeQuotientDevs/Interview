import interviewModel from "./data-access/interview.models";
import InterviewRepo from "./data-access/interview.repository";
import InterviewService from "./domain/interview.service";
import {  createInterviewRoutes} from "./entry-points/interview.route"



const interviewRepo = new InterviewRepo(interviewModel);
export const interviewServices = new InterviewService(interviewRepo);
export const interviewRoute = createInterviewRoutes({ interviewServices });
