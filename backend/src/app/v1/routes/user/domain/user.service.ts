import type UserRepository from '../data-access/user.repository';
import type { SingleUserModel as UserDocument } from '../data-access/user.model';

export default class UserService {
    private model: UserRepository;
    constructor(model: UserRepository) {
        this.model = model;
    }

    async createOrFindUser(data: Partial<UserDocument>) {
        return this.model.updateOne({
            email: data.email,
        }, data);
    }

    async getUserMap(ids: Array<string>, projection: Record<string, any>, options: Record<string, any> = {}) {
        const users = await this.model.find({ id: ids }, { ...projection, id: 1 }, { ...options, lean: true });
        const userMap = new Map<string, UserDocument>();
        users.forEach((user) => {
            userMap.set(user.id.toString(), user);
        });
        return userMap;
    }

    async getUserById(id: string) {
        return this.model.findUserById(id, {});
    }

    async updateUserById(id: string, updateData: Record<string, any>) {
        return this.model.updateUserById(id, updateData);
    }
}
