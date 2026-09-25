import type { Schema } from "mongoose";

// Chuẩn hoá JSON trả về client: `_id` → `id`, bỏ `__v`
export function applyToJSON(schema: Schema, hiddenFields: string[] = []) {
  schema.set("toJSON", {
    transform: (_doc, ret: Record<string, unknown>) => {
      ret.id = String(ret._id);
      delete ret._id;
      delete ret.__v;
      for (const field of hiddenFields) delete ret[field];
      return ret;
    },
  });
}
