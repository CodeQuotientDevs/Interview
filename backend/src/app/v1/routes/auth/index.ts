import AuthRepository from './data-access/auth.repository';
import AuthService from './domain/auth.service';
import authModel from './data-access/auth.models';
import TokenRepository from './data-access/token.repository';
import TokenService from './domain/token.service';
import { createAuthRouter } from './entry-points/auth.router';

export const authService = new AuthService(new AuthRepository(authModel));
const tokenService = new TokenService(new TokenRepository());

export const authRouter = createAuthRouter({
    authService,
    tokenService,
});

export default {
    authRouter,
};