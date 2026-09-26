import { goalApi } from "@/api/profileApi";
import { useProfileStore } from "@/stores/profileStore";
import type { Macros } from "@/types/models";
import { confirmAction } from "./confirm";

const MACRO_LABELS: { key: keyof Macros; label: string; unit: string }[] = [
  { key: "calories", label: "Calo", unit: "kcal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
];

// Mỗi dòng một macro thay đổi, dạng "Calo: 2594 → 2894 kcal"
export function describeTargetChange(current: Macros, suggested: Macros) {
  return MACRO_LABELS.filter(({ key }) => current[key] !== suggested[key])
    .map(({ key, label, unit }) => `${label}: ${current[key]} → ${suggested[key]} ${unit}`)
    .join("\n");
}

// Gọi sau khi lưu hồ sơ hoặc ghi cân nặng. Chỉ hỏi khi target đang Tự tính và không còn khớp hồ sơ
// (server quyết định). Trả về true nếu user đồng ý và target đã được cập nhật.
export async function promptTargetRecalculation() {
  try {
    const { needed, current, suggested } = await goalApi.recalculation();
    if (!needed || !current || !suggested) return false;

    const ok = await confirmAction({
      title: "Cập nhật mục tiêu dinh dưỡng?",
      message: `Hồ sơ của bạn đã thay đổi, mục tiêu tự tính mới:\n${describeTargetChange(current, suggested)}`,
      confirmText: "Cập nhật",
    });
    if (!ok) return false;

    await useProfileStore.getState().recalculateTarget();
    return true;
  } catch {
    // Việc lưu chính đã thành công, lỗi ở bước gợi ý không nên chặn user
    return false;
  }
}
