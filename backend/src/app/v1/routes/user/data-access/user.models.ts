import { Schema, model, Types, Document, Model } from 'mongoose';
import { modelString } from '@root/constants';
import { SingleUserModel, UserModel } from './user.model';

const schema = new Schema({
    id: {
        type: Schema.Types.ObjectId,
        default: () => new Types.ObjectId(),
    },
    email: {
        type: String,
        required: true,
    },
    isActive: {
        type: Boolean,
    },
    name: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
});

schema.index({ id: 1 }, { background: true, unique: true });
schema.index({ email: 1 }, { background: true, unique: true });


const userModel = model<SingleUserModel>(modelString.user, schema);
export default userModel;
