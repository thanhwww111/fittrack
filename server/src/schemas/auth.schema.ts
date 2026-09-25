import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email("Invalid email"));

// bcrypt chỉ dùng 72 byte đầu nên giới hạn độ dài để tránh hiểu nhầm
const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters");

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required"),
});

// Ảnh đại diện nhỏ (app đã thu về 256px) lưu thẳng trong DB dạng data URI, không cần dịch vụ lưu file.
// ~200 KB base64 là quá đủ cho ảnh 256×256 JPEG.
const MAX_AVATAR_LENGTH = 200_000;
const avatar = z
  .string()
  .max(MAX_AVATAR_LENGTH, "Avatar image is too large")
  .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/, "Avatar must be a base64 image");

export const updateMeSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    // null = gỡ ảnh đại diện
    avatar: avatar.nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "At least one field is required");

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, "Current password is required"), newPassword: password })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: "New password must be different from the current one",
    path: ["newPassword"],
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  email,
  code: z.string().trim().regex(/^\d{6}$/, "Code must be 6 digits"),
  newPassword: password,
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
