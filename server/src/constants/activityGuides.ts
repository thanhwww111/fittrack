// Conservative session structure, not an exercise prescription. Sources and limits:
// https://www.nhs.uk/live-well/exercise/walking-for-health/
// https://www.nccih.nih.gov/health/yoga-effectiveness-and-safety
export function activitySteps(sport: 'YOGA' | 'WALKING', minutes: number) {
  const warmup = Math.max(2, Math.round(minutes * .15));
  const cooldown = warmup;
  return sport === 'WALKING' ? [
    { vi: 'Đi chậm để khởi động', en: 'Start with an easy walk', minutes: warmup },
    { vi: 'Đi bộ ở nhịp thoải mái, chọn đường bằng phẳng', en: 'Walk at a comfortable pace on a level route', minutes: minutes - warmup - cooldown },
    { vi: 'Đi chậm dần và nghỉ', en: 'Slow down and rest', minutes: cooldown },
  ] : [
    { vi: 'Thở tự nhiên và khởi động nhẹ theo hướng dẫn', en: 'Breathe naturally and warm up gently with guidance', minutes: warmup },
    { vi: 'Yoga nhẹ theo lớp hoặc hướng dẫn viên phù hợp trình độ; tránh tư thế gây đau', en: 'Follow a gentle class or instructor suited to your experience; avoid painful poses', minutes: minutes - warmup - cooldown },
    { vi: 'Thả lỏng và nghỉ trong tư thế thoải mái', en: 'Relax and rest in a comfortable position', minutes: cooldown },
  ];
}
