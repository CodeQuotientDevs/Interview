const AuthRepo = require('./data-access/auth.repository');
const AuthServices = require('./domain/auth.service');
const { createAuthRouter } = require('./entry-points/auth.router');

const authModel = require('./data-access/auth.models');

const authResponseService = new AuthServices(new AuthRepo(authModel));
const authRouter = createAuthRouter({
    authService: authResponseService,
})

module.exports = {
    authRouter,
}