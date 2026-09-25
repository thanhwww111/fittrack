import type { ApiSuccess } from "@/types/api";
import type {
  Equipment,
  Exercise,
  ExerciseHistory,
  MuscleGroup,
  NewRecord,
  Paginated,
  PersonalRecord,
  RecordField,
  TemplateExerciseInput,
  WorkoutSession,
  WorkoutSet,
  WorkoutStatus,
  WorkoutTemplate,
} from "@/types/models";
import { api, unwrap } from "./client";

export interface TemplateInput {
  name: string;
  exercises: TemplateExerciseInput[];
}

export interface RecordSetInput {
  exerciseId: string;
  weight: number;
  reps: number;
  // Bỏ trống = thêm set mới, có giá trị = sửa set đó
  setNumber?: number;
}

export interface RecordSetResult {
  session: WorkoutSession;
  set: WorkoutSet;
  prCheck: { isNewRecord: boolean; improved: RecordField[] };
}

export const exerciseApi = {
  list: (params: { muscleGroup?: MuscleGroup; search?: string }) =>
    unwrap(api.get<ApiSuccess<Exercise[]>>("/exercises", { params })),

  create: (input: { name: string; muscleGroup: MuscleGroup; equipment: Equipment }) =>
    unwrap(api.post<ApiSuccess<Exercise>>("/exercises", input)),

  // Chỉ sửa/xoá được bài tự tạo; xoá bị chặn (409) nếu bài còn nằm trong template
  update: (id: string, input: Partial<Pick<Exercise, "name" | "muscleGroup" | "equipment" | "description">>) =>
    unwrap(api.put<ApiSuccess<Exercise>>(`/exercises/${id}`, input)),

  remove: async (id: string) => {
    await api.delete(`/exercises/${id}`);
  },

  history: (id: string, limit = 20) =>
    unwrap(api.get<ApiSuccess<ExerciseHistory>>(`/exercises/${id}/history`, { params: { limit } })),
};

export const templateApi = {
  list: () => unwrap(api.get<ApiSuccess<WorkoutTemplate[]>>("/workout-templates")),

  get: (id: string) => unwrap(api.get<ApiSuccess<WorkoutTemplate>>(`/workout-templates/${id}`)),

  create: (input: TemplateInput) =>
    unwrap(api.post<ApiSuccess<WorkoutTemplate>>("/workout-templates", input)),

  update: (id: string, input: Partial<TemplateInput>) =>
    unwrap(api.put<ApiSuccess<WorkoutTemplate>>(`/workout-templates/${id}`, input)),

  remove: async (id: string) => {
    await api.delete(`/workout-templates/${id}`);
  },

  duplicate: (id: string) =>
    unwrap(api.post<ApiSuccess<WorkoutTemplate>>(`/workout-templates/${id}/duplicate`)),
};

export const sessionApi = {
  start: (input: { templateId?: string; name?: string }) =>
    unwrap(api.post<ApiSuccess<WorkoutSession>>("/workout-sessions", input)),

  active: () => unwrap(api.get<ApiSuccess<WorkoutSession | null>>("/workout-sessions/active")),

  today: () =>
    unwrap(
      api.get<
        ApiSuccess<{ date: string; active: WorkoutSession | null; completed: WorkoutSession[] }>
      >("/workout-sessions/today")
    ),

  list: (params: { status?: WorkoutStatus; page?: number; limit?: number }) =>
    unwrap(api.get<ApiSuccess<Paginated<WorkoutSession>>>("/workout-sessions", { params })),

  get: (id: string) => unwrap(api.get<ApiSuccess<WorkoutSession>>(`/workout-sessions/${id}`)),

  recordSet: (id: string, input: RecordSetInput) =>
    unwrap(api.post<ApiSuccess<RecordSetResult>>(`/workout-sessions/${id}/sets`, input)),

  removeSet: (id: string, exerciseId: string, setNumber: number) =>
    unwrap(
      api.delete<ApiSuccess<WorkoutSession>>(
        `/workout-sessions/${id}/exercises/${exerciseId}/sets/${setNumber}`
      )
    ),

  complete: (id: string) =>
    unwrap(
      api.post<ApiSuccess<{ session: WorkoutSession; newRecords: NewRecord[] }>>(
        `/workout-sessions/${id}/complete`
      )
    ),

  cancel: (id: string) =>
    unwrap(api.post<ApiSuccess<WorkoutSession>>(`/workout-sessions/${id}/cancel`)),

  // Đổi tên / ghi chú, dùng được cả khi đang tập và sau khi hoàn thành
  update: (id: string, input: { name?: string; notes?: string }) =>
    unwrap(api.patch<ApiSuccess<WorkoutSession>>(`/workout-sessions/${id}`, input)),

  // Chỉ xoá buổi đã hoàn thành / đã huỷ; server tính lại PR
  remove: async (id: string) => {
    await api.delete(`/workout-sessions/${id}`);
  },

  personalRecords: () => unwrap(api.get<ApiSuccess<PersonalRecord[]>>("/personal-records")),
};
