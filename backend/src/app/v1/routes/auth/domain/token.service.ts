import type TokenRepository from '../data-access/token.repository';
// Using crypto for a simple unique token generation, or we can use uuid
import { randomUUID } from 'crypto';

export default class TokenService {
    private readonly repository: TokenRepository;

    constructor(repository: TokenRepository) {
        this.repository = repository;
    }

    async generateToken(userId: string) {
        const token = randomUUID();
        return this.repository.save({
            token,
            userId,
            isActive: true,
        });
    }

    async getTokens(userId: string) {
        return this.repository.find({ userId, isActive: true });
    }

    async deleteToken(token: string, userId: string) {
        // Enforce ownership by deleting only if token matches AND userId matches
        return this.repository.deleteOne({ token, userId });
    }
    
    async validateToken(token: string) {
         return this.repository.findOne({ token, isActive: true });
    }
}
