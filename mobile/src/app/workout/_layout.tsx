import { Stack } from "expo-router";
import { colors } from "@/constants/theme";

export default function WorkoutLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Quay lại",
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="start" options={{ title: "Đang tập", gestureEnabled: false }} />
      <Stack.Screen name="templates" options={{ title: "Template của bạn" }} />
      <Stack.Screen name="template" options={{ title: "Template" }} />
      <Stack.Screen name="exercises" options={{ title: "Chọn bài tập", presentation: "modal" }} />
      <Stack.Screen name="history" options={{ title: "Lịch sử tập" }} />
      <Stack.Screen name="session" options={{ title: "Chi tiết buổi tập" }} />
    </Stack>
  );
}
