import { Stack } from "expo-router";
import { colors } from "@/constants/theme";

export default function FoodLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Quay lại",
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="search" options={{ title: "Tìm món ăn" }} />
      <Stack.Screen name="add" options={{ title: "Thêm món" }} />
      <Stack.Screen name="detail" options={{ title: "Chi tiết món đã ăn" }} />
      <Stack.Screen name="create" options={{ title: "Tạo món mới" }} />
    </Stack>
  );
}
