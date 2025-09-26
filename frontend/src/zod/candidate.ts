import Zod from "zod";

const types = {
    name: Zod.string().nonempty(),
    email: Zod.string().nonempty(),
    phone: Zod.string().nonempty(),
    yearOfExperience: Zod.number().nonnegative(),
    startTime: Zod.date(),
    endTime: Zod.date(),
    userSpecificDescription: Zod.string().nonempty(),
}

export const candidateInviteSchema = Zod.object({
    name: types.name,
    email: types.email,
    phone: types.phone.optional(),
    yearOfExperience: types.yearOfExperience,
    startTime: types.startTime,
    endTime: types.endTime.optional(),
    userSpecificDescription: types.userSpecificDescription,
});

export const messagesSchema = Zod.object({
    role: Zod.string(),
    parts: Zod.any(),
})

export const interviewContentSchema = Zod.object({
    completedAt: Zod.preprocess((args) => {
        if (typeof args === 'string' || args instanceof Date) {
            return new Date(args);
        }
        return args;
    }, Zod.date().optional()),
    messages: Zod.array(messagesSchema),
});
