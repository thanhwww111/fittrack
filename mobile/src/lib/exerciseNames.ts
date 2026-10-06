// Explanatory Vietnamese names for the seeded library. Canonical names/IDs stay unchanged.
export const EXERCISE_NOTES: Record<string, string> = {
  "Bench Press": "Đẩy ngực với tạ đòn trên ghế ngang",
  "Incline Dumbbell Press": "Đẩy ngực với tạ đơn trên ghế dốc lên",
  "Cable Fly": "Ép ngực với dây cáp",
  "Push-up": "Chống đẩy (hít đất)",
  "Deadlift": "Nâng tạ đòn từ sàn",
  "Barbell Row": "Gập người kéo tạ đòn",
  "Pull-up": "Hít xà đơn",
  "Lat Pulldown": "Kéo xô với cáp",
  "Overhead Press": "Đẩy tạ đòn qua đầu",
  "Lateral Raise": "Nâng tạ đơn sang hai bên vai",
  "Barbell Curl": "Cuốn tạ đòn tập tay trước",
  "Hammer Curl": "Cuốn tạ đơn kiểu búa",
  "Triceps Pushdown": "Duỗi tay sau với cáp",
  "Squat": "Ngồi xổm với tạ đòn",
  "Romanian Deadlift": "Gập hông nâng tạ đòn kiểu Romania",
  "Leg Press": "Đạp đùi trên máy",
  "Hip Thrust": "Đẩy hông với tạ đòn",
  "Hanging Leg Raise": "Treo xà nâng chân tập bụng",
};
export function exerciseNote(name: string, isCustom = false) {
  return !isCustom && Object.hasOwn(EXERCISE_NOTES, name) ? EXERCISE_NOTES[name] : null;
}
const fold = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
export function matchesExercise(exercise: { name: string; isCustom?: boolean }, query: string) {
  const text = `${exercise.name} ${exerciseNote(exercise.name, exercise.isCustom) ?? ""}`;
  return fold(text).includes(fold(query.trim()));
}
