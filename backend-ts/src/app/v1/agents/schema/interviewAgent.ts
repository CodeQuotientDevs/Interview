import z from "zod";

export const interviewParserSchema = z.object({
    timestamp: z.string().describe("UTC timestamp when this structured message was created"),
    isInterviewGoingOn: z.boolean().describe("Whether the interview is currently active"),
    editorType: z.enum(["editor", "inputBox"]).describe("Type of input UI expected for the next candidate response"),
    languagesAllowed: z.array(
        z.object({
            label: z.string().describe("Human-readable programming language name (e.g., 'Python')"),
            value: z.string().describe("Machine-readable language key (e.g., 'python')"),
        })
    ).describe("List of programming languages allowed or detected for this message"),

    intent: z.string().nullable().describe("Short string representing the interpreted meaning of the message"),
    confidence: z.number().min(0).max(1).describe("Confidence level (0–1) of this interpretation"),
    shortSummary: z.string().default("").describe("Optional one-line summary of the candidate’s message"),
});

export type InterviewParserType = z.infer<typeof interviewParserSchema>
