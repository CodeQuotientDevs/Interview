import type {
    FilterQuery,
    ProjectionType,
    QueryOptions,
    UpdateQuery,
    UpdateResult,
} from 'mongoose';
import type { AuthUser, AuthUserModel, CreateAuthUser } from './auth.model';

export default class AuthRepository {
    private readonly model: AuthUserModel;

    constructor(model: AuthUserModel) {
        this.model = model;
    }

    async findOne(
        findObj: FilterQuery<AuthUser>,
        projection?: ProjectionType<AuthUser>,
        options: QueryOptions<AuthUser> = {}
    ) {
        return this.model.findOne(findObj, projection, { ...options, lean: true });
    }

    async save(objToSave: CreateAuthUser) {
        const doc = new this.model(objToSave);
        return doc.save();
    }

    async find(
        findObj: FilterQuery<AuthUser>,
        projection?: ProjectionType<AuthUser>,
        options: QueryOptions<AuthUser> = {}
    ) {
        return this.model.find(findObj, projection, { ...options, lean: true });
    }

    async updateOne(
        findObj: FilterQuery<AuthUser>,
        updateObj: UpdateQuery<AuthUser>,
        options: Record<string, any>= {}
    ): Promise<AuthUser | null> {
        return this.model.findOneAndUpdate(findObj, updateObj, options);
    }
}
