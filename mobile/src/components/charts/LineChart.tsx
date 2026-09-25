import { useState } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { colors, spacing } from "@/constants/theme";
import { formatTick, niceAxis } from "./scale";

export interface LinePoint {
  x: number; // vị trí theo thời gian, 0 → 1
  label: string; // nhãn trục x / readout, ví dụ "25/9"
  value: number;
}

interface LineChartProps {
  points: LinePoint[];
  formatValue: (value: number) => string;
  height?: number;
  color?: string;
  accessibilityLabel: string;
}

const PAD = { top: 12, right: 44, bottom: 24, left: 36 };
const SURFACE = colors.surface;

// Biểu đồ đường 1 chuỗi: nét 2px, vùng nền 10%, điểm cuối có viền trắng 2px.
// Chạm vào biểu đồ để xem giá trị điểm gần nhất.
export function LineChart({
  points,
  formatValue,
  height = 180,
  color = colors.primary,
  accessibilityLabel,
}: LineChartProps) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const axis = niceAxis(
    points.map((p) => p.value),
    { tickCount: 3 }
  );
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const sx = (x: number) => PAD.left + x * plotW;
  const sy = (v: number) => PAD.top + (1 - (v - axis.min) / (axis.max - axis.min)) * plotH;

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x)},${sy(p.value)}`).join(" ");
  const area =
    points.length > 1
      ? `${path} L${sx(points.at(-1)!.x)},${PAD.top + plotH} L${sx(points[0].x)},${PAD.top + plotH} Z`
      : "";

  const active = selected ?? points.length - 1;
  const activePoint = points[active];
  const last = points.at(-1);

  function handlePress(locationX: number) {
    if (points.length === 0 || plotW === 0) return;
    const x = (locationX - PAD.left) / plotW;
    let nearest = 0;
    points.forEach((p, i) => {
      if (Math.abs(p.x - x) < Math.abs(points[nearest].x - x)) nearest = i;
    });
    setSelected(nearest);
  }

  return (
    <View>
      {activePoint ? (
        <Text style={styles.readout}>
          {activePoint.label} · <Text style={styles.readoutValue}>{formatValue(activePoint.value)}</Text>
        </Text>
      ) : null}
      <Pressable
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        onPress={(e) => handlePress(e.nativeEvent.locationX)}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        style={{ height }}
      >
        {width > 0 ? (
          <Svg width={width} height={height}>
            {axis.ticks.map((t) => (
              <Line
                key={`g${t}`}
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={sy(t)}
                y2={sy(t)}
                stroke={colors.border}
                strokeWidth={1}
              />
            ))}
            {axis.ticks.map((t) => (
              <SvgText
                key={`t${t}`}
                x={PAD.left - 6}
                y={sy(t) + 4}
                fontSize={11}
                fill={colors.textMuted}
                textAnchor="end"
              >
                {formatTick(t)}
              </SvgText>
            ))}

            {area ? <Path d={area} fill={color} fillOpacity={0.1} /> : null}
            <Path
              d={path}
              stroke={color}
              strokeWidth={2}
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {selected !== null && activePoint ? (
              <Line
                x1={sx(activePoint.x)}
                x2={sx(activePoint.x)}
                y1={PAD.top}
                y2={PAD.top + plotH}
                stroke={colors.textMuted}
                strokeWidth={1}
              />
            ) : null}
            {activePoint ? (
              <Circle
                cx={sx(activePoint.x)}
                cy={sy(activePoint.value)}
                r={5}
                fill={color}
                stroke={SURFACE}
                strokeWidth={2}
              />
            ) : null}

            {/* Chỉ ghi giá trị ở điểm cuối, các điểm khác xem bằng cách chạm */}
            {last ? (
              <SvgText
                x={sx(last.x) + 8}
                y={sy(last.value) + 4}
                fontSize={12}
                fontWeight="600"
                fill={colors.text}
              >
                {formatTick(last.value)}
              </SvgText>
            ) : null}

            {points.length > 0 ? (
              <>
                <SvgText x={sx(points[0].x)} y={height - 6} fontSize={11} fill={colors.textMuted}>
                  {points[0].label}
                </SvgText>
                {points.length > 1 ? (
                  <SvgText
                    x={sx(points.at(-1)!.x)}
                    y={height - 6}
                    fontSize={11}
                    fill={colors.textMuted}
                    textAnchor="end"
                  >
                    {points.at(-1)!.label}
                  </SvgText>
                ) : null}
              </>
            ) : null}
          </Svg>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.xs },
  readoutValue: { fontWeight: "700", color: colors.text },
});
