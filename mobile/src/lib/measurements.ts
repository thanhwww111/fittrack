import type { BodyMeasurement } from "@/types/models";

export type MeasurementField = "weight" | "bodyFat" | "chest" | "waist" | "arm" | "thigh";

// Khớp giới hạn ở server (schemas/progress.schema.ts)
export const MEASUREMENT_FIELDS: {
  key: MeasurementField;
  label: string;
  short: string;
  unit: string;
  min: number;
  max: number;
  required: boolean;
}[] = [
  { key: "weight", label: "Cân nặng", short: "Cân", unit: "kg", min: 20, max: 500, required: true },
  { key: "bodyFat", label: "Tỉ lệ mỡ", short: "Mỡ", unit: "%", min: 1, max: 70, required: false },
  { key: "chest", label: "Vòng ngực", short: "Ngực", unit: "cm", min: 10, max: 300, required: false },
  { key: "waist", label: "Vòng eo", short: "Eo", unit: "cm", min: 10, max: 300, required: false },
  { key: "arm", label: "Vòng tay", short: "Tay", unit: "cm", min: 10, max: 300, required: false },
  { key: "thigh", label: "Vòng đùi", short: "Đùi", unit: "cm", min: 10, max: 300, required: false },
];

const fmt = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 1 });

// Tóm tắt các số đo phụ đã nhập, ví dụ "Mỡ 18% · Eo 80 cm"
export function measurementSummary(m: BodyMeasurement) {
  return MEASUREMENT_FIELDS.filter((f) => f.key !== "weight" && m[f.key] != null)
    .map((f) => `${f.short} ${fmt(m[f.key]!)}${f.unit === "%" ? "%" : ` ${f.unit}`}`)
    .join(" · ");
}
