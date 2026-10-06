import { Schema, model } from 'mongoose';
const generation = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true }, requestId: { type: String, required: true },
  requestStartDate: String, state: { type: String, enum: ['PROCESSING', 'SUCCEEDED', 'FAILED'], required: true },
  attempts: { type: Number, default: 1 }, lockToken: String, leaseUntil: Date, planId: String, error: String, statusCode: Number,
}, { timestamps: true });
generation.index({ userId: 1, requestId: 1 }, { unique: true });
export const PlanGenerationModel = model('PlanGeneration', generation);
