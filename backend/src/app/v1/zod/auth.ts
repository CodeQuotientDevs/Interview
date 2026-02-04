import { z } from 'zod';

export const loginPostSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export const loginGoogleSchema = z.object({
    token: z.string(),
});

export default {
    loginPostSchema,
    loginGoogleSchema,
};
