import { Schema, model, Document, Model, Types } from 'mongoose';
import { modelString } from '@root/constants';

export interface CandidateChat extends Document {
    id: Types.ObjectId;
    attemptId: Types.ObjectId;
    messages: string[];
    createdAt?: Date;
    updatedAt?: Date;
}

const schema = new Schema<CandidateChat>({
    id: {
        type: Schema.Types.ObjectId,
        default: () => new Types.ObjectId(),
        required: true,
    },
    attemptId: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    messages: [{
        type: String,
    }],
}, {
    timestamps: true,
});

schema.index({ id: 1 }, { background: true, unique: true });
schema.index({ id: 1, attemptId: 1 }, { background: true, unique: true });

export const CandidateResponseModel: Model<CandidateChat> = model<CandidateChat>(modelString.interviewAttemptMessage, schema);
