import type {
    FilterQuery,
    ProjectionType,
    QueryOptions,
    UpdateQuery,
} from 'mongoose';
import type { AuthUser, CreateAuthUser } from '../data-access/auth.model';
import type AuthRepository from '../data-access/auth.repository';

export default class AuthService {
    private readonly repository: AuthRepository;

    constructor(repository: AuthRepository) {
        this.repository = repository;
    }

    findById(id: string, projection: ProjectionType<AuthUser> = {}) {
        return this.repository.findOne({ id } as FilterQuery<AuthUser>, projection);
    }

    createOne(saveObj: CreateAuthUser) {
        return this.repository.save(saveObj);
    }

    findOne(
        criteria: FilterQuery<AuthUser>,
        projection?: ProjectionType<AuthUser>,
        options: QueryOptions<AuthUser> = {}
    ) {
        return this.repository.findOne(criteria, projection, options);
    }

    updateOne(
        objToUpdate: FilterQuery<AuthUser>,
        updateObj: UpdateQuery<AuthUser>,
        options: QueryOptions<AuthUser> = {}
    ) {
        return this.repository.updateOne(objToUpdate, updateObj, options);
    }

    find(
        criteria: FilterQuery<AuthUser>,
        projection?: ProjectionType<AuthUser>,
        options: QueryOptions<AuthUser> = {}
    ) {
        return this.repository.find(criteria, projection, options);
    }
}
