import userModel from './data-access/user.models';
import UserRepository from './data-access/user.repository';
import UserService from './domain/user.service';

const userRepo = new UserRepository(userModel);
const userServices = new UserService(userRepo);

export { userServices };