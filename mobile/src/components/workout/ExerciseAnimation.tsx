import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import Svg, { Circle, G, Line, Rect } from "react-native-svg";
import { colors } from "@/constants/theme";
import { interpolatePose, motions, type Point } from "@/lib/exerciseMotion";
import type { Movement } from "@/lib/exerciseGuides";

export function ExerciseAnimation({ movement, playing, speed, label }: {
  movement: Movement; playing: boolean; speed: number; label: string;
}) {
  const elapsed = useRef(0);
  const [phase, setPhase] = useState(0);
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const listener = AppState.addEventListener("change", state => setActive(state === "active"));
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (!playing || !active) return;
    let previous = Date.now();
    // Only this small illustration updates; no workout state or parent screen is touched.
    const timer = setInterval(() => {
      const now = Date.now();
      elapsed.current = (elapsed.current + Math.min(now - previous, 100) * speed) % 4000;
      previous = now;
      setPhase((1 - Math.cos(elapsed.current / 4000 * Math.PI * 2)) / 2);
    }, 1000 / 30);
    return () => clearInterval(timer);
  }, [active, playing, speed]);
  const motion = motions[movement];
  const pose = interpolatePose(motion, phase);
  const front = motion.view === "front";
  const mirror = (p: Point): Point => [312 - p[0], p[1]];
  const line = (a: Point, b: Point, key: string, color = colors.primary, width = 11) =>
    <Line key={key} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={width} strokeLinecap="round" />;
  const arm = (shoulder: Point, elbow: Point, hand: Point, key: string, color: string) => <G key={key}>
    {line(shoulder, elbow, `${key}-upper`, color)}{line(elbow, hand, `${key}-lower`, color)}
    <Circle cx={elbow[0]} cy={elbow[1]} r={5} fill={colors.surface} />
  </G>;
  const equipment = motion.equipment;
  const bar = equipment === "squatbar" ? pose.shoulder : equipment === "hipbar" ? pose.hip : pose.hand;
  const dumbbell = (p: Point, key: string) => <G key={key}>
    {line([p[0] - 10, p[1]], [p[0] + 10, p[1]], `${key}-grip`, colors.text, 4)}
    <Rect x={p[0] - 13} y={p[1] - 7} width={6} height={14} rx={2} fill={colors.text} />
    <Rect x={p[0] + 7} y={p[1] - 7} width={6} height={14} rx={2} fill={colors.text} />
  </G>;
  return <Svg width="100%" height={250} viewBox="0 0 320 250" accessibilityRole="image" accessibilityLabel={label}>
    <Rect x={0} y={0} width={320} height={250} rx={18} fill={colors.primarySoft} />
    {line([26, 230], [294, 230], "floor", colors.border, 2)}
    {motion.bench ? <G>
      {line([motion.bench[0], motion.bench[1]], [motion.bench[2], motion.bench[3]], "bench", colors.textMuted, 9)}
      {line([motion.bench[0] + 7, motion.bench[1]], [motion.bench[0] + 7, 230], "leg1", colors.textMuted, 5)}
      {line([motion.bench[2] - 7, motion.bench[3]], [motion.bench[2] - 7, 230], "leg2", colors.textMuted, 5)}
    </G> : null}
    {equipment === "pullbar" ? line([120, 24], [210, 24], "pullbar", colors.text, 6) : null}
    {equipment === "cable" ? <G>
      {line([front ? 30 : 220, 25], pose.hand, "cable", colors.textMuted, 2)}
      {front ? line([282, 25], mirror(pose.hand), "cable2", colors.textMuted, 2) : null}
    </G> : null}
    {/* Far limbs distinguish the side view; the front view mirrors arm movement. */}
    <G transform={front ? "translate(0 0)" : "translate(9 -3)"} opacity={0.4}>
      {line(pose.hip, front ? [178, 175] : pose.knee, "far-thigh", colors.textMuted)}
      {line(front ? [178, 175] : pose.knee, front ? [183, 220] : pose.foot, "far-shin", colors.textMuted)}
      {arm(pose.shoulder, front ? mirror(pose.elbow) : pose.elbow, front ? mirror(pose.hand) : pose.hand, "far-arm", colors.primary)}
    </G>
    {line(pose.hip, front ? [134, 175] : pose.knee, "thigh")}
    {line(front ? [134, 175] : pose.knee, front ? [129, 220] : pose.foot, "shin")}
    {line(pose.shoulder, pose.hip, "body", colors.primary, 19)}
    {line(pose.head, pose.shoulder, "neck", colors.primary, 9)}
    <Circle cx={pose.head[0]} cy={pose.head[1]} r={13} fill={colors.primary} />
    {arm(pose.shoulder, pose.elbow, pose.hand, "near-arm", colors.primary)}
    <Circle cx={pose.hip[0]} cy={pose.hip[1]} r={5} fill={colors.surface} />
    {equipment === "barbell" || equipment === "squatbar" || equipment === "hipbar" ? <G>
      {line([bar[0] - 32, bar[1]], [bar[0] + 32, bar[1]], "bar", colors.text, 4)}
      <Rect x={bar[0] - 29} y={bar[1] - 12} width={9} height={24} rx={2} fill={colors.text} />
      <Rect x={bar[0] + 20} y={bar[1] - 12} width={9} height={24} rx={2} fill={colors.text} />
    </G> : null}
    {equipment === "dumbbells" ? <G>{dumbbell(pose.hand, "db")}{front ? dumbbell(mirror(pose.hand), "db2") : null}</G> : null}
    {equipment === "hammer" ? <G transform={`rotate(90 ${pose.hand[0]} ${pose.hand[1]})`}>{dumbbell(pose.hand, "hammer")}</G> : null}
    {equipment === "platform" ? line([pose.foot[0] - 22, pose.foot[1] - 17], [pose.foot[0] + 22, pose.foot[1] + 17], "platform", colors.text, 8) : null}
  </Svg>;
}
