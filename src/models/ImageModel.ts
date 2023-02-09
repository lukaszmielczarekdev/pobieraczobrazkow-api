import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    addDate: { type: String, required: true },
    file: { type: String, required: true },
    sourceUrl: { type: String, required: true },
    downloadDate: { type: String, required: true },
  },
  { versionKey: false }
);

export default mongoose.model("Image", imageSchema);
