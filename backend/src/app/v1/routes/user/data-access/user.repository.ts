// user.repository.ts
import { Model, Types, ProjectionType, QueryOptions, UpdateQuery, FilterQuery } from 'mongoose';
import { SingleUserModel, UserModel } from './user.model';

type User = SingleUserModel;
export default class UserRepository {
    private model: UserModel;

    constructor(model: UserModel) {
        this.model = model;
    }

    async findUserById(id: string | Types.ObjectId, projection?: ProjectionType<User>) {
        return this.model.findOne({ id }, projection, { lean: true }).exec();
    }

    async findOne(criteria: FilterQuery<User>, projection?: ProjectionType<User>, options: QueryOptions = {}) {
        return this.model.findOne(criteria, projection, { ...options, lean: true }).exec();
    }

    async find(criteria: FilterQuery<User>, projection?: ProjectionType<User>, options: QueryOptions = {}) {
        return this.model.find(criteria, projection, { ...options, lean: true }).exec();
    }

    async updateOne(
        criteria: FilterQuery<User>,
        updateObj: Partial<User> & { email?: string; name?: string; phone?: string },
        options: QueryOptions = {}
    ) {
        const setObj: Record<string, any> = {};
        if (updateObj.name) setObj.name = updateObj.name;
        if (updateObj.phone) setObj.phone = updateObj.phone;

        const setOnInsert = {
            id: new Types.ObjectId(),
            ...(updateObj.email && { email: updateObj.email }),
        };

        return this.model.findOneAndUpdate(
            criteria,
            { $set: setObj, $setOnInsert: setOnInsert },
            { ...options, new: true, upsert: true, lean: true }
        ).exec();
    }

    async createUser(userData: Partial<User>) {
        return this.model.create({ ...userData, isActive: true });
    }

    async updateUserById(id: string | Types.ObjectId, updateObj: UpdateQuery<User>) {
        return this.model.findOneAndUpdate({ id }, updateObj, { new: true, lean: true }).exec();
    }
}
