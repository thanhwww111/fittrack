import { ApiError } from "@/api/client";

export type FieldErrors<T extends string = string> = Partial<Record<T, string>>;

// Server trả lỗi validate dạng details: [{ path, message }] → map về từng field của form
export function fieldErrorsFrom(err: unknown): FieldErrors {
  if (!(err instanceof ApiError) || !Array.isArray(err.details)) return {};

  const errors: FieldErrors = {};
  for (const item of err.details as { path?: string; message?: string }[]) {
    if (item.path && item.message && !errors[item.path]) {
      errors[item.path] = item.message;
    }
  }
  return errors;
}

// Thông báo lỗi chung dễ hiểu cho người dùng
export function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.message === "Cannot connect to server") {
      return "Không kết nối được server. Kiểm tra Wi-Fi và địa chỉ API.";
    }
    if (err.message === "Request timed out") return "Server phản hồi quá lâu, thử lại sau.";
    return err.message;
  }
  return "Đã có lỗi xảy ra, thử lại sau.";
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string) {
  if (!email.trim()) return "Vui lòng nhập email";
  if (!EMAIL_REGEX.test(email.trim())) return "Email không hợp lệ";
  return undefined;
}

// Khớp với rule ở server: 8–72 ký tự
export function validatePassword(password: string) {
  if (password.length < 8) return "Mật khẩu tối thiểu 8 ký tự";
  if (password.length > 72) return "Mật khẩu tối đa 72 ký tự";
  return undefined;
}

// Chuỗi rỗng → null (chưa nhập), chuỗi không phải số → NaN
export function parseNumber(value: string) {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  return Number(trimmed);
}
