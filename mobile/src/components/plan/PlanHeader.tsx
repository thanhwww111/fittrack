import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '@/components/navigation/BackButton';
import { ThemeToggleButton } from '@/components/ui/ThemeToggleButton';
import { colors, spacing, themedStyles } from '@/constants/theme';

export function PlanHeader({ title }: { title: string }) {
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
    <View style={styles.row}>
      <BackButton compact />
      <Text accessibilityRole='header' style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{title}</Text>
      <ThemeToggleButton inline />
    </View>
  </SafeAreaView>;
}

const styles = themedStyles(() => ({
  safe: { backgroundColor: colors.background },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 56 },
  title: { flex: 1, minWidth: 0, color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
}));
