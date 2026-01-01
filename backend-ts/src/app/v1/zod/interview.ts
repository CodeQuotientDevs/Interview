import Zod from 'zod';

export const userMessage = Zod.object({
	userInput: Zod.string(),
    type: Zod.string().optional(),
    audioUrl: Zod.string().optional(),
    audioDuration: Zod.number().optional(),
});

export const interviewCreationSchema = Zod.object({
	title: Zod.string().nonempty(),
	duration: Zod.number().min(1),
	generalDescriptionForAi: Zod.string().nonempty(),
	keywords: Zod.array(Zod.string()).optional(),
	difficulty: Zod.array(Zod.object({
		skill: Zod.string().nonempty(),
		difficulty: Zod.number().min(1).max(3),
		weight: Zod.number().min(1).default(1),
		duration: Zod.number().min(1),
		questionList: Zod.string()
	})).optional(),
}).refine((arg) => {
	const totalDuration = Object.values(arg?.difficulty ?? {}).reduce((result, currentValue) => result += currentValue.duration, 0);
	return totalDuration <= arg.duration;
}, {
	message: "Duration must be greater than the sum of all difficulty durations",
    path: ["duration"],
}).refine((arg) => {
	if (!arg.difficulty) {
		return true;
	}
	const totalWeight = Object.values(arg.difficulty).reduce((result, currentValue) => result += currentValue.weight, 0);
	return Math.round(totalWeight) === 100
}, {
	message: "Total weight percentage should round off to 100%",
	path: ["difficulty.weight"],
});