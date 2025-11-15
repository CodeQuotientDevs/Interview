import sharedRedis from "@services/sharedRedis"
import redis from "@services/redis"
import redisConstant from "@root/constants/redis"
import { candidateInterviewAttemptStatus } from "@root/constants";
import type CandidateRepository from "@root/app/v1/routes/candidate/data-access/candidate.repository"


type GetMetricsOptions = {
	startDate?: Date;
	endDate?: Date;
};

type LabelFormat = "hour" | "date" | "month";

type MetricRow = {
    date: string;    
    label: string;   
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

    async getMetrics(
		options?: GetMetricsOptions,
		interviewIds: string[] = []
	): Promise<GetMetricsResult> {
		const locales = "en-US";
		const MAX_DATE_RANGE_DAYS = 400;
		const now = new Date();

		let endDate = options?.endDate || now;
		let startDate = options?.startDate;

		if (!startDate) {
			startDate = new Date(endDate);
			startDate.setDate(endDate.getDate() - 7);
		}

		if (endDate > now) endDate = now;

		if (startDate > endDate) {
			startDate = new Date(endDate);
			startDate.setDate(endDate.getDate() - 7);
		}

		let diffTime = Math.abs(endDate.getTime() - startDate.getTime());
		let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays > MAX_DATE_RANGE_DAYS) {
			startDate = new Date(endDate);
			startDate.setDate(endDate.getDate() - MAX_DATE_RANGE_DAYS);
		}

		let labelFormat: LabelFormat = "date";
		// if (diffDays <= 1) labelFormat = "hour";
		// else if (diffDays <= 180) labelFormat = "date";
		// else labelFormat = "month";

		const baseMatch: Record<string, any> = {
			startTime: { $gte: startDate, $lte: endDate },
			isActive: true,
			interviewId: { $in: interviewIds },
		};

		const scheduledMetrics = await this.#model.model.aggregate([
			{ $match: baseMatch },
			{
				$group: {
					_id:{
                        year: { $year: "$startTime" },
                        month: { $month: "$startTime" },
                        day: { $dayOfMonth: "$startTime" },
					},
					count: { $sum: 1 },
				},
			},
		]);

		const concludedMatch: Record<string, any> = {
			completedAt: { $gte: startDate, $lte: endDate },
			isActive: true,
			interviewId: { $in: interviewIds },
		};

		const concludedMetrics = await this.#model.model.aggregate([
			{ $match: concludedMatch },
			{
				$group: {
					_id: {
                        year: { $year: "$completedAt" },
                        month: { $month: "$completedAt" },
                        day: { $dayOfMonth: "$completedAt" },
					},
					count: { $sum: 1 },
				},
			},
		]);

		interface MetricDoc {
			_id: { year: number; month: number; day?: number; hour?: number };
			count: number;
		}

		const metricsMap = new Map<
			string,
			{ _id: MetricDoc["_id"]; scheduled: number; concluded: number }
		>();

		(scheduledMetrics as MetricDoc[]).forEach((metric) => {
			const key = JSON.stringify(metric._id);
			metricsMap.set(key, { _id: metric._id, scheduled: metric.count, concluded: 0 });
		});

		(concludedMetrics as MetricDoc[]).forEach((metric) => {
			const key = JSON.stringify(metric._id);
			const existing = metricsMap.get(key);
			if (existing) existing.concluded = metric.count;
			else
				metricsMap.set(key, {
					_id: metric._id,
					scheduled: 0,
					concluded: metric.count,
				});
		});

		const metrics = Array.from(metricsMap.values()).sort((a, b) => {
			if (a._id.year !== b._id.year) return a._id.year - b._id.year;
			if (a._id.month !== b._id.month) return a._id.month - b._id.month;
			if (a._id.day && b._id.day && a._id.day !== b._id.day)
				return a._id.day - b._id.day;
			if (a._id.hour && b._id.hour && a._id.hour !== b._id.hour)
				return a._id.hour - b._id.hour;
			return 0;
		});

		const intlOptions: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

		const formattedMetrics: MetricRow[] = metrics.map((metric) => {
			const { year, month, day, hour } = metric._id;
			const dateObj = new Date(year, month - 1, day!)

			return {
				date: dateObj.toISOString(),
				label: dateObj.toLocaleString(locales, intlOptions),
				scheduled: metric.scheduled,
				concluded: metric.concluded,
			};
		});

		return {
			labelFormat: { locales, type: labelFormat, intlOptions },
			metrics: formattedMetrics,
		};
	}

async getInterviewsByDate(
	date: Date,
	type: 'hour' | 'date' | 'month',
	interviewIds: string[] = []
): Promise<any[]> {
		let startDate: Date, endDate: Date;

		if (type === 'hour') {
			startDate = new Date(date);
			startDate.setMinutes(0, 0, 0);
			endDate = new Date(startDate);
			endDate.setHours(startDate.getHours() + 1);
		} else if (type === 'date') {
			startDate = new Date(date);
			startDate.setHours(0, 0, 0, 0);
			endDate = new Date(startDate);
			endDate.setDate(startDate.getDate() + 1);
		} else if (type === 'month') {
			startDate = new Date(date);
			startDate.setDate(1);
			startDate.setHours(0, 0, 0, 0);
			endDate = new Date(startDate);
			endDate.setMonth(startDate.getMonth() + 1);
		} else {
			throw new Error('Invalid type parameter');
		}

		const interviews = await this.#model.model.find(
			{
				interviewId: { $in: interviewIds },
				startTime: { $gte: startDate, $lt: endDate },
				isActive: true
			},
			{ interviewId: 1, userId: 1, startTime: 1, createdAt: 1, completedAt: 1 }
		)
		.populate({
			path: 'interview',
			select: '_id id title duration'
		})
		.populate({
			path: 'user',
			select: '_id id name email'
		})
		.sort({ startTime: -1 });

		return interviews;
	}

}


export default Candidate;