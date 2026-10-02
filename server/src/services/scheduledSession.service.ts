import { WorkoutSessionModel } from "../models/workoutSession.model";
import { todayInTimezone } from "../utils/date";

export async function expireScheduledSessions(userId: string) {
  const active = await WorkoutSessionModel.find({ userId, status: "IN_PROGRESS", scheduledDate: { $type: "string" } });
  for (const session of active) {
    if (session.scheduledDate! >= todayInTimezone(session.scheduleTimezone!)) continue;
    await WorkoutSessionModel.updateOne(
      { _id: session._id, status: "IN_PROGRESS" },
      { $set: { status: "CANCELLED", expiredAt: new Date() }, $inc: { __v: 1 } }
    );
  }
}
