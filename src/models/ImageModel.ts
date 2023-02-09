import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    addDate: { type: Date, required: true },
    file: { type: String, required: true },
    sourceUrl: { type: String, required: true },
    downloadDate: { type: Date, required: true },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model("Image", imageSchema);
