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

const excelDateParser = (value: unknown) => {
    if (value instanceof Date) return value;
    if (typeof value !== "string") return value;

    const [date, time, meridian] = value.trim().split(/\s+/);
    const [dd, mm, yyyy] = date.split("/");

    return new Date(`${yyyy}-${mm}-${dd} ${time} ${meridian}`);
};




export const candidateInviteSchema = Zod.object({
    name: types.name,
    email: types.email,
    phone: types.phone.optional(),
    yearOfExperience: types.yearOfExperience.optional(),
    startTime: Zod.preprocess(
        excelDateParser,
        Zod.date()
    ),

    endTime: Zod.preprocess(
        excelDateParser,
        Zod.date().nullable().optional()
    ),
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
    idleWarningTime: Zod.string(),
    idleSubmitTime: Zod.string(),
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
