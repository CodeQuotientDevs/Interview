import type { FilterQuery, ProjectionType, QueryOptions } from 'mongoose';
import { TokenModel, type Token } from './token.model';

export default class TokenRepository {
    public readonly model = TokenModel;

    async save(token: Partial<Token>) {
        return this.model.create(token);
    }

    async findOne(
        criteria: FilterQuery<Token>,
        projection: ProjectionType<Token> = {},
        options: QueryOptions<Token> = {}
    ) {
        return this.model.findOne(criteria, projection, options);
    }

    async find(
        criteria: FilterQuery<Token>,
        projection: ProjectionType<Token> = {},
        options: QueryOptions<Token> = {}
    ) {
        return this.model.find(criteria, projection, options);
    }

    async deleteOne(criteria: FilterQuery<Token>) {
        return this.model.deleteOne(criteria);
    }
}
