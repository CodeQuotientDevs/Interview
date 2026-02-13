import type { HydratedDocument, Model, Types } from 'mongoose';

export interface AuthUser {
    id: Types.ObjectId;
    orgId: Types.ObjectId;
    role: number;
    userId?: string;
    isActive: boolean;
    name: string;
    email: string;
    password?: string;
    loginType?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export type AuthUserDocument = HydratedDocument<AuthUser>;
export type AuthUserModel = Model<AuthUser>;
export type CreateAuthUser =
    Omit<AuthUser, 'id' | 'orgId' | 'role' | 'isActive'> &
    Partial<Pick<AuthUser, 'id' | 'orgId' | 'role' | 'isActive'>>;
