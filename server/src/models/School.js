import mongoose from 'mongoose';

const schoolSchema = new mongoose.Schema({
  districtCode: { type: String, index: true },
  districtName: String,
  blockCode: { type: String, index: true },
  blockName: String,
  clusterCode: { type: String, index: true },
  clusterName: String,
  udiseCode: { type: String, required: true, unique: true },
  schoolName: { type: String, required: true },
  schoolType: String,
  management: String,
  category: String,
  classFrom: String,
  classTo: String,
  address: String,
}, { timestamps: true });

schoolSchema.index({ districtCode: 1, blockCode: 1, clusterCode: 1 });
schoolSchema.index({ schoolName: 1 });

export default mongoose.model('School', schoolSchema);
