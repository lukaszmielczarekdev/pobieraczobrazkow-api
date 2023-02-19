import mongoose from "mongoose";

const queueTaskSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true },
    imageId: { type: String, required: true },
    addDate: { type: Date, required: true },
  },
  { versionKey: false }
);

export default mongoose.model("QueueTask", queueTaskSchema);
