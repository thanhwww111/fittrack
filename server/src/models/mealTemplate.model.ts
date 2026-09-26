import { Schema, model, type InferSchemaType } from "mongoose";
import { applyToJSON } from "../utils/toJSON";

const mealTemplateItemSchema = new Schema(
  {
    foodId: { type: Schema.Types.ObjectId, ref: "Food", required: true },
    quantity: { type: Number, required: true, min: 0.01 },
  },
  { _id: false }
);

const mealTemplateSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    items: {
      type: [mealTemplateItemSchema],
      validate: [(v: unknown[]) => v.length > 0, "Meal template needs at least one item"],
    },
  },
  { timestamps: true }
);

mealTemplateSchema.index({ userId: 1 });

applyToJSON(mealTemplateSchema);

export type MealTemplate = InferSchemaType<typeof mealTemplateSchema>;

export const MealTemplateModel = model("MealTemplate", mealTemplateSchema);
