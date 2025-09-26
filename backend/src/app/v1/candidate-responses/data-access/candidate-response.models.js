const { Schema, model, default: mongoose } = require('mongoose');
const { modelString } = require('@/constants');

/** @type { Schema< import('./candidate-response.model').CandidateChat > }  */
const schema = Schema({
    id: {
        type: Schema.ObjectId,
        default: () => new mongoose.Types.ObjectId(),
        required: true,
    },
    attemptId: {
        type: Schema.ObjectId,
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

module.exports = model(modelString.interviewAttemptMessage, schema);
