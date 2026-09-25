import type { ApiSuccess } from "@/types/api";
import type {
  Equipment,
  Exercise,
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
};

export const sessionApi = {
  start: (input: { templateId?: string; name?: string }) =>
    unwrap(api.post<ApiSuccess<WorkoutSession>>("/workout-sessions", input)),

  active: () => unwrap(api.get<ApiSuccess<WorkoutSession | null>>("/workout-sessions/active")),

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

  personalRecords: () => unwrap(api.get<ApiSuccess<PersonalRecord[]>>("/personal-records")),
};
