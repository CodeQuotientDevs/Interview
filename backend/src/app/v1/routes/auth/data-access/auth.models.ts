import { Schema, model, Types } from 'mongoose';
import { modelString, roleNumberFromString } from '@root/constants';
import type { AuthUser } from './auth.model';

const schema = new Schema<AuthUser>(
    {
        id: {
            type: Schema.Types.ObjectId,
            default: () => new Types.ObjectId(),
            required: true,
        },
        orgId: {
            type: Schema.Types.ObjectId,
            default: () => new Types.ObjectId(),
            required: true,
        },
        role: {
            type: Number,
            required: true,
            default: Number(roleNumberFromString.subAdmin) || 0,
        },
        userId: {
            type: String,
            required: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        password: {
            type: String,
        },
        loginType: {
            type: Number,
        },
    },
    {
        timestamps: true,
    }
);

schema.index({ userId: 1 }, { sparse: true });
schema.index({ id: 1 }, { background: true, unique: true });
schema.index({ email: 1 }, { background: true, unique: true });

const AuthModel = model<AuthUser>(modelString.auth, schema);
export default AuthModel;
