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
});