import { create } from "zustand";
import { ApiError } from "@/api/client";
import {
  sessionApi,
  templateApi,
  type RecordSetInput,
  type RecordSetResult,
  type TemplateInput,
} from "@/api/workoutApi";
import { errorMessage } from "@/lib/formErrors";
import type {
  Exercise,
  NewRecord,
  RecordField,
  SessionExercise,
  WorkoutSession,
  WorkoutTemplate,
} from "@/types/models";

interface PrAlert {
  exerciseName: string;
  improved: RecordField[];
}

interface WorkoutState {
  activeSession: WorkoutSession | null;
  // Bài vừa thêm vào buổi tập nhưng chưa ghi set nào: chỉ nằm ở client,
  // server tự thêm bài vào session khi có set đầu tiên
  pendingExercises: SessionExercise[];
  templates: WorkoutTemplate[];
  prAlert: PrAlert | null;
  lastCompletion: { sessionId: string; newRecords: NewRecord[] } | null;
  isLoading: boolean;
  error: string | null;

  loadActive: () => Promise<WorkoutSession | null>;
  loadTemplates: () => Promise<void>;
  start: (input: { templateId?: string; name?: string }) => Promise<WorkoutSession>;
  addExercise: (exercise: Pick<Exercise, "id" | "name">) => void;
  recordSet: (input: RecordSetInput) => Promise<RecordSetResult>;
  removeSet: (exerciseId: string, setNumber: number) => Promise<void>;
  complete: () => Promise<{ session: WorkoutSession; newRecords: NewRecord[] }>;
  cancel: () => Promise<void>;
  saveTemplate: (id: string | null, input: TemplateInput) => Promise<WorkoutTemplate>;
  deleteTemplate: (id: string) => Promise<void>;
  clearPrAlert: () => void;
  reset: () => void;
}

const initialState = {
  activeSession: null,
  pendingExercises: [],
  templates: [],
  prAlert: null,
  lastCompletion: null,
  isLoading: false,
  error: null,
};

function requireActive(session: WorkoutSession | null) {
  if (!session) throw new Error("Không có buổi tập nào đang diễn ra");
  return session;
}

export const useWorkoutStore = create<WorkoutState>()((set, get) => ({
  ...initialState,

  loadActive: async () => {
    set({ isLoading: true, error: null });
    try {
      const activeSession = await sessionApi.active();
      set((state) => ({
        activeSession,
        // Buổi tập khác (hoặc đã kết thúc) thì bỏ các bài pending cũ
        pendingExercises:
          activeSession && state.activeSession?.id === activeSession.id
            ? state.pendingExercises
            : [],
        isLoading: false,
      }));
      return activeSession;
    } catch (err) {
      set({ isLoading: false, error: errorMessage(err) });
      return null;
    }
  },

  loadTemplates: async () => {
    try {
      set({ templates: await templateApi.list() });
    } catch (err) {
      set({ error: errorMessage(err) });
    }
  },

  start: async (input) => {
    try {
      const session = await sessionApi.start(input);
      set({ activeSession: session, pendingExercises: [], prAlert: null });
      return session;
    } catch (err) {
      // Đang có buổi tập khác: mở lại buổi đó thay vì báo lỗi
      if (err instanceof ApiError && err.status === 409) {
        const active = await get().loadActive();
        if (active) return active;
      }
      throw err;
    }
  },

  addExercise: (exercise) => {
    const { activeSession, pendingExercises } = get();
    const exists =
      activeSession?.exercises.some((e) => e.exerciseId === exercise.id) ||
      pendingExercises.some((e) => e.exerciseId === exercise.id);
    if (exists) return;

    set({
      pendingExercises: [
        ...pendingExercises,
        {
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          targetSets: null,
          targetReps: null,
          sets: [],
        },
      ],
    });
  },

  recordSet: async (input) => {
    const session = requireActive(get().activeSession);
    const result = await sessionApi.recordSet(session.id, input);
    const exerciseName =
      result.session.exercises.find((e) => e.exerciseId === input.exerciseId)?.exerciseName ?? "";

    set((state) => ({
      activeSession: result.session,
      pendingExercises: state.pendingExercises.filter((e) => e.exerciseId !== input.exerciseId),
      prAlert: result.prCheck.isNewRecord
        ? { exerciseName, improved: result.prCheck.improved }
        : state.prAlert,
    }));
    return result;
  },

  removeSet: async (exerciseId, setNumber) => {
    const session = requireActive(get().activeSession);
    set({ activeSession: await sessionApi.removeSet(session.id, exerciseId, setNumber) });
  },

  complete: async () => {
    const session = requireActive(get().activeSession);
    const result = await sessionApi.complete(session.id);
    set({
      activeSession: null,
      pendingExercises: [],
      prAlert: null,
      lastCompletion: { sessionId: result.session.id, newRecords: result.newRecords },
    });
    return result;
  },

  cancel: async () => {
    const session = requireActive(get().activeSession);
    await sessionApi.cancel(session.id);
    set({ activeSession: null, pendingExercises: [], prAlert: null });
  },

  saveTemplate: async (id, input) => {
    const template = id ? await templateApi.update(id, input) : await templateApi.create(input);
    await get().loadTemplates();
    return template;
  },

  deleteTemplate: async (id) => {
    await templateApi.remove(id);
    set((state) => ({ templates: state.templates.filter((t) => t.id !== id) }));
  },

  clearPrAlert: () => set({ prAlert: null }),

  reset: () => set(initialState),
}));
