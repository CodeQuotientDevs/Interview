import AuthRepository from './data-access/auth.repository';
import AuthService from './domain/auth.service';
import authModel from './data-access/auth.models';
import { createAuthRouter } from './entry-points/auth.router';

const authService = new AuthService(new AuthRepository(authModel));
export const authRouter = createAuthRouter({
    authService,
});

export default {
    authRouter,
};
