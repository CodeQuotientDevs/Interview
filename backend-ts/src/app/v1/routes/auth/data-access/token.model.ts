import { Schema, type HydratedDocument, type Model, model } from 'mongoose';

export interface Token {
    token: string;
    userId: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export type TokenDocument = HydratedDocument<Token>;
export type TokenModel = Model<Token>;

const tokenSchema = new Schema<Token>(
    {
        token: { type: String, required: true, unique: true },
        userId: { type: String, required: true },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

export const TokenModel = model<Token>('Token', tokenSchema);
