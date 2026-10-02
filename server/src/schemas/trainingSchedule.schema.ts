import { z } from "zod";
export const applyTrainingScheduleSchema = z.object({
  programId: z.string().regex(/^[a-f\d]{24}$/i),
  requestId: z.string().trim().min(1).max(128),
});
