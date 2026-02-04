import zod from "zod";

export const ModelResponseValidator = zod.object({
   valid: zod.boolean(),
   reason: zod.string(),  
});

export const IntentResponseSchema = zod.object({
   intent: zod.enum(["answer","clarify_question", "dont_know_concept", "end_interview|off_topic"]),
   confidence: zod.float64(),
})