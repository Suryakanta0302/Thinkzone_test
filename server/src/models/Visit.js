import mongoose from 'mongoose';

const visitSchema = new mongoose.Schema({
  clientId: { type: String, required: true, unique: true },
  captureMode: { type: String, enum: ['online', 'offline'], default: 'online', required: true },
  userId: { type: String, required: true },
  udiseCode: { type: String, required: true },
  visitedAt: { type: Date, required: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  districtCode: { type: String, required: true },
  blockCode: { type: String, required: true },
  clusterCode: { type: String, required: true },
  answers: { type: [mongoose.Schema.Types.Mixed], required: true },
}, { timestamps: true });

visitSchema.index({ userId: 1, visitedAt: -1 });
visitSchema.index({ districtCode: 1, year: 1, month: 1, blockCode: 1, udiseCode: 1, userId: 1 });

export default mongoose.model('Visit', visitSchema);
