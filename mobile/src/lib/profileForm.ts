import type { ChipOption } from "@/components/ui/ChipGroup";
import type { FieldErrors } from "@/lib/formErrors";
import { parseNumber } from "@/lib/formErrors";
import type { ActivityLevel, Gender, GoalType, UpdateProfileInput, UserProfile } from "@/types/models";

// Lựa chọn và quy tắc dùng chung cho tab Cá nhân và màn thiết lập lần đầu

export const GENDER_OPTIONS: ChipOption<Gender>[] = [
  { value: "MALE", label: "Nam" },
  { value: "FEMALE", label: "Nữ" },
  { value: "OTHER", label: "Khác" },
];

export const GOAL_OPTIONS: ChipOption<GoalType>[] = [
  { value: "WEIGHT_LOSS", label: "Giảm cân" },
  { value: "MAINTENANCE", label: "Giữ cân" },
  { value: "MUSCLE_GAIN", label: "Tăng cơ" },
];

export const ACTIVITY_OPTIONS: ChipOption<ActivityLevel>[] = [
  { value: "SEDENTARY", label: "Ít vận động" },
  { value: "LIGHT", label: "Nhẹ (1–3 buổi)" },
  { value: "MODERATE", label: "Vừa (3–5 buổi)" },
  { value: "ACTIVE", label: "Nhiều (6–7 buổi)" },
  { value: "VERY_ACTIVE", label: "Rất nhiều" },
];

// Khớp với giới hạn ở server (schemas/profile.schema.ts)
export const NUMBER_FIELDS = {
  age: { label: "Tuổi", min: 10, max: 120, integer: true, suffix: "tuổi" },
  height: { label: "Chiều cao", min: 50, max: 300, integer: false, suffix: "cm" },
  currentWeight: { label: "Cân nặng hiện tại", min: 20, max: 500, integer: false, suffix: "kg" },
  goalWeight: { label: "Cân nặng mục tiêu", min: 20, max: 500, integer: false, suffix: "kg" },
  trainingDaysPerWeek: { label: "Số buổi tập / tuần", min: 0, max: 7, integer: true, suffix: "buổi" },
  goalRate: { label: "Tốc độ mục tiêu (bỏ trống = mặc định)", min: 0.1, max: 1, integer: false, suffix: "kg/tuần" },
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
      if (required.includes(key)) errors[key] = "Bắt buộc";
    } else if (Number.isNaN(value) || value < rule.min || value > rule.max) {
      errors[key] = `Nhập từ ${rule.min} đến ${rule.max}`;
    } else if (rule.integer && !Number.isInteger(value)) {
      errors[key] = "Phải là số nguyên";
    } else {
      input[key] = value;
    }
  }
  return { input, errors };
}
