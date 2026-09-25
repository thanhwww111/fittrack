import { round1 } from "./foodNutrition";

export interface SetLike {
  weight: number;
  reps: number;
  completed?: boolean | null;
}

export interface RecordValues {
  maxWeight: number;
  maxReps: number;
  estimatedOneRepMax: number;
}

export type RecordField = keyof RecordValues;

const isCompleted = (set: SetLike) => set.completed !== false;

// Volume = Σ weight × reps của các set đã hoàn thành
export function calculateVolume(sets: SetLike[]) {
  return round1(sets.filter(isCompleted).reduce((sum, s) => sum + s.weight * s.reps, 0));
}

// Công thức Epley. 1 rep thì 1RM chính là mức tạ đó.
export function calculateEstimated1RM(weight: number, reps: number) {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return round1(weight);
  return round1(weight * (1 + reps / 30));
}

// Giá trị tốt nhất trong một nhóm set
export function bestOfSets(sets: SetLike[]): RecordValues {
  const done = sets.filter(isCompleted);
  return {
    maxWeight: Math.max(0, ...done.map((s) => s.weight)),
    maxReps: Math.max(0, ...done.map((s) => s.reps)),
    estimatedOneRepMax: Math.max(0, ...done.map((s) => calculateEstimated1RM(s.weight, s.reps))),
  };
}

// So sánh các set mới với PR hiện có. `previous` = null nghĩa là lần đầu tập bài này.
export function detectPR(previous: RecordValues | null, sets: SetLike[]) {
  const best = bestOfSets(sets);
  const hasData = best.maxReps > 0;

  const fields: RecordField[] = ["maxWeight", "maxReps", "estimatedOneRepMax"];
  const improved = hasData
    ? fields.filter((f) => (previous ? best[f] > previous[f] : best[f] > 0))
    : [];

  const record: RecordValues = previous
    ? {
        maxWeight: Math.max(previous.maxWeight, best.maxWeight),
        maxReps: Math.max(previous.maxReps, best.maxReps),
        estimatedOneRepMax: Math.max(previous.estimatedOneRepMax, best.estimatedOneRepMax),
      }
    : best;

  return { isNewRecord: improved.length > 0, improved, record };
}
