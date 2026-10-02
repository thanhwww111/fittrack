import type { WorkoutSession } from "@/types/models";
import { ScheduledWorkoutCard } from "./ScheduledWorkoutCard";
export function TodayWorkoutCard(_props: { active: WorkoutSession | null; completed: WorkoutSession[] }) {
  return <ScheduledWorkoutCard />;
}