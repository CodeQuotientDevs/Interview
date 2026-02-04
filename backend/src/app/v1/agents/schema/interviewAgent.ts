import z from "zod";

export const interviewParserSchema = z.object({
    timestamp: z.string().describe("UTC timestamp when this structured message was created"),
    isInterviewGoingOn: z.boolean().describe("Whether the interview is currently active"),
    intent: z.string().nullable().describe("Short string representing the interpreted meaning of the message"),
    confidence: z.number().min(0).max(1).describe("Confidence level (0–1) of this interpretation"),
    shortSummary: z.string().default("").describe("Optional one-line summary of the candidate’s message"),
    topicComplete: z.boolean().describe("Describe if the interview topic is covered or not"),
});

export type InterviewParserType = z.infer<typeof interviewParserSchema>


const QuestionSchema = z.object({
    question: z
        .string()
        .min(1)
        .describe("Question asked to the user"),
    score: z
        .number()
        .int()
        .min(0)
        .max(10)
        .describe(
            "Score for this question (SCORE should be between 0 to 10) and strictly depend on the user's answer. If user didn't attempt or skip the question score must be 0"
        ),
    userAnswer: z
        .string()
        .describe(
            "User answer in markdown format; if plain text then also provide in markdown format"
        ),
    remarks: z
        .string()
        .describe("Evaluator remarks for the user's answer"),
}).describe("Schema for a single question asked under a topic");

const TopicDetailSchema = z.object({
    topic: z
        .string()
        .min(1)
        .describe("The name or title of the topic that the user was tested on during the interview"),
    topicWeight: z
        .number()
        .describe("The weight of this topic from overall interview"),
    score: z
        .number()
        .min(0)
        .max(100)
        .describe("The user's score for this specific topic (0-100)"),
    detailedReport: z
        .string()
        .describe(
            "A comprehensive report that provides insight into the user's strengths and weaknesses in the topic."
        ),
    questionsAsked: z
        .array(QuestionSchema)
        .describe(
            "Provide the questions which were asked to this user for this topic. Make sure to show all questions."
        ),
}).describe("Each object represents the performance report for a specific topic");


export const interviewReportSchema = z.object({
    result: z
        .boolean()
        .describe(
            "Indicates whether the user passed the interview. `true` means passed, `false` means did not pass."
        ),

    scorePercentage: z
        .number()
        .min(0)
        .max(100)
        .describe(
            "The overall percentage score of the user in the interview, between 0 and 100. Calculated by combining topic-wise scores with their weightages."
        ),

    summaryReport: z
        .string()
        .describe("Provide brief summary of user report in markdown format."),

    detailsDescription: z
        .array(TopicDetailSchema)
        .describe(
            "An array containing a detailed report of the user's performance on specific topics in the interview."
        ),
}).describe(
    "Schema representing the response of a user's interview results, including overall performance and detailed topic-wise report."
);


export const candidateBehaviorSchema = z.object({
    intelligenceLevel: z.enum(["beginner", "intermediate", "advanced", "expert"]).describe("Assessed intelligence level based on answer quality and depth"),
    confidenceLevel: z.enum(["low", "medium", "high", "very_high"]).describe("Assessed confidence level based on certainty and tone"),
    communicationClarity: z.enum(["poor", "fair", "good", "excellent"]).describe("How clearly the candidate explains their answers"),
    problemSolvingApproach: z.enum(["scattered", "methodical", "strategic", "insightful"]).describe("How the candidate approaches problem-solving"),
    technicalDepth: z.enum(["surface", "moderate", "deep", "expert"]).describe("How deep their technical knowledge goes"),
    conceptualUnderstanding: z.number().int().min(0).max(100).describe("Score for theoretical concept understanding (0-100)"),
    practicalExperience: z.number().int().min(0).max(100).describe("Score for hands-on practical experience (0-100)"),
    strengths: z.array(z.string()).describe("Array of key strengths demonstrated"),
    weaknesses: z.array(z.string()).describe("Array of areas to improve"),
    adjustQuestionDifficulty: z.enum(["decrease", "maintain", "increase", "vary"]).describe("Recommended difficulty adjustment for next questions"),
    brief_reasoning: z.string().describe("1-2 sentence summary of the assessment"),
}).describe("Schema for analyzing candidate behavioral metrics and interview adaptation guidance");

export type CandidateBehaviorType = z.infer<typeof candidateBehaviorSchema>;

export type InterviewReportType = z.infer<typeof interviewParserSchema>;