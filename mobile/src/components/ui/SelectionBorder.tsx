import { useEffect, useId, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

// Responsive adaptation of Uiverse.io by vinodjangid07.
export function SelectionBorder({ active, selected }: { active: boolean; selected: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [reduceMotion, setReduceMotion] = useState(true);
  const [fade] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let mounted = true;
    void Promise.resolve(AccessibilityInfo.isReduceMotionEnabled()).then(value => {
      if (mounted) setReduceMotion(value !== false);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    const animation = Animated.timing(fade, { toValue: active ? 1 : 0, duration: reduceMotion ? 0 : 1000, useNativeDriver: true, isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [active, fade, reduceMotion]);
  const stroke = selected ? 3 : 2;
  const colors = selected ? ['#FFD277', '#FFF0BE', '#A77818', '#FFD277', '#FFF0BE', '#FFD277'] : ['#77530A', '#FFD277', '#77530A', '#77530A', '#FFD277', '#77530A'];
  const border = (reverse: boolean) => <Svg width={size.width} height={size.height}>
    <Defs><LinearGradient id={`${id}${reverse ? 'hover' : 'base'}`} x1={reverse ? '100%' : '0%'} y1="0%" x2={reverse ? '0%' : '100%'} y2="0%">
      {colors.map((color, index) => <Stop key={index} offset={`${index * 20}%`} stopColor={color} />)}
    </LinearGradient></Defs>
    <Rect x={stroke / 2} y={stroke / 2} width={Math.max(0, size.width - stroke)} height={Math.max(0, size.height - stroke)} rx={10 - stroke / 2} fill="none" stroke={`url(#${id}${reverse ? 'hover' : 'base'})`} strokeWidth={stroke} />
  </Svg>;
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}
    onLayout={({ nativeEvent: { layout } }) => setSize(previous => previous.width === layout.width && previous.height === layout.height ? previous : { width: layout.width, height: layout.height })}>
    {size.width > 0 && size.height > 0 ? <>
      {border(false)}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>{border(true)}</Animated.View>
    </> : null}
  </View>;
}
