type Activity = { sport: 'YOGA' | 'WALKING'; time: string; plannedMinutes: number; focus?: string };

/** Plan facts are rechecked by the scheduler before this notification is built. */
export function activityReminder(kind: string, activity: Activity | null | undefined, language: string, tone: string): string | undefined {
  if (!activity || !['BEFORE', 'OVERDUE', 'COMPLETE'].includes(kind)) return undefined;
  const en = language === 'en';
  const sport = activity.sport === 'YOGA' ? 'Yoga' : en ? 'Walking' : 'Đi bộ';
  const session = en ? `${sport} at ${activity.time}, ${activity.plannedMinutes} minutes.` : `${sport} lúc ${activity.time}, ${activity.plannedMinutes} phút.`;
  const focus = activity.focus?.replace(/\s+/g, ' ').trim().slice(0, 120);
  if (kind === 'BEFORE') {
    const action = en ? tone === 'FIRM' ? 'Prepare now and begin at a comfortable pace.' : 'Start gently when you feel ready.' : tone === 'FIRM' ? 'Chuẩn bị nhé, bắt đầu với nhịp độ phù hợp.' : 'Bắt đầu nhẹ nhàng khi bạn sẵn sàng.';
    return `${session}${focus ? ` ${focus}.` : ''} ${action}`;
  }
  if (kind === 'OVERDUE') return `${session} ${en ? 'Still unconfirmed. If completed, record it; otherwise tell your PT what needs adjusting.' : 'Chưa có xác nhận. Nếu đã tập, hãy ghi lại; hoặc báo PT điều cần điều chỉnh.'}`;
  return `${session} ${en ? 'Recorded. Recover and share how the session felt with your PT.' : 'Đã ghi nhận. Nghỉ hồi phục và chia sẻ cảm nhận với PT nhé.'}`;
}
