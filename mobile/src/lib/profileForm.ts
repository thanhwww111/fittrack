import { translate as t } from "@/i18n";
import type { ChipOption } from "@/components/ui/ChipGroup";
import type { FieldErrors } from "@/lib/formErrors";
import { parseNumber } from "@/lib/formErrors";
import type { ActivityLevel, Gender, GoalType, UpdateProfileInput, UserProfile } from "@/types/models";

// Lựa chọn và quy tắc dùng chung cho tab Cá nhân và màn thiết lập lần đầu

export const GENDER_OPTIONS: ChipOption<Gender>[] = [
  { value: "MALE", get label() { return t("Nam"); } },
  { value: "FEMALE", get label() { return t("Nữ"); } },
  { value: "OTHER", get label() { return t("Khác"); } },
];

export const GOAL_OPTIONS: ChipOption<GoalType>[] = [
  { value: "WEIGHT_LOSS", get label() { return t("Giảm cân"); } },
  { value: "MAINTENANCE", get label() { return t("Giữ cân"); } },
  { value: "MUSCLE_GAIN", get label() { return t("Tăng cơ"); } },
];

export const ACTIVITY_OPTIONS: ChipOption<ActivityLevel>[] = [
  { value: "SEDENTARY", get label() { return t("Ít vận động"); } },
  { value: "LIGHT", get label() { return t("Nhẹ (1–3 buổi)"); } },
  { value: "MODERATE", get label() { return t("Vừa (3–5 buổi)"); } },
  { value: "ACTIVE", get label() { return t("Nhiều (6–7 buổi)"); } },
  { value: "VERY_ACTIVE", get label() { return t("Rất nhiều"); } },
];

// Khớp với giới hạn ở server (schemas/profile.schema.ts)
export const NUMBER_FIELDS = {
  age: { get label() { return t("Tuổi"); }, min: 10, max: 120, integer: true, get suffix() { return t("tuổi"); } },
  height: { get label() { return t("Chiều cao"); }, min: 50, max: 300, integer: false, suffix: "cm" },
  currentWeight: { get label() { return t("Cân nặng hiện tại"); }, min: 20, max: 500, integer: false, suffix: "kg" },
  goalWeight: { get label() { return t("Cân nặng mục tiêu"); }, min: 20, max: 500, integer: false, suffix: "kg" },
  trainingDaysPerWeek: { get label() { return t("Số buổi tập / tuần"); }, min: 0, max: 7, integer: true, get suffix() { return t("buổi"); } },
  goalRate: { get label() { return t("Tốc độ mục tiêu (bỏ trống = mặc định)"); }, min: 0.1, max: 1, integer: false, get suffix() { return t("kg/tuần"); } },
} as const;

export type NumberField = keyof typeof NUMBER_FIELDS;

// Đủ các trường server cần để tự tính calo / macro (goal.service REQUIRED_PROFILE_FIELDS)
const REQUIRED_FOR_TARGET = [
  "gender",
  "age",
  "height",
  "currentWeight",
  "activityLevel",
  "goalType",
] as const;

export function isProfileComplete(profile: UserProfile) {
  return REQUIRED_FOR_TARGET.every((field) => profile[field] != null);
}

// Đọc các ô số trong `keys`: ô trống bỏ qua (trừ khi nằm trong `required`), sai giới hạn thì báo lỗi
export function parseProfileNumbers(
  values: Partial<Record<NumberField, string>>,
  keys: readonly NumberField[],
  required: readonly NumberField[] = []
) {
  const input: Partial<Pick<UpdateProfileInput, NumberField>> = {};
  const errors: FieldErrors<NumberField> = {};

  for (const key of keys) {
    const rule = NUMBER_FIELDS[key];
    const value = parseNumber(values[key] ?? "");
    if (value === null) {
      if (required.includes(key)) errors[key] = t("Bắt buộc");
    } else if (Number.isNaN(value) || value < rule.min || value > rule.max) {
      errors[key] = t("Nhập từ {value1} đến {value2}", { value1: rule.min, value2: rule.max });
    } else if (rule.integer && !Number.isInteger(value)) {
      errors[key] = t("Phải là số nguyên");
    } else {
      input[key] = value;
    }
  }
  return { input, errors };
}
