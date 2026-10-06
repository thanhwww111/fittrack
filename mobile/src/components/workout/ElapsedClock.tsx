import { translate as t, useTranslation } from "@/i18n";
import { useEffect, useState } from "react";
import { Text, type TextStyle } from "react-native";
import { formatClock } from "@/lib/workout";

// Đồng hồ đếm thời gian từ lúc bắt đầu buổi tập, tính lại theo startedAt mỗi giây
export function ElapsedClock({ startedAt, style }: { startedAt: string; style?: TextStyle }) {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const seconds = (now - new Date(startedAt).getTime()) / 1000;
  return (
    <Text style={style} accessibilityLabel={t("Thời gian tập")}>
      {formatClock(seconds)}
    </Text>
  );
}
