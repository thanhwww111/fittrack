import { Schema, model } from "mongoose";

const customMealSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, maxlength: 40 },
  normalizedName: { type: String, required: true },
}, { timestamps: true });
customMealSchema.index({ userId: 1, normalizedName: 1 }, { unique: true });
export const CustomMealModel = model("CustomMeal", customMealSchema);
