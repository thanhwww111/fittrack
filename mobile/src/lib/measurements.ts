import { localeTag , translate as t } from "@/i18n";
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
  { key: "weight", get label() { return t("Cân nặng"); }, get short() { return t("Cân"); }, unit: "kg", min: 20, max: 500, required: true },
  { key: "bodyFat", get label() { return t("Tỉ lệ mỡ"); }, get short() { return t("Mỡ"); }, unit: "%", min: 1, max: 70, required: false },
  { key: "chest", get label() { return t("Vòng ngực"); }, get short() { return t("Ngực"); }, unit: "cm", min: 10, max: 300, required: false },
  { key: "waist", get label() { return t("Vòng eo"); }, short: "Eo", unit: "cm", min: 10, max: 300, required: false },
  { key: "arm", get label() { return t("Vòng tay"); }, short: "Tay", unit: "cm", min: 10, max: 300, required: false },
  { key: "thigh", get label() { return t("Vòng đùi"); }, get short() { return t("Đùi"); }, unit: "cm", min: 10, max: 300, required: false },
];

const fmt = (n: number) => n.toLocaleString(localeTag(), { maximumFractionDigits: 1 });

// Tóm tắt các số đo phụ đã nhập, ví dụ "Mỡ 18% · Eo 80 cm"
export function measurementSummary(m: BodyMeasurement) {
  const extra = MEASUREMENT_FIELDS.filter((f) => f.key !== "weight" && m[f.key] != null)
    .map((f) => `${f.short} ${fmt(m[f.key]!)}${f.unit === "%" ? "%" : ` ${f.unit}`}`)
    .join(" · ");
  return [m.height != null ? `${t("Chiều cao")} ${fmt(m.height)} cm` : "", extra].filter(Boolean).join(" · ");
}
