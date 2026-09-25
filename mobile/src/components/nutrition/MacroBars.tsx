import { View } from "react-native";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { colors, spacing } from "@/constants/theme";
import type { Macros } from "@/types/models";

interface MacroBarsProps {
  consumed: Macros;
  target: Macros;
}

// 4 thanh Calo / Protein / Carbs / Fat so với target, dùng ở Home và tab Dinh dưỡng
export function MacroBars({ consumed, target }: MacroBarsProps) {
  return (
    <View style={{ gap: spacing.md }}>
      <ProgressBar label="Calories" value={consumed.calories} target={target.calories} unit="kcal" />
      <ProgressBar
        label="Protein"
        value={consumed.protein}
        target={target.protein}
        unit="g"
        color={colors.protein}
      />
      <ProgressBar
        label="Carbs"
        value={consumed.carbs}
        target={target.carbs}
        unit="g"
        color={colors.carbs}
      />
      <ProgressBar label="Fat" value={consumed.fat} target={target.fat} unit="g" color={colors.fat} />
    </View>
  );
}
