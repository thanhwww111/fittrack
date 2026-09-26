// Các lịch tập theo tuần phổ biến, dùng bài tập trong thư viện hệ thống (scripts/seedExercises).
// dayOfWeek: 1 = thứ Hai ... 7 = Chủ nhật. Một buổi có thể lặp lại nhiều ngày (ví dụ Full Body A).

interface PresetExercise {
  name: string; // tên bài trong thư viện hệ thống
  sets: number;
  reps: number;
  rest: number; // giây
}

interface PresetWorkout {
  name: string;
  exercises: PresetExercise[];
}

export interface ProgramPreset {
  key: string;
  name: string;
  description: string;
  schedule: { dayOfWeek: number; workout: string }[];
  workouts: Record<string, PresetWorkout>;
}

const ex = (name: string, sets: number, reps: number, rest: number): PresetExercise => ({
  name,
  sets,
  reps,
  rest,
});

const PUSH: PresetWorkout = {
  name: "Push",
  exercises: [
    ex("Bench Press", 4, 8, 120),
    ex("Overhead Press", 3, 8, 120),
    ex("Incline Dumbbell Press", 3, 10, 90),
    ex("Lateral Raise", 3, 15, 60),
    ex("Triceps Pushdown", 3, 12, 60),
  ],
};

const PULL: PresetWorkout = {
  name: "Pull",
  exercises: [
    ex("Deadlift", 3, 5, 180),
    ex("Pull-up", 3, 8, 120),
    ex("Barbell Row", 3, 8, 120),
    ex("Lat Pulldown", 3, 10, 90),
    ex("Barbell Curl", 3, 10, 60),
    ex("Hammer Curl", 3, 12, 60),
  ],
};

const LEGS: PresetWorkout = {
  name: "Legs",
  exercises: [
    ex("Squat", 4, 6, 180),
    ex("Romanian Deadlift", 3, 8, 120),
    ex("Leg Press", 3, 10, 90),
    ex("Hip Thrust", 3, 10, 90),
    ex("Hanging Leg Raise", 3, 12, 60),
  ],
};

export const PROGRAM_PRESETS: ProgramPreset[] = [
  {
    key: "ppl-3",
    name: "Push / Pull / Legs · 3 buổi",
    description: "Mỗi nhóm cơ 1 lần/tuần, nghỉ xen kẽ. Hợp người mới hoặc lịch bận.",
    schedule: [
      { dayOfWeek: 1, workout: "push" },
      { dayOfWeek: 3, workout: "pull" },
      { dayOfWeek: 5, workout: "legs" },
    ],
    workouts: { push: PUSH, pull: PULL, legs: LEGS },
  },
  {
    key: "upper-lower-4",
    name: "Upper / Lower · 4 buổi",
    description: "Thân trên / thân dưới, mỗi nhóm cơ 2 lần/tuần với 2 biến thể A và B.",
    schedule: [
      { dayOfWeek: 1, workout: "upperA" },
      { dayOfWeek: 2, workout: "lowerA" },
      { dayOfWeek: 4, workout: "upperB" },
      { dayOfWeek: 5, workout: "lowerB" },
    ],
    workouts: {
      upperA: {
        name: "Upper A",
        exercises: [
          ex("Bench Press", 4, 6, 150),
          ex("Barbell Row", 4, 8, 120),
          ex("Overhead Press", 3, 8, 120),
          ex("Lat Pulldown", 3, 10, 90),
          ex("Triceps Pushdown", 3, 12, 60),
          ex("Barbell Curl", 3, 12, 60),
        ],
      },
      lowerA: {
        name: "Lower A",
        exercises: [
          ex("Squat", 4, 6, 180),
          ex("Romanian Deadlift", 3, 8, 120),
          ex("Leg Press", 3, 12, 90),
          ex("Hanging Leg Raise", 3, 12, 60),
        ],
      },
      upperB: {
        name: "Upper B",
        exercises: [
          ex("Incline Dumbbell Press", 4, 10, 90),
          ex("Pull-up", 4, 8, 120),
          ex("Cable Fly", 3, 12, 60),
          ex("Lateral Raise", 3, 15, 60),
          ex("Hammer Curl", 3, 12, 60),
        ],
      },
      lowerB: {
        name: "Lower B",
        exercises: [
          ex("Deadlift", 3, 5, 180),
          ex("Leg Press", 3, 10, 120),
          ex("Hip Thrust", 4, 10, 90),
          ex("Hanging Leg Raise", 3, 15, 60),
        ],
      },
    },
  },
  {
    key: "full-body-3",
    name: "Full Body · 3 buổi",
    description: "Tập toàn thân xen kẽ A / B / A. Ít buổi nhưng mỗi nhóm cơ được kích thích 3 lần.",
    schedule: [
      { dayOfWeek: 1, workout: "a" },
      { dayOfWeek: 3, workout: "b" },
      { dayOfWeek: 5, workout: "a" },
    ],
    workouts: {
      a: {
        name: "Full Body A",
        exercises: [
          ex("Squat", 3, 8, 150),
          ex("Bench Press", 3, 8, 120),
          ex("Barbell Row", 3, 8, 120),
          ex("Lateral Raise", 2, 15, 60),
          ex("Hanging Leg Raise", 2, 12, 60),
        ],
      },
      b: {
        name: "Full Body B",
        exercises: [
          ex("Deadlift", 3, 5, 180),
          ex("Overhead Press", 3, 8, 120),
          ex("Lat Pulldown", 3, 10, 90),
          ex("Hip Thrust", 3, 10, 90),
          ex("Barbell Curl", 2, 12, 60),
        ],
      },
    },
  },
  {
    key: "ppl-6",
    name: "Push / Pull / Legs · 6 buổi",
    description: "PPL lặp 2 lần/tuần, nghỉ Chủ nhật. Cho người đã tập đều và hồi phục tốt.",
    schedule: [
      { dayOfWeek: 1, workout: "push" },
      { dayOfWeek: 2, workout: "pull" },
      { dayOfWeek: 3, workout: "legs" },
      { dayOfWeek: 4, workout: "push" },
      { dayOfWeek: 5, workout: "pull" },
      { dayOfWeek: 6, workout: "legs" },
    ],
    workouts: { push: PUSH, pull: PULL, legs: LEGS },
  },
];

export function findPreset(key: string) {
  return PROGRAM_PRESETS.find((p) => p.key === key);
}
