const Zod = require('zod');

const candidateCreateSchema = Zod.object({
    name: Zod.string().nonempty(),
    email: Zod.string().nonempty(),
    phone: Zod.string().nonempty().optional(),
    startTime: Zod.preprocess((arg) => {
        if (typeof arg === 'string' || arg instanceof Date) {
            return new Date(arg);
        }
        return arg;
    }, Zod.date()),
    endTime: Zod.preprocess((arg) => {
        if (typeof arg === 'string' || arg instanceof Date) {
            return new Date(arg);
        }
        return arg;
    }, Zod.date().optional()),
    yearOfExperience: Zod.number().nonnegative(),
    userSpecificDescription: Zod.string().nonempty(),
});

const userReportSchema = Zod.object({
    result: Zod.boolean(),
    summaryReport: Zod.string(),
    scorePercentage: Zod.number().min(0).max(100),
    detailsDescription: Zod.array(
        Zod.object({
            topic: Zod.string(),
            score: Zod.number().nullable(),
            detailedReport: Zod.string().nullable(),
            topicWeight: Zod.number().default(1),
            questionsAsked: Zod.array(Zod.object({
                userAnswer: Zod.string(),
                question: Zod.string(),
                remarks: Zod.string(),
                score: Zod.number().nonnegative(),
            }).strict())
        }).strict()
    ),
});

const createCandidateFromBackendSchema = Zod.object({
    sendEmail: Zod.boolean().default(false),
    userSpecificDescription: Zod.string().default(''),
    yearOfExperience: Zod.number().default(0),
    userId: Zod.string().nonempty().min(1),
    externalUserUniquenessKey: Zod.string().nonempty().min(1),
    startTime: Zod.preprocess((arg) => {
        if (typeof arg === 'string' || arg instanceof Date) {
            return new Date(arg);
        }
        return arg;
    }, Zod.date().default(new Date())),
});

module.exports = {
    createCandidateFromBackendSchema,
    candidateCreateSchema,
    userReportSchema,
}