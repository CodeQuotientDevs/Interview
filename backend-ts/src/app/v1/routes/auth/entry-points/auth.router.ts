import { Router, type Request, type Response } from 'express';
import session from 'express-session';
import { OAuth2Client } from 'google-auth-library';
import { loginType } from '@root/constants';
import { logger } from '@root/libs';
import { authMiddleware } from '@app/v1/middleware';
import { loginGoogleSchema } from '@app/v1/zod/auth';
import type { FilterQuery } from 'mongoose';
import type AuthService from '../domain/auth.service';
import type { AuthUser, CreateAuthUser } from '../data-access/auth.model';

type SessionStore = session.Session & Partial<session.SessionData> & Record<string, any>;
type SessionUser = Partial<AuthUser> & Record<string, any>;

async function assignSession(sessionObj: SessionStore, user: SessionUser) {
    sessionObj.userId = user.id;
    if (user.userId) {
        sessionObj.u_id = user.userId;
    }
    sessionObj.displayname = user.name;
    sessionObj.role = user.role;
    sessionObj.email = user.email;
    sessionObj.loginType = user.loginType;
    sessionObj.orgId = user.orgId;
}

export function createAuthRouter({ authService }: { authService: AuthService }) {
    const router = Router();
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    console.log(googleClientId);

    router.get('/logout', async (req: Request, res: Response) => {
        try {
            await new Promise<void>((resolve, reject) => {
                if (!req.session) {
                    resolve();
                    return;
                }
                req.session.destroy((err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
            return res.redirect('/');
        } catch (error) {
            logger.error({
                endpoint: 'Auth POST /logout',
                error: error instanceof Error ? error.message : String(error),
                trace: error instanceof Error ? error.stack : undefined,
            });
            return res.status(500).json({
                error: 'Internal server error',
            });
        }
    });

    if (googleClientId) {
        console.log('Google Post Request Registered');
        const client = new OAuth2Client(googleClientId);
        console.log('Google Post Request Registered');

        router.post('/login/google', async (req: Request, res: Response) => {
            try {
                const googleToken = await loginGoogleSchema.safeParseAsync(req.body);
                if (!googleToken.success) {
                    return res.status(400).json({
                        error: 'Payload is not valid',
                    });
                }

                const ticket = await client.verifyIdToken({
                    idToken: googleToken.data.token,
                    audience: googleClientId,
                });
                const payload = ticket.getPayload();
                if (!payload || !req.session) {
                    return res.status(401).json({ error: 'Unable to verify Google token' });
                }

                const user = await authService.findOne({ userId: payload.sub } as FilterQuery<AuthUser>);
                if (user) {
                    if (payload.email && user.email !== payload.email) {
                        await authService.updateOne(
                            { userId: payload.sub } as FilterQuery<AuthUser>,
                            { email: payload.email }
                        );
                        user.email = payload.email ?? user.email;
                    }
                    await assignSession(req.session as SessionStore, user);
                    return res.json({ session: req.session });
                }

                let name = payload.given_name || '';
                if (payload.family_name) {
                    name = name ? `${name} ${payload.family_name}` : payload.family_name;
                }

                const newUser = await authService.createOne({
                    email: payload.email ?? '',
                    userId: payload.sub,
                    name,
                    loginType: loginType.google,
                } as CreateAuthUser);
                await assignSession(req.session as SessionStore, newUser);
                return res.json({ session: req.session });
            } catch (error) {
                logger.error({
                    endpoint: 'Auth POST /login/google',
                    error: error instanceof Error ? error.message : String(error),
                    trace: error instanceof Error ? error.stack : undefined,
                });
                return res.status(500).json({
                    error: 'Internal server error',
                });
            }
        });
    }

    router.get(
        '/session',
        authMiddleware.checkIfLogin,
        (req: Request, res: Response) => {
            try {
                const currentSession = req.session;
                return res.json(currentSession);
            } catch (error) {
                logger.error({
                    endpoint: 'Auth GET /session',
                    error: error instanceof Error ? error.message : String(error),
                    trace: error instanceof Error ? error.stack : undefined,
                });
                return res.status(500).json({
                    error: 'Internal server error',
                });
            }
        }
    );

    return router;
}
