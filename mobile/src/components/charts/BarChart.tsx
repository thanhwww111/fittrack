import { useState } from "react";
import { Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import Svg, { Line, Path, Text as SvgText } from "react-native-svg";
import { colors, spacing, themedStyles } from "@/constants/theme";
import { formatTick, niceAxis } from "./scale";

export interface Bar {
  key: string;
  label: string; // nhãn trục x
  detail: string; // nhãn đầy đủ trong readout, ví dụ "Tuần 22/9"
  value: number;
}

interface BarChartProps {
  bars: Bar[];
  formatValue: (value: number) => string;
  // Đường tham chiếu, ví dụ target calo. Không ghi chữ trong biểu đồ (dễ đè lên cột),
  // màn gọi phải giải thích đường này ở tiêu đề hoặc phụ đề.
  reference?: { value: number } | null;
  height?: number;
  color?: string;
  accessibilityLabel: string;
}

const PAD = { top: 16, right: 8, bottom: 24, left: 40 };
const MAX_BAR = 24;
const RADIUS = 4;
const MAX_X_LABELS = 7;

// Cột bo 4px ở đầu, vuông ở gốc
function barPath(x: number, y: number, w: number, h: number) {
  if (h <= 0) return "";
  const r = Math.min(RADIUS, w / 2, h);
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}

// Biểu đồ cột 1 chuỗi. Chạm vào cột để xem giá trị, mặc định chọn cột cuối (gần nhất).
export function BarChart({
  bars,
  formatValue,
  reference,
  height = 180,
  color = colors.primary,
  accessibilityLabel,
}: BarChartProps) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const axis = niceAxis([...bars.map((b) => b.value), ...(reference ? [reference.value] : [])], {
    includeZero: true,
    tickCount: 3,
  });
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const slot = bars.length > 0 ? plotW / bars.length : 0;
  // Cột không lấp kín ô: tối đa 24px và 60% bề rộng ô, phần còn lại là khoảng trống
  const barW = Math.max(2, Math.min(MAX_BAR, slot * 0.6));
  const sy = (v: number) => PAD.top + (1 - (v - axis.min) / (axis.max - axis.min)) * plotH;

  const active = selected ?? bars.length - 1;
  const activeBar = bars[active];
  const labelEvery = Math.max(1, Math.ceil(bars.length / MAX_X_LABELS));
  const lastIndex = bars.length - 1;
  // Luôn ghi nhãn cột cuối; bỏ nhãn định kỳ nào quá sát nó để không chồng chữ
  const showXLabel = (i: number) =>
    i === lastIndex || (i % labelEvery === 0 && lastIndex - i >= labelEvery);

  function handlePress(locationX: number) {
    if (slot === 0) return;
    const index = Math.floor((locationX - PAD.left) / slot);
    setSelected(Math.min(bars.length - 1, Math.max(0, index)));
  }

  return (
    <View>
      {activeBar ? (
        <Text style={styles.readout}>
          {activeBar.detail} · <Text style={styles.readoutValue}>{formatValue(activeBar.value)}</Text>
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

            {bars.map((b, i) => {
              const x = PAD.left + i * slot + (slot - barW) / 2;
              const y = sy(b.value);
              return (
                <Path
                  key={b.key}
                  d={barPath(x, y, barW, sy(0) - y)}
                  fill={color}
                  // Làm nhạt các cột khác để cột đang chọn nổi bật
                  fillOpacity={i === active ? 1 : 0.45}
                />
              );
            })}

            {reference ? (
              <Line
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={sy(reference.value)}
                y2={sy(reference.value)}
                stroke={colors.text}
                strokeWidth={1}
              />
            ) : null}

            {bars.map((b, i) =>
              showXLabel(i) ? (
                <SvgText
                  key={`x${b.key}`}
                  x={PAD.left + i * slot + slot / 2}
                  y={height - 6}
                  fontSize={11}
                  fill={i === active ? colors.text : colors.textMuted}
                  fontWeight={i === active ? "600" : "400"}
                  textAnchor="middle"
                >
                  {b.label}
                </SvgText>
              ) : null
            )}
          </Svg>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = themedStyles(() => ({
  readout: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.xs },
  readoutValue: { fontWeight: "700", color: colors.text },
}));
