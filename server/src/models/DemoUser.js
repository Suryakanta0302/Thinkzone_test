import mongoose from 'mongoose';

const demoUserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  userName: { type: String, required: true },
  role: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('DemoUser', demoUserSchema);
