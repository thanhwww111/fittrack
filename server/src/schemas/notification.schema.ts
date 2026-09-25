import { z } from "zod";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "time must be HH:mm");

export const updateSettingsSchema = z
  .object({
    workoutReminder: z
      .object({
        enabled: z.boolean(),
        days: z.array(z.number().int().min(0).max(6)).max(7),
        time,
      })
      .partial(),
    mealReminders: z
      .object({ enabled: z.boolean(), breakfast: time, lunch: time, dinner: time })
      .partial(),
    weeklyReport: z.boolean(),
    prAlerts: z.boolean(),
    goalAlerts: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "At least one field is required");

export const registerDeviceSchema = z.object({
  token: z
    .string()
    .regex(/^Expo(nent)?PushToken\[[^\]]+\]$/, "Invalid Expo push token"),
  platform: z.enum(["ios", "android"]),
});

export const unregisterDeviceSchema = registerDeviceSchema.pick({ token: true });

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;
