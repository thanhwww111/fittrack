import { translate as t } from "@/i18n";
import { ApiError } from "@/api/client";
import { errorMessage } from "./formErrors";

// Thông báo dễ hiểu cho các lỗi riêng của tính năng AI
export function aiErrorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 503) return t("Tính năng AI chưa được bật trên server (thiếu GEMINI_API_KEY).");
    if (err.status === 429) return t("Bạn đã dùng hết 10 lượt AI trong giờ này, thử lại sau nhé.");
    if (err.status === 502) return t("AI đang bận hoặc trả kết quả lỗi, thử lại sau ít phút.");
  }
  return errorMessage(err);
}
