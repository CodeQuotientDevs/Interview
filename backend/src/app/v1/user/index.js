const model = require('./data-access/user.models');
const UserRepo = require('./data-access/user.repository');
const UserServices = require('./domain/user.service');

const userRepo = new UserRepo(model);
const userServices = new UserServices(userRepo);

module.exports = {
    userServices,
}