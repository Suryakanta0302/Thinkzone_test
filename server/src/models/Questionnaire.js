import mongoose from 'mongoose';

const questionnaireSchema = new mongoose.Schema({
  year: { type: Number, required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  title: { type: String, required: true },
  questions: { type: [mongoose.Schema.Types.Mixed], required: true },
}, { timestamps: true });

questionnaireSchema.index({ year: 1, month: 1 }, { unique: true });

export default mongoose.model('Questionnaire', questionnaireSchema);
