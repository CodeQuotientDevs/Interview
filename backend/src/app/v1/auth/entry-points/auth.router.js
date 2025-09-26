const { loginType } = require('@/constants');
const { logger } = require('@/libs');
const middleware = require('@/middleware');
const { loginGoogleSchema } = require('@/zod/auth');
const { Router } = require('express');
const { OAuth2Client } = require('google-auth-library')

/**
 * 
 * @param {{ authService: import('../domain/auth.service') }} model 
 */
function createAuthRouter({ authService }) {
    const router = Router();
    let googleClientId = process.env.GOOGLE_CLIENT_ID;

    async function createSessionObj(obj, user) {
        obj.userId = user.id;
        if (user.userId) {
            obj.u_id = user.userIdz;
        }
        obj.displayname = user.name;
        obj.role = user.role;
        obj.loginType = user.loginType;
        obj.orgId = user.orgId;
    }

    router.get('/logout', async (req, res) => {
        try {
            req.session.destroy();
            return res.redirect('/');
        } catch (error) {
            logger.error({
                endpoint: 'Auth POST /logout',
                error: error?.message,
                trace: error?.stack,
            });
            return res.status(500).json({
                error: 'Internal server error'
            });
        }
    });

    if (googleClientId) {
        const client = new OAuth2Client(googleClientId);
        router.post('/login/google', async (req, res) => {
            try {
                const googleToken = await loginGoogleSchema.safeParseAsync(req.body);
                if (!googleToken.success) {
                    return res.json(400).json({
                        error: 'Payload is not valid',
                    });
                }
                const ticket = await client.verifyIdToken({
                    idToken: googleToken.data.token,
                    audience: googleClientId,
                });
                const payload = ticket.getPayload();
                const user = await authService.findOne({ userId: payload.sub });
                if (user) {
                    if (payload.email && user.email !== payload.email) {
                        await authService.updateOne({ userId: payload.sub }, {
                            email: payload.email,
                        })
                        user.email = payload.email;
                    }
                    await createSessionObj(req.session, user);
                    return res.json({ session: req.session });
                }
                let name = payload.given_name;
                if (payload.family_name) {
                    name += ` ${payload.family_name}`;
                }
                const newUser = await authService.createOne({
                    email: payload.email,
                    userId: payload.sub,
                    name: name,
                    loginType: loginType.google,
                });
                await createSessionObj(req.session, newUser);
                return res.json({ session: req.session });
            } catch (error) {
                logger.error({
                    endpoint: 'Auth POST /login/google',
                    error: error?.message,
                    trace: error?.stack,
                });
                return res.status(500).json({
                    error: 'Internal server error'
                });
            }
        });
    }
    
    router.get('/session', middleware.authMiddleware.checkIfLogin, (req, res) => {
        try {
            const session = req.session;
            return res.json(session);
        } catch (error) {
            logger.error({
                endpoint: 'Auth GET /session',
                error: error?.message,
                trace: error?.stack,
            });
            return res.status(500).json({
                error: 'Internal server error',
            });
        }
    });

    return router;
}

module.exports = {
    createAuthRouter,
}