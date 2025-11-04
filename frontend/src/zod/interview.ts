import Zod from "zod";

const types = {
	title: Zod.string().nonempty(),
	name: Zod.string().nonempty(),
	email: Zod.string().email(),
	phone: Zod.string().nonempty().optional(),
	jobTitle: Zod.string().nonempty(),
	description: Zod.string().nonempty(),
	duration: Zod.number().nonnegative().min(1),
	difficulty: Zod.record(Zod.string(), Zod.object({
		difficulty: Zod.preprocess((arg) => {
			if (typeof arg === 'string') {
				return parseInt(arg);
			}
			return arg;
		}, Zod.number().min(1).max(3)),
		duration: Zod.number().min(1).default(1),
		weight: Zod.number().min(1).default(1),
	})),
	startTime: Zod.date(),
	endTime: Zod.date().optional().nullable(),
	yearOfExperience: Zod.number().nonnegative().min(0),
	completedAt: Zod.date().optional(),
	score: Zod.number()?.optional(),
	keywords: Zod.array(Zod.string().nonempty()),
	generalDescriptionForAi: Zod.string().nonempty(),
}

export const interviewCreateSchema = Zod.object({
	title: types.title,
	duration: types.duration,
	keywords: types.keywords.optional().default([]),
	difficulty: types.difficulty.optional().default({}),
	generalDescriptionForAi: types.generalDescriptionForAi,
}).refine((arg) => {
	const totalDuration = Object.values(arg.difficulty).reduce((result, currentValue) => result += currentValue.duration, 0);
	return totalDuration <= arg.duration;
}, {
	message: "Duration must be greater than the sum of all difficulty durations",
    path: ["duration"],
});

export const interviewUpdateSchema = Zod.object({
	id: Zod.string().nonempty(),
	title: types.title,
	duration: types.duration,
	keywords: types.keywords.optional(),
	difficulty: types.difficulty.optional(),
	generalDescriptionForAi: types.generalDescriptionForAi,
});


export const interviewListItemSchema = Zod.object({
	id: Zod.string(),
	title: Zod.string().nonempty(),
	keywords: types.keywords.optional(),
	duration: types.duration,
	createdAt: Zod.preprocess((arg) => {
		if (typeof arg === 'string' || typeof arg === 'number') {
			return new Date(arg)
		}
		return arg;
	}, Zod.date()),
	updatedAt: Zod.preprocess((arg) => {
		if (typeof arg === 'string' || typeof arg === 'number') {
			return new Date(arg)
		}
		return arg;
	}, Zod.date()),
});

export const interviewGetSchema = Zod.object({
	id: Zod.string().nonempty(),
	title: types.title,
	duration: types.duration,
	keywords: types.keywords.optional(),
	difficulty: types.difficulty.optional(),
	generalDescriptionForAi: types.generalDescriptionForAi,
});

const interviewCandidate = {
	id: Zod.string().nonempty(),
	name: Zod.string().nonempty(),
	email: Zod.string().nonempty(),
	startTime: Zod.preprocess(arg => {
		if (typeof arg === "string" || arg instanceof Date) {
			const parsedDate = new Date(arg);
			return isNaN(parsedDate.getTime()) ? undefined : parsedDate;
		}
		return arg;
	}, Zod.date()),
	endTime: Zod.preprocess(arg => {
		if (typeof arg === "string" || arg instanceof Date) {
			const parsedDate = new Date(arg);
			return isNaN(parsedDate.getTime()) ? undefined : parsedDate;
		}
		return arg;
	}, Zod.date().optional()),
	completedAt: Zod.preprocess(arg => {
		if (typeof arg === "string" || arg instanceof Date) {
			const parsedDate = new Date(arg);
			return isNaN(parsedDate.getTime()) ? undefined : parsedDate;
		}
		return arg;
	}, Zod.date()),
	score: Zod.number().min(0).max(100),
	detailedReport: Zod.array(Zod.object({
		topic: Zod.string().nonempty(),
		score: Zod.number().min(0),
		detailedReport: Zod.string().nonempty(),
		questionsAsked: Zod.array(Zod.object({
			userAnswer: Zod.string(),
			question: Zod.string().nonempty(),
			remarks: Zod.string(),
			score: Zod.number().nonnegative(),
		})).default([]),
	})),
	summaryReport: Zod.string().nonempty(),
	userSpecificDescription: Zod.string().nonempty(),
}

export const interviewCandidateListSchema = Zod.object({
	id: interviewCandidate.id,
	name: interviewCandidate.name,
	email: interviewCandidate.email,
	startTime: Zod.preprocess(arg => {
		if (typeof arg === "string" || arg instanceof Date) {
			const parsedDate = new Date(arg);
			return isNaN(parsedDate.getTime()) ? undefined : parsedDate;
		}
		return arg;
	}, Zod.date()),
	endTime: Zod.preprocess(arg => {
		if (typeof arg === "string" || arg instanceof Date) {
			const parsedDate = new Date(arg);
			return isNaN(parsedDate.getTime()) ? undefined : parsedDate;
		}
		return arg;
	}, Zod.date().optional()),
	completedAt: interviewCandidate.completedAt.optional(),
	score: interviewCandidate.score.optional(),
	summaryReport: interviewCandidate.summaryReport.optional(),
	detailedReport: interviewCandidate.detailedReport.optional(),
	userSpecificDescription: interviewCandidate.userSpecificDescription.optional(),
});


// export const interviewListSchema = Zod.object({
// 	id: Zod.string().nonempty(),
// 	name: Zod.string().nonempty(),
// 	email: Zod.string().email(),
// 	jobTitle: Zod.string().nonempty(),
// 	phone: Zod.string().nonempty(),
// 	startTime: Zod.date(),
// 	endTime: Zod.date().optional().nullable(),
// 	duration: Zod.number().nonnegative().min(1),
// 	completedAt: Zod.date().optional(),
// 	score: Zod.number()?.optional(),
// 	difficulty: Zod.array(Zod.object({
// 		skill: Zod.string(),
// 		difficulty: Zod.number(),
// 	}))?.optional(),
// 	detailedReport: Zod.array(Zod.object({
// 		topic: Zod.string(),
// 		score: Zod.string(),
// 		detailedReport: Zod.string(),
// 	})).optional(),
// });

export const sessionSchema = Zod.object({
	userId: Zod.string().nonempty().min(1),
	displayname: Zod.string().nonempty(),
	email: Zod.string().email(),
});

export const interviewItemSchema = interviewCreateSchema;