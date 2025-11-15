import sharedRedis from "@services/sharedRedis"
import redis from "@services/redis"
import redisConstant from "@root/constants/redis"
import { candidateInterviewAttemptStatus } from "@root/constants";
import type CandidateRepository from "@root/app/v1/routes/candidate/data-access/candidate.repository"


type GetMetricsOptions = { daysLimit?: number };

type MetricRow = {
    date: string;    // ISO date string for the bucket start
    label: string;   // human readable label
    scheduled: number;
    concluded: number;
};

type GetMetricsResult = {
    labelFormat: {
        locales: string;
        type: "hour" | "date" | "month";
        intlOptions: Intl.DateTimeFormatOptions;
    };
    metrics: MetricRow[];
};


export class Candidate {
    #model: CandidateRepository
    constructor(model: CandidateRepository) {
        this.#model = model;
    }

    async listInterviewCandidate(interviewId: string) {
        const findObj = {
            interviewId,
            isActive: true,
        }
        const data = await this.#model.find(findObj, {
            id: 1,
            interviewId: 1,
            versionId: 1,
            externalUser: 1,
            userId: 1,
            startTime: 1,
            endTime: 1,
            score: 1,
            completedAt: 1,
            summaryReport: 1,
            detailedReport: 1,
        });
        return data;
    }


    async createCandidateInterview(interviewObj: { id: string, versionId: string }, data: Record<string, any>) {
        if (data.externalUser) {
            const userObj = await this.#model.findOne({
                userId: data.userId,
                externalUserUniquenessKey: data.externalUserUniquenessKey,
            });
            if (userObj) {
                return userObj;
            }
        }
        const objToSave = {
            interviewId: interviewObj.id,
            versionId: interviewObj.versionId,
            externalUser: data.externalUser,
            userId: data.userId,
            userSpecificDescription: data.userSpecificDescription,
            yearOfExperience: data.yearOfExperience,
            startTime: data.startTime,
            endTime: data.endTime,
        }
        const candidateObj = await this.#model.create(objToSave as any);
        return candidateObj;

    }
    async findById(id: string, projection: Record<string, 1> = {}) {
        return this.#model.findOne({ id }, projection);
    }


    async updateOne(findObj: Record<string, any>, updateObj: Record<string, any>) {
        return this.#model.updateOne(findObj, updateObj);
    }

    async saveToSubmissionQueue(id: string) {
        return redis.zadd(redisConstant.completedInterview, Date.now(), id);
    }

    async #previouslyAskedQuestionsFromDB(interviewId: string) {
        const interviewAttempts = await this.#model.model.aggregate(
            [
                {
                    $match: {
                        interviewId: interviewId,
                        $and: [
                            { completedAt: { $exists: true } },
                            { completedAt: { $ne: null } },
                            { detailedReport: { $exists: true } },
                        ]
                    },
                },
                {
                    $unwind: "$detailedReport"
                }, {
                    $unwind: "$detailedReport.questionsAsked"
                },
                {
                    $group: {
                        "_id": "$interviewId",
                        "questionAsked": { $push: "$detailedReport.questionsAsked.question" }
                    }
                }
            ]
        );
        const questionsAsked = interviewAttempts[0]?.questionAsked ?? [];
        return questionsAsked;
    }

    async getAllCandidateInterviewStatus(interviewId: string) {
        const candidates = await this.#model.find({
            interviewId,
        }, {}, {});
        const candidateIdToObjectMap = new Map();

        /**
         * @type {Array<string>}
         */
        const candidateToCheckOfPendingOrNotStartedStatus = [];
        for (let index = 0; index < candidates.length; index++) {
            const candidate = candidates[index];
            candidateIdToObjectMap.set(candidate.id.toString(), candidate);
            if (candidate.completedAt) {
                candidate.completionStatus = candidateInterviewAttemptStatus.completed;
                break;
            }
            candidateToCheckOfPendingOrNotStartedStatus.push(candidate.id.toString());
        }

        return candidates;
    }

    async previouslyAskedQuestions(interviewId: string) {
        throw new Error("This function is not implemented");
    }


    async find(findObj: Record<string, any>, projection: Record<string, any>, options: Record<string, any> = {}) {
        options.lean = true;
        return this.#model.find(findObj, projection, options);
    }

    async concludeCandidateInterview(ids: Array<string>) {
        const redisPipeline = redis.pipeline();
        ids.forEach((id) => {
            redisPipeline.zadd(redisConstant.completedInterview, Date.now(), id);
        });
        return redisPipeline.exec();
    }

    async getMetrics(options: GetMetricsOptions = {}, interviewIds: string[] = []): Promise<GetMetricsResult> {
        const locales = "en-US";
        const MIN_DAYS_LIMIT = 1;
        const MAX_DAYS_LIMIT = 400;
        const daysLimit = Math.max(MIN_DAYS_LIMIT, Math.min(options?.daysLimit ?? 7, MAX_DAYS_LIMIT));

        // Calculate start & end date bounds (endDate now, startDate daysLimit ago)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - daysLimit);

        // Determine bucket type
        const labelFormat: "hour" | "date" | "month" =
            daysLimit === 1 ? "hour" :
                daysLimit <= 180 ? "date" :
                    "month";

        // Base match for scheduled
        const baseMatch: Record<string, any> = {
            startTime: { $gte: startDate, $lte: endDate },
            isActive: true,
        };

        // only add interviewId filter if provided (avoid $in: [] which matches nothing)
        if (Array.isArray(interviewIds) && interviewIds.length > 0) {
            baseMatch.interviewId = { $in: interviewIds };
        }

        // Helper to build _id grouping expression depending on labelFormat and field
        const buildGroupId = (fieldName: string) => {
            if (labelFormat === "hour") {
                return {
                    year: { $year: `$${fieldName}` },
                    month: { $month: `$${fieldName}` },
                    day: { $dayOfMonth: `$${fieldName}` },
                    hour: { $hour: `$${fieldName}` },
                };
            }
            if (labelFormat === "date") {
                return {
                    year: { $year: `$${fieldName}` },
                    month: { $month: `$${fieldName}` },
                    day: { $dayOfMonth: `$${fieldName}` },
                };
            }
            // month
            return {
                year: { $year: `$${fieldName}` },
                month: { $month: `$${fieldName}` },
            };
        };

        // aggregate types as any to avoid strict mongo typings; adjust if you have models typed
        const scheduledMetrics = await this.#model.model.aggregate<any>([
            { $match: baseMatch },
            {
                $group: {
                    _id: buildGroupId("startTime"),
                    count: { $sum: 1 },
                },
            },
        ]);

        // Build match conditions for concluded
        const concludedMatch: Record<string, any> = {
            completedAt: { $gte: startDate, $lte: endDate },
            isActive: true,
        };
        if (Array.isArray(interviewIds) && interviewIds.length > 0) {
            concludedMatch.interviewId = { $in: interviewIds };
        }

        const concludedMetrics = await this.#model.model.aggregate<any>([
            { $match: concludedMatch },
            {
                $group: {
                    _id: buildGroupId("completedAt"),
                    count: { $sum: 1 },
                },
            },
        ]);

        // Merge results into a map by JSON key of _id
        const metricsMap = new Map<string, { _id: any; scheduled: number; concluded: number }>();

        scheduledMetrics.forEach((m: { _id: any; count: number }) => {
            const key = JSON.stringify(m._id);
            metricsMap.set(key, { _id: m._id, scheduled: m.count, concluded: 0 });
        });

        concludedMetrics.forEach((m: { _id: any; count: number }) => {
            const key = JSON.stringify(m._id);
            const existing = metricsMap.get(key);
            if (existing) {
                existing.concluded = m.count;
            } else {
                metricsMap.set(key, { _id: m._id, scheduled: 0, concluded: m.count });
            }
        });

        // Convert map to array and sort chronologically
        const metricsArray = Array.from(metricsMap.values()).sort((a, b) => {
            // compare year -> month -> day -> hour (if available)
            if (a._id.year !== b._id.year) return a._id.year - b._id.year;
            if (a._id.month !== b._id.month) return a._id.month - b._id.month;
            if (a._id.day !== undefined && b._id.day !== undefined && a._id.day !== b._id.day) return a._id.day - b._id.day;
            if (a._id.hour !== undefined && b._id.hour !== undefined && a._id.hour !== b._id.hour) return a._id.hour - b._id.hour;
            return 0;
        });

        // Intl options depending on bucket
        const intlOptions: Intl.DateTimeFormatOptions =
            labelFormat === "hour" ? { hour: "2-digit", hour12: false } :
                labelFormat === "date" ? { month: "short", day: "numeric" } :
                    { month: "short", year: "numeric" };

        const formattedMetrics: MetricRow[] = metricsArray.map(metric => {
            let dateObj: Date;

            if (labelFormat === "hour") {
                dateObj = new Date(metric._id.year, metric._id.month - 1, metric._id.day, metric._id.hour);
            } else if (labelFormat === "date") {
                dateObj = new Date(metric._id.year, metric._id.month - 1, metric._id.day);
            } else {
                // month: use first day of the month
                dateObj = new Date(metric._id.year, metric._id.month - 1, 1);
            }

            const date = dateObj.toISOString();
            const label = dateObj.toLocaleString(locales, intlOptions);

            return {
                date,
                label,
                scheduled: metric.scheduled ?? 0,
                concluded: metric.concluded ?? 0,
            };
        });

        return {
            labelFormat: { locales, type: labelFormat, intlOptions },
            metrics: formattedMetrics,
        };
    }

}


export default Candidate;