import { BackButton } from "@/components/navigation/BackButton";
import { Stack } from "expo-router";
import { colors } from "@/constants/theme";

export default function WorkoutLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Quay lại", headerLeft: () => <BackButton />,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="start" options={{ title: "Đang tập", gestureEnabled: false }} />
      <Stack.Screen name="templates" options={{ title: "Template của bạn" }} />
      <Stack.Screen name="template" options={{ title: "Template" }} />
      <Stack.Screen name="programs" options={{ title: "Lịch tập theo tuần" }} />
      <Stack.Screen name="program" options={{ title: "Lịch tuần" }} />
      <Stack.Screen name="exercises" options={{ title: "Chọn bài tập", presentation: "modal", headerLeft: () => <BackButton close /> }} />
      <Stack.Screen name="history" options={{ title: "Lịch sử tập" }} />
      <Stack.Screen name="session" options={{ title: "Chi tiết buổi tập" }} />
      <Stack.Screen name="exercise" options={{ title: "Bài tập" }} />
    </Stack>
  );
}
