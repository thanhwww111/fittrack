import { BackButton } from "@/components/navigation/BackButton";
import { Stack } from "expo-router";
import { colors } from "@/constants/theme";

export default function AiLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Quay lại", headerLeft: () => <BackButton />,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="meal" options={{ title: "Gợi ý món bằng AI" }} />
      <Stack.Screen name="workout" options={{ title: "Phân tích tập luyện" }} />
    </Stack>
  );
}
