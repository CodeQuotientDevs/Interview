import Zod from "zod";

const types = {
    name: Zod.string().nonempty("Name must contain at least 1 character(s)"),
    email: Zod.string().nonempty("Email must contain valid email"),
    phone: Zod.string(),
    yearOfExperience: Zod.preprocess(
    (v) => {
        if (v === "" || v === null || v === undefined) return undefined;
        const n = Number(v);
        if (Number.isNaN(n)) return undefined;
        return n;
    },
    Zod.number().nonnegative().optional()
),
    startTime: Zod.date(),
    endTime: Zod.date(),
    userSpecificDescription: Zod.string().nonempty("Description must contain at least 1 character(s)"),
}

export const candidateInviteSchema = Zod.object({
    name: types.name,
    email: types.email,
    phone: types.phone.optional(),
    yearOfExperience: types.yearOfExperience.optional(),
    startTime: types.startTime,
    endTime: Zod.union([types.endTime.optional(), Zod.null()]),
    userSpecificDescription: types.userSpecificDescription,
});

export const messageSchema = Zod.object({
    id: Zod.string(),
    createdAt: Zod.preprocess((args) => {
        if (typeof args === 'string' || args instanceof Date) {
            return new Date(args);
        }
        return args;
    }, Zod.date()),
    role: Zod.string(),
    rowText: Zod.string(),
    parsedResponse: Zod.object({
        confidence: Zod.number().min(0).max(1),
        intent: Zod.string(),
        editorType: Zod.enum(['editor', 'inputBox']),
        isInterviewGoingOn: Zod.boolean(),
        languagesAllowed: Zod.array(Zod.object({
            label: Zod.string(),
            value: Zod.string(),
        })).default([{
            label: "Javascript",
            value: "javascript",
        }]),
        shortSummary: Zod.string(),
        timestamp: Zod.preprocess((args) => {
            if (typeof args === 'string' || args instanceof Date) {
                return new Date(args);
            }
            return args;
        }, Zod.date()),
    }).optional(),
    toolCalls: Zod.array(Zod.any()).optional(),
});

export const messagesSchema = Zod.array(messageSchema);

export const interviewContentSchema = Zod.object({
    completedAt: Zod.preprocess((args) => {
        if (typeof args === 'string' || args instanceof Date) {
            return new Date(args);
        }
        return args;
    }, Zod.date().optional()),
    messages: messagesSchema,
    candidate: Zod.object({
        _id: Zod.string(),
        user: Zod.object({
            _id: Zod.string(),
            name: Zod.string(),
            email: Zod.string(),
        }),
    }).optional(),
});
