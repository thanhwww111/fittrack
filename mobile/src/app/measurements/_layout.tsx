import { Stack } from "expo-router";
import { colors } from "@/constants/theme";

export default function MeasurementsLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Quay lại",
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Số đo cơ thể" }} />
      <Stack.Screen name="edit" options={{ title: "Ghi số đo" }} />
    </Stack>
  );
}
