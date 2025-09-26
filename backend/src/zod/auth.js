const Zod = require('zod');

const loginPostSchema = Zod.object({
    email: Zod.string().email(),
    password: Zod.string(),
});

const loginGoogleSchema = Zod.object({
    token: Zod.string(),
});

module.exports = {
    loginPostSchema,
    loginGoogleSchema,
}