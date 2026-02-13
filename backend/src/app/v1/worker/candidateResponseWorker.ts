import logger from "@root/libs/logger";
import type { Candidate } from "@app/v1/routes/candidate/domain/candidate.service";

import redis from "@services/redis";
import redisConstant from "@root/constants/redis";
import InterviewAgent from "../agents/InterviewAgentGraph";
import InterviewService from "../routes/interview/domain/interview.service";

export class CandidateResponseWorker{
    private candidateService: Candidate;
    private interviewService: InterviewService;
    constructor({candidateService, interviewService }: { candidateService: Candidate, interviewService: InterviewService }) {
        this.candidateService = candidateService;
        this.interviewService = interviewService;
    }

    async saveSubmissionFromQueue() {
        const attemptId = (await redis.zrange(redisConstant.completedInterview, 0, Date.now(), 'BYSCORE', 'LIMIT', 0, 1))?.[0] ?? null;
        if (!attemptId) {
            return false;
        }
        logger.info(`Generating report attempt ${attemptId}`);
        const attempt = await this.candidateService.findById(attemptId, {});
        if (!attempt) {
            logger.info(`Skipping creating report for ${attemptId}`)
            await redis.zrem(redisConstant.completedInterview, attemptId);
            return;
        }
        const interviewObj = await this.interviewService.getInterviewById(attempt.interviewId);
        const agent = await InterviewAgent.create({
            candidate: attempt,
            interview: interviewObj, 
            modelToUse: "gemini-2.5-pro",
            user: null,
        });
        const report = await agent.generateReport();
        const concludedAt = new Date;
        const result = await this.candidateService.updateOne({
            id: attempt.id,
        }, {
            $set: {
                score: report.scorePercentage,
                detailedReport: report.detailsDescription,
                summaryReport: report.summaryReport,
                completedAt: attempt.completedAt ?? concludedAt,
                concludedAt,
            },
            $unset: {
                revaluationStartDate: 1,
            }
        })
        await redis.zrem(redisConstant.completedInterview, attemptId);
        logger.info(`Report generated for attempt ${attemptId}`);
        return result;
    }
}
