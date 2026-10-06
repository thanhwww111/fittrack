import { CoachPushJobModel, CoachSettingsModel } from '../models/coach.model';
import { PushDeviceModel } from '../models/pushDevice.model';
import { coachPushClient, type CoachTicket } from './push/coachPushClient';
import { facts, settings, claimBudget } from './coach.service';
import { localClock, pushAllowed } from './coachPolicy';
import { startOfWeek } from '../utils/date';
import { AppError } from '../utils/AppError';
import { activityReminder } from './coachReminder';
type Event = { key: string; kind: string; date: string; planId?: string; activityId?: string };
function events(f: Awaited<ReturnType<typeof facts>>, now: Date): Event[] {
  const time = localClock(now, f.timezone).time;
  const mins = (v: string) => Number(v.slice(0,2)) * 60 + Number(v.slice(3));
  const list: Event[] = [];
  const activity = f.plan?.days.find(d => d.date === f.today)?.activity;
  if (activity && f.plan) {
    const base = { date: f.today, planId: f.plan._id.toString(), activityId: activity.id };
    const log = f.activityLogs.find(l => l.planId === base.planId && l.activityId === activity.id);
    const key = `${base.planId}:${activity.id}`;
    if (log?.status === 'COMPLETED') list.push({ ...base, kind: 'COMPLETE', key: `COMPLETE:${key}` });
    else if (!log) {
      const delta = mins(time) - mins(activity.time);
      if (delta >= -30 && delta <= 0) list.push({ ...base, kind: 'BEFORE', key: `BEFORE:${key}` });
      if (delta >= activity.plannedMinutes + 60) list.push({ ...base, kind: 'OVERDUE', key: `OVERDUE:${key}` });
    }
  }
  if (new Date(`${f.today}T00:00:00Z`).getUTCDay() === 1 && time >= '18:00') list.push({ date: f.today, key: `WEEKLY:${startOfWeek(f.today)}`, kind: 'WEEKLY' });
  if (time >= '09:00') list.push({ date: f.today, key: `DAILY:${f.today}`, kind: 'DAILY' });
  return list;
}
async function enqueue(userId: string, event: Event, now: Date) {
  try { await CoachPushJobModel.updateOne({ userId, key: event.key }, { $setOnInsert: { ...event, dueAt: now, expiresAt: new Date(now.getTime() + (event.kind === 'BEFORE' ? 30 : 12 * 60) * 60000), state: 'PENDING' } }, { upsert: true }); } catch (e) { if ((e as { code?: number }).code !== 11000) throw e; }
}
function body(kind: string, language: string, hasPlan: boolean, tone: string) {
  if (tone === 'FIRM') {
    if (language === 'en') return ({ BEFORE: 'Time to prepare for your activity. Set a comfortable pace and begin when ready.', OVERDUE: 'Confirm your activity today: log it if completed, or tell your PT what needs adjusting.', COMPLETE: 'Activity recorded. Recover now and report how the session felt.', WEEKLY: 'Review your week with your PT and choose an achievable next plan.', DAILY: hasPlan ? 'Check today’s plan and record your energy. Pick one achievable next step.' : 'Record your energy with your PT and choose one achievable movement or recovery step.' } as Record<string,string>)[kind];
    return ({ BEFORE: 'Chuẩn bị cho buổi vận động. Chọn nhịp độ phù hợp và bắt đầu khi sẵn sàng.', OVERDUE: 'Xác nhận vận động hôm nay: ghi lại nếu đã tập, hoặc báo PT điều cần điều chỉnh.', COMPLETE: 'Đã ghi nhận buổi tập. Nghỉ hồi phục và báo PT cảm nhận của bạn.', WEEKLY: 'Tổng kết tuần với PT và chọn kế hoạch tiếp theo phù hợp khả năng.', DAILY: hasPlan ? 'Xem kế hoạch hôm nay và ghi mức năng lượng. Chọn một bước phù hợp để thực hiện.' : 'Ghi mức năng lượng với PT và chọn một bước vận động hoặc hồi phục phù hợp.' } as Record<string,string>)[kind];
  }
  if (language === 'en') return ({ BEFORE: 'Your activity starts soon. Choose a comfortable pace and check how you feel.', OVERDUE: 'Your activity is unconfirmed. Completed it? Add a log, or adjust today with your PT.', COMPLETE: 'Activity recorded. Take time to recover and tell your PT how it felt.', WEEKLY: 'Your weekly PT review is ready to request. Review your week and propose the next plan.', DAILY: hasPlan ? 'Check your plan and share your energy with your PT today.' : 'Share your energy with your PT. A short comfortable walk or recovery break can be a starting point.' } as Record<string,string>)[kind];
  return ({ BEFORE: 'Sắp đến giờ vận động. Chọn nhịp độ thoải mái và lắng nghe cơ thể.', OVERDUE: 'Buổi vận động chưa được xác nhận. Nếu đã tập, hãy ghi lại; hoặc cùng PT điều chỉnh hôm nay.', COMPLETE: 'Đã ghi nhận vận động. Hãy nghỉ hồi phục và chia sẻ cảm nhận với PT.', WEEKLY: 'Hãy yêu cầu PT tổng kết tuần và đề xuất kế hoạch tiếp theo.', DAILY: hasPlan ? 'Xem kế hoạch và chia sẻ mức năng lượng hôm nay với PT.' : 'Chia sẻ năng lượng với PT. Có thể bắt đầu bằng đi bộ nhẹ hoặc nghỉ hồi phục.' } as Record<string,string>)[kind];
}
async function receipts(now: Date) {
  const jobs = await CoachPushJobModel.find({ state: { $in: ['ACCEPTED', 'RETRY'] }, acceptedAt: { $lte: new Date(now.getTime() - 15 * 60000), $gte: new Date(now.getTime() - 24 * 3600000) }, $or: [{ receiptCheckedAt: { $exists: false } }, { receiptCheckedAt: { $lte: new Date(now.getTime() - 15 * 60000) } }] }).limit(100);
  for (const job of jobs) {
    const tickets = job.tickets as CoachTicket[];
    const pending = tickets.filter(t => t.status === 'accepted' && t.ticketId && !(t as CoachTicket & { receipt?: string }).receipt);
    if (!pending.length) continue;
    try {
      const received = await coachPushClient.receipts(pending.map(t => t.ticketId!));
      let transient = false;
      for (const t of tickets) {
        const r = t.ticketId && received[t.ticketId];
        if (!r) continue;
        Object.assign(t, { receipt: r.status === 'ok' ? 'OK' : 'ERROR', receiptError: r.status === 'error' ? r.details?.error : undefined });
        if (r.status === 'error' && r.details?.error === 'MessageRateExceeded' && job.attempt < 5 && job.expiresAt && job.expiresAt > now) { t.status = 'transient'; transient = true; }
        if (r.status === 'error' && r.details?.error === 'DeviceNotRegistered') await PushDeviceModel.deleteOne({ userId: job.userId, token: t.token });
      }
      const allDone = tickets.filter(t => t.status === 'accepted').every(t => (t as CoachTicket & { receipt?: string }).receipt);
      const hasOK = tickets.some(t => (t as CoachTicket & { receipt?: string }).receipt === 'OK');
      // A receipt poll must not overwrite a job claimed/sent by another tick.
      await CoachPushJobModel.updateOne({ _id: job._id, state: job.state, acceptedAt: job.acceptedAt }, { $set: { tickets, receiptCheckedAt: now, ...(transient ? { state: 'RETRY', dueAt: now } : allDone && job.state === 'ACCEPTED' ? { state: hasOK ? 'RECEIPT_OK' : 'RECEIPT_ERROR' } : {}) } });
    } catch { /* Provider receipt outages are retried on the next tick. */ }
  }
}
export async function coachTick(now = new Date()) {
  await receipts(now);
  let userErrors = 0;
  // Cursor iteration avoids a permanent first-500-user starvation boundary.
  for await (const s of CoachSettingsModel.find({ enabled: true }).select('userId').cursor()) {
    const userId = s.userId.toString();
    try {
      const [f, preference] = await Promise.all([facts(userId, now), settings(userId)]);
      if (!pushAllowed(preference, now, f.timezone)) continue;
      for (const event of events(f, now)) await enqueue(userId, event, now);
    } catch { userErrors++; }
  }
  let processed = 0;
  // Atomic leases prevent concurrent scheduler runs from claiming the same job.
  for (let i = 0; i < 100; i++) {
    const job = await CoachPushJobModel.findOneAndUpdate({ expiresAt: { $gt: now }, dueAt: { $lte: now }, $or: [{ state: { $in: ['PENDING', 'RETRY'] } }, { state: 'SENDING', leaseUntil: { $lt: now } }] }, { $set: { state: 'SENDING', leaseUntil: new Date(now.getTime() + 5 * 60000) }, $inc: { attempt: 1 } }, { sort: { dueAt: 1, _id: 1 }, returnDocument: 'after' });
    if (!job) break;
    const userId = job.userId.toString();
    try {
      const [f, preference] = await Promise.all([facts(userId, now), settings(userId)]);
      if (!events(f, now).some(e => e.key === job.key)) { await CoachPushJobModel.updateOne({ _id: job._id }, { $set: { state: 'SUPPRESSED' } }); continue; }
      if (!pushAllowed(preference, now, f.timezone)) { await CoachPushJobModel.updateOne({ _id: job._id }, { $set: { state: 'RETRY', dueAt: new Date(now.getTime() + 15 * 60000) } }); continue; }
      const prior = job.tickets as CoachTicket[];
      const devices = await PushDeviceModel.find({ userId }).lean();
      const tokens = devices.map(d => d.token).filter(t => !prior.some(p => p.token === t && p.status !== 'transient'));
      if (!tokens.length) { await CoachPushJobModel.updateOne({ _id: job._id }, { $set: { state: prior.some(t => t.status === 'accepted') ? 'ACCEPTED' : 'NO_DEVICE' } }); continue; }
      if (!await claimBudget(userId, f.today, 'PUSH', preference.maxPerDay, job.key)) { await CoachPushJobModel.updateOne({ _id: job._id }, { $set: { state: 'CAPPED' } }); continue; }
      const sent = await coachPushClient.send(tokens, { title: preference.language === 'en' ? 'Your AI PT' : 'PT AI của bạn', body: activityReminder(job.kind!, f.plan?.days.find(day => day.date === f.today)?.activity, preference.language, preference.tone) ?? body(job.kind!, preference.language, !!f.plan, preference.tone), data: { url: '/plan/coach', coachJobId: job.id, kind: job.kind } });
      const tickets = [...prior.filter(t => !sent.some(s => s.token === t.token)), ...sent];
      const invalid = sent.filter(t => t.status === 'invalid').map(t => t.token);
      if (invalid.length) await PushDeviceModel.deleteMany({ userId, token: { $in: invalid } });
      const accepted = tickets.some(t => t.status === 'accepted');
      const retry = sent.some(t => t.status === 'transient') && job.attempt < 5;
      await CoachPushJobModel.updateOne({ _id: job._id }, { $set: { tickets, state: retry ? 'RETRY' : accepted ? 'ACCEPTED' : 'FAILED', ...(accepted ? { acceptedAt: now } : {}), dueAt: new Date(now.getTime() + Math.min(60, 2 ** job.attempt) * 60000) }, $push: { ticketHistory: { $each: prior.filter(t => sent.some(s => s.token === t.token)) } } });
      processed++;
    } catch (e) {
      await CoachPushJobModel.updateOne({ _id: job._id }, { $set: { state: job.attempt < 5 ? 'RETRY' : 'FAILED', dueAt: new Date(now.getTime() + 5 * 60000), error: e instanceof Error ? e.message.slice(0, 200) : 'Push processing failed' } });
    }
  }
  await CoachPushJobModel.updateMany({ state: { $in: ['PENDING', 'RETRY', 'SENDING'] }, expiresAt: { $lte: now } }, { $set: { state: 'EXPIRED' } });
  return { processed, userErrors };
}
export async function opened(userId: string, input: { jobId: string }) {
  const result = await CoachPushJobModel.updateOne({ _id: input.jobId, userId }, { $set: { openedAt: new Date() } });
  if (!result.matchedCount) throw AppError.notFound('Coach notification not found');
  return { opened: true };
}
