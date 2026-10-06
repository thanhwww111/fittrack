import { localeTag , translate as t } from "@/i18n";
import type { Macros, MealReminder } from "@/types/models";

export interface NutritionReminder {
  id: string; // duy nhất theo ngày + giờ, ví dụ "meal-2026-09-26-1530"
  date: Date;
  title: string;
  body: string;
}

interface BuildInput {
  now: Date;
  target: Macros | null; // mục tiêu hôm nay, null = chưa đặt mục tiêu
  consumed: Macros; // đã ăn hôm nay
  items: MealReminder[]; // các lần nhắc user tự đặt, giờ "HH:MM" theo giờ máy
  days: number; // số ngày đặt trước, tính cả hôm nay
}

// Khớp giới hạn ở server (schemas/notification.schema.ts)
export const MAX_MEAL_REMINDERS = 8;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

// Giờ gợi ý cho lần nhắc mới: bữa phụ chiều, nếu đã có thì giờ tròn trống đầu tiên từ 6h
export function nextFreeReminderTime(items: MealReminder[]) {
  const used = new Set(items.map((i) => i.time));
  if (!used.has("15:30")) return "15:30";
  for (let hour = 6; hour < 24; hour += 1) {
    const time = `${String(hour).padStart(2, "0")}:00`;
    if (!used.has(time)) return time;
  }
  return "21:30";
}

// Lỗi đầu tiên của danh sách (null = hợp lệ), cùng quy tắc với server
export function validateMealReminders(items: MealReminder[]) {
  if (items.length > MAX_MEAL_REMINDERS) return t("Tối đa {value1} lần nhắc.", { value1: MAX_MEAL_REMINDERS });
  if (items.some((i) => !TIME_REGEX.test(i.time))) return t("Giờ phải có dạng HH:mm, ví dụ 07:00.");
  if (items.some((i) => !i.label.trim())) return t("Đặt tên cho từng lần nhắc.");
  if (new Set(items.map((i) => i.time)).size !== items.length) return t("Hai lần nhắc không được trùng giờ.");
  return null;
}

// Biểu tượng + câu gợi ý theo khung giờ, vì tên lần nhắc do user tự đặt
function styleFor(hour: number) {
  if (hour < 10) return { emoji: "☀️", tip: t("Bắt đầu bằng bữa sáng giàu protein nhé!") };
  if (hour < 15) return { emoji: "🍱", tip: t("Nạp bữa trưa đủ chất nhé!") };
  if (hour < 17) return { emoji: "🍎", tip: t("Một bữa phụ nhỏ giúp bạn đủ chất nhé!") };
  return { emoji: "🌙", tip: t("Ăn bữa tối để bù phần còn thiếu nhé!") };
}

const fmt = (n: number) => Math.round(n).toLocaleString(localeTag());

function dateKey(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Câu "còn thiếu" hoặc null khi đã đủ cả calo lẫn protein
function missingText(target: Macros, consumed: Macros) {
  const calories = target.calories - consumed.calories;
  const protein = target.protein - consumed.protein;
  if (calories <= 0 && protein <= 0) return null;
  if (calories <= 0) return t("Đã đủ calo, còn thiếu {value1} g protein", { value1: fmt(protein) });
  if (protein <= 0) return t("Còn thiếu {value1} kcal, protein đã đủ 💪", { value1: fmt(calories) });
  return t("Còn thiếu {value1} kcal · {value2} g protein hôm nay", { value1: fmt(calories), value2: fmt(protein) });
}

// Lịch nhắc nạp dinh dưỡng cho hôm nay và các ngày tới. Nội dung thông báo cục bộ bị cố định lúc
// đặt lịch, nên app gọi lại hàm này mỗi khi số liệu hôm nay đổi. Ngày sau chưa ghi gì → thiếu đủ mục tiêu.
export function buildNutritionReminders({ now, target, consumed, items, days }: BuildInput) {
  const empty: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const reminders: NutritionReminder[] = [];

  for (let offset = 0; offset < days; offset += 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const eaten = offset === 0 ? consumed : empty;

    for (const item of items) {
      const [hour, minute] = item.time.split(":").map(Number);
      const date = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute);
      if (date <= now) continue;

      const id = `meal-${dateKey(day)}-${item.time.replace(":", "")}`;
      if (!target) {
        reminders.push({
          id,
          date,
          title: t("🍽️ Đừng quên ghi bữa ăn"),
          body: t("Ghi lại {value1} để theo dõi calo và protein.", { value1: item.label.toLowerCase() }),
        });
        continue;
      }

      const missing = missingText(target, eaten);
      // Đã đủ thì không làm phiền nữa trong ngày
      if (!missing) continue;
      const { emoji, tip } = styleFor(hour);
      reminders.push({ id, date, title: `${emoji} ${item.label}`, body: `${missing}. ${tip}` });
    }
  }
  return reminders.sort((a, b) => a.date.getTime() - b.date.getTime());
}
