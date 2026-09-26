import { Types } from "mongoose";
import { BodyMeasurementModel } from "../models/bodyMeasurement.model";
import { FoodLogModel } from "../models/foodLog.model";
import { NutritionTargetModel } from "../models/nutritionTarget.model";
import { PersonalRecordModel } from "../models/personalRecord.model";
import { UserProfileModel } from "../models/userProfile.model";
import { WorkoutSessionModel } from "../models/workoutSession.model";
import { MAX_RANGE_DAYS, type DateRangeQuery } from "../schemas/progress.schema";
import { AppError } from "../utils/AppError";
import {
  addDays,
  dateRange,
  daysBetween,
  startOfWeek,
  todayInTimezone,
} from "../utils/date";
import { round1 } from "../utils/foodNutrition";
import {
  actualWeeklyRate,
  goalProgressPercent,
  rateStatus,
  targetWeeklyRate,
  weeklyAverages,
} from "../utils/goalProgress";
import { getUserTimezone } from "./profile.service";

interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// Ăn trong khoảng ±10% target calo được tính là "đúng target"
const CALORIE_TOLERANCE = 0.1;

async function userContext(userId: string) {
  const timezone = await getUserTimezone(userId);
  return { timezone, today: todayInTimezone(timezone) };
}

function resolveRange(query: DateRangeQuery, today: string, defaultDays: number) {
  const to = query.to ?? today;
  const from = query.from ?? addDays(to, -(defaultDays - 1));
  if (daysBetween(from, to) + 1 > MAX_RANGE_DAYS) {
    throw AppError.badRequest(`Date range cannot exceed ${MAX_RANGE_DAYS} days`);
  }
  return { from, to };
}

// Mốc UTC lùi 1 ngày để không sót bản ghi của các múi giờ đi trước UTC;
// sau đó lọc lại chính xác theo ngày địa phương
function utcLowerBound(date: string) {
  return new Date(`${addDays(date, -1)}T00:00:00Z`);
}

// ---------- Weight ----------

async function weightBetween(userId: string, from: string, to: string) {
  const points = await BodyMeasurementModel.find({ userId, date: { $gte: from, $lte: to } })
    .select("date weight -_id")
    .sort({ date: 1 })
    .lean();
  return points.map((p) => ({ date: p.date, weight: p.weight }));
}

export async function getWeightProgress(userId: string, query: DateRangeQuery) {
  const { today } = await userContext(userId);
  const { from, to } = resolveRange(query, today, 90);
  const points = await weightBetween(userId, from, to);

  const start = points[0]?.weight ?? null;
  const current = points.at(-1)?.weight ?? null;
  return {
    from,
    to,
    points,
    summary: {
      start,
      current,
      change: start !== null && current !== null ? round1(current - start) : null,
    },
  };
}

// ---------- Workout ----------

async function completedSessionsBetween(userId: string, timezone: string, from: string, to: string) {
  const sessions = await WorkoutSessionModel.find({
    userId,
    status: "COMPLETED",
    completedAt: { $gte: utcLowerBound(from) },
  })
    .select("completedAt totalVolume duration exercises.sets")
    .lean();

  return sessions
    .map((s) => ({
      date: todayInTimezone(timezone, s.completedAt!),
      totalVolume: s.totalVolume,
      duration: s.duration,
      sets: s.exercises.reduce((n, e) => n + e.sets.length, 0),
    }))
    .filter((s) => s.date >= from && s.date <= to);
}

export async function getWorkoutProgress(userId: string, weeks: number) {
  const { timezone, today } = await userContext(userId);
  const currentWeek = startOfWeek(today);
  const firstWeek = addDays(currentWeek, -7 * (weeks - 1));

  const sessions = await completedSessionsBetween(userId, timezone, firstWeek, today);

  const buckets = Array.from({ length: weeks }, (_, i) => ({
    weekStart: addDays(firstWeek, 7 * i),
    sessions: 0,
    sets: 0,
    totalVolume: 0,
    duration: 0,
  }));
  for (const s of sessions) {
    const bucket = buckets[daysBetween(firstWeek, startOfWeek(s.date)) / 7];
    bucket.sessions += 1;
    bucket.sets += s.sets;
    bucket.totalVolume = round1(bucket.totalVolume + s.totalVolume);
    bucket.duration += s.duration;
  }

  return { weeks: buckets };
}

// ---------- Nutrition ----------

async function nutritionByDay(userId: string, from: string, to: string) {
  const [totals, targets] = await Promise.all([
    FoodLogModel.aggregate<Macros & { _id: string }>([
      { $match: { userId: new Types.ObjectId(userId), date: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: "$date",
          calories: { $sum: "$calories" },
          protein: { $sum: "$protein" },
          carbs: { $sum: "$carbs" },
          fat: { $sum: "$fat" },
        },
      },
    ]),
    NutritionTargetModel.find({ userId, effectiveFrom: { $lte: to } })
      .sort({ effectiveFrom: 1 })
      .lean(),
  ]);

  const byDate = new Map(totals.map((t) => [t._id, t]));

  return dateRange(from, to).map((date) => {
    const t = byDate.get(date);
    // Target áp dụng cho ngày đó = bản ghi có effectiveFrom <= date mới nhất
    const target = targets.filter((x) => x.effectiveFrom <= date).at(-1);
    return {
      date,
      logged: Boolean(t),
      consumed: {
        calories: round1(t?.calories ?? 0),
        protein: round1(t?.protein ?? 0),
        carbs: round1(t?.carbs ?? 0),
        fat: round1(t?.fat ?? 0),
      },
      target: target
        ? { calories: target.calories, protein: target.protein, carbs: target.carbs, fat: target.fat }
        : null,
    };
  });
}

type NutritionDay = Awaited<ReturnType<typeof nutritionByDay>>[number];

const onCalorieTarget = (d: NutritionDay) =>
  d.logged &&
  Math.abs(d.consumed.calories - d.target!.calories) <= d.target!.calories * CALORIE_TOLERANCE;

const proteinGoalMet = (d: NutritionDay) => d.logged && d.consumed.protein >= d.target!.protein;

// Trung bình chỉ tính trên các ngày có log, ngày quên log không kéo trung bình xuống
function summarizeNutrition(days: NutritionDay[]) {
  const logged = days.filter((d) => d.logged);
  const withTarget = logged.filter((d) => d.target);
  const avg = (key: keyof Macros) =>
    logged.length ? round1(logged.reduce((s, d) => s + d.consumed[key], 0) / logged.length) : 0;

  return {
    loggedDays: logged.length,
    averages: {
      calories: avg("calories"),
      protein: avg("protein"),
      carbs: avg("carbs"),
      fat: avg("fat"),
    },
    daysOnCalorieTarget: withTarget.filter(onCalorieTarget).length,
    daysProteinGoalMet: withTarget.filter(proteinGoalMet).length,
  };
}

export async function getNutritionProgress(userId: string, query: DateRangeQuery) {
  const { today } = await userContext(userId);
  const { from, to } = resolveRange(query, today, 7);
  const days = await nutritionByDay(userId, from, to);
  return { from, to, days, summary: summarizeNutrition(days) };
}

// ---------- Weekly summary ----------

async function latestWeightOnOrBefore(userId: string, date: string) {
  const m = await BodyMeasurementModel.findOne({ userId, date: { $lte: date } })
    .sort({ date: -1 })
    .lean();
  return m?.weight ?? null;
}

// Mặc định là tuần hiện tại (thứ Hai → hôm nay). `previousWeek` = tuần trước trọn vẹn,
// dùng cho báo cáo gửi sáng thứ Hai.
function percent(part: number, whole: number | null) {
  return whole ? Math.round((part / whole) * 100) : null;
}

// Tỷ lệ ngày đạt target trên các ngày có target. Ngày không log tính là trượt,
// riêng hôm nay chưa đạt thì chưa tính (ngày còn chưa kết thúc).
function dayAdherence(days: NutritionDay[], today: string, isMet: (d: NutritionDay) => boolean) {
  const counted = days.filter((d) => d.target && (d.date !== today || isMet(d)));
  const met = counted.filter(isMet).length;
  return { met, days: counted.length, percent: percent(met, counted.length) };
}

// Chuỗi dài nhất tính được, đủ cho 1 năm tập đều
const MAX_STREAK_DAYS = 366;

// Số ngày liên tiếp có ghi món hoặc hoàn thành buổi tập, đếm lùi từ hôm nay.
// Hôm nay chưa có gì thì đếm từ hôm qua: chuỗi chưa đứt khi ngày còn chưa kết thúc.
async function activityStreak(userId: string, timezone: string, today: string) {
  const from = addDays(today, -MAX_STREAK_DAYS);
  const [foodDays, sessions] = await Promise.all([
    FoodLogModel.distinct("date", { userId, date: { $gte: from, $lte: today } }),
    completedSessionsBetween(userId, timezone, from, today),
  ]);
  const active = new Set<string>([...foodDays, ...sessions.map((s) => s.date)]);

  let day = active.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (active.has(day)) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

export async function getWeeklySummary(userId: string, { previousWeek = false } = {}) {
  const { timezone, today } = await userContext(userId);
  const weekStart = previousWeek ? addDays(startOfWeek(today), -7) : startOfWeek(today);
  const weekEnd = previousWeek ? addDays(weekStart, 6) : today;

  const [sessions, previousSessions, days, current, baseline, records, profile, streak] = await Promise.all([
    completedSessionsBetween(userId, timezone, weekStart, weekEnd),
    // Cùng khoảng ngày của tuần trước (thứ Hai → cùng thứ), để tuần đang dở không bị so với cả tuần
    completedSessionsBetween(userId, timezone, addDays(weekStart, -7), addDays(weekEnd, -7)),
    nutritionByDay(userId, weekStart, weekEnd),
    latestWeightOnOrBefore(userId, weekEnd),
    // So với lần đo gần nhất trước khi tuần bắt đầu
    latestWeightOnOrBefore(userId, addDays(weekStart, -1)),
    PersonalRecordModel.find({ userId, achievedAt: { $gte: utcLowerBound(weekStart) } })
      .select("achievedAt")
      .lean(),
    UserProfileModel.findOne({ userId }).select("trainingDaysPerWeek").lean(),
    activityStreak(userId, timezone, today),
  ]);

  const totalVolume = round1(sessions.reduce((n, s) => n + s.totalVolume, 0));
  const previousVolume = round1(previousSessions.reduce((n, s) => n + s.totalVolume, 0));
  const targetSessions = profile?.trainingDaysPerWeek || null;

  return {
    weekStart,
    weekEnd,
    today,
    workout: {
      sessions: sessions.length,
      sets: sessions.reduce((n, s) => n + s.sets, 0),
      totalVolume,
      duration: sessions.reduce((n, s) => n + s.duration, 0),
      previousVolume,
      // % thay đổi so với cùng khoảng ngày tuần trước, null khi tuần trước không tập
      volumeChange: previousVolume > 0 ? round1(((totalVolume - previousVolume) / previousVolume) * 100) : null,
    },
    adherence: {
      // So với số buổi/tuần trong hồ sơ, tập dư vẫn tính tối đa 100%
      workout: {
        completed: sessions.length,
        target: targetSessions,
        percent: targetSessions ? Math.min(100, percent(sessions.length, targetSessions)!) : null,
      },
      calories: dayAdherence(days, today, onCalorieTarget),
      protein: dayAdherence(days, today, proteinGoalMet),
    },
    nutrition: summarizeNutrition(days),
    weight: {
      current,
      baseline,
      change: current !== null && baseline !== null ? round1(current - baseline) : null,
    },
    newPersonalRecords: records.filter((r) => {
      const day = todayInTimezone(timezone, r.achievedAt);
      return day >= weekStart && day <= weekEnd;
    }).length,
    // Luôn tính đến hôm nay, kể cả khi xem báo cáo tuần trước
    streak,
  };
}

// ---------- Goal ----------

const TREND_WEEKS = 8;
// Tốc độ thực tế lấy từ ~1 tháng gần nhất (tuần này + 4 tuần trước)
const RATE_WEEKS = 5;

export async function getGoalProgress(userId: string) {
  const { today } = await userContext(userId);
  const currentWeek = startOfWeek(today);
  const weekStarts = Array.from({ length: TREND_WEEKS }, (_, i) =>
    addDays(currentWeek, -7 * (TREND_WEEKS - 1 - i))
  );

  const [profile, points, firstMeasurement] = await Promise.all([
    UserProfileModel.findOne({ userId }).lean(),
    weightBetween(userId, weekStarts[0], today),
    BodyMeasurementModel.findOne({ userId }).sort({ date: 1 }).select("weight").lean(),
  ]);

  const weeks = weeklyAverages(points, weekStarts);
  const currentWeight = (await latestWeightOnOrBefore(userId, today)) ?? profile?.currentWeight ?? null;
  const goalType = profile?.goalType ?? null;
  const goalWeight = profile?.goalWeight ?? null;
  // Profile cũ chưa có startWeight: lấy lần cân đầu tiên
  const startWeight = profile?.startWeight ?? firstMeasurement?.weight ?? currentWeight;

  const base = {
    goalType,
    goalWeight,
    startWeight,
    startDate: profile?.goalStartDate ?? null,
    currentWeight,
    weeks,
  };
  if (!goalType) {
    return {
      ...base,
      percent: null,
      remaining: null,
      reached: null,
      targetRate: null,
      actualRate: null,
      status: null,
      estimatedWeeks: null,
    };
  }

  const targetRate = targetWeeklyRate(goalType, profile?.goalRate);
  const actualRate = actualWeeklyRate(weeks.slice(-RATE_WEEKS));
  const hasDistance = goalType !== "MAINTENANCE" && goalWeight !== null && currentWeight !== null;

  const remaining = hasDistance ? round1(Math.abs(goalWeight - currentWeight)) : null;
  const reached = hasDistance
    ? goalType === "MUSCLE_GAIN"
      ? currentWeight >= goalWeight
      : currentWeight <= goalWeight
    : null;
  // Ước tính theo tốc độ thực tế, chỉ khi đang đi đúng hướng
  const along = actualRate !== null ? actualRate * Math.sign(targetRate) : 0;
  const estimatedWeeks =
    // Làm tròn trước khi ceil: 5.4 / 0.3 = 18.000000000000004 trong số thực
    remaining !== null && !reached && along > 0
      ? Math.ceil(Math.round((remaining / along) * 100) / 100)
      : null;

  return {
    ...base,
    percent:
      hasDistance && startWeight !== null
        ? goalProgressPercent(startWeight, currentWeight, goalWeight)
        : null,
    remaining,
    reached,
    targetRate,
    actualRate,
    status: rateStatus(targetRate, actualRate),
    estimatedWeeks,
  };
}
