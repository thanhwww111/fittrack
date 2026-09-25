import { useEffect, useState } from "react";
import { Text, type TextStyle } from "react-native";
import { formatClock } from "@/lib/workout";

// Đồng hồ đếm thời gian từ lúc bắt đầu buổi tập, tính lại theo startedAt mỗi giây
export function ElapsedClock({ startedAt, style }: { startedAt: string; style?: TextStyle }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const seconds = (now - new Date(startedAt).getTime()) / 1000;
  return (
    <Text style={style} accessibilityLabel="Thời gian tập">
      {formatClock(seconds)}
    </Text>
  );
}
