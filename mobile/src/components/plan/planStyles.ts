import { colors, spacing, radius, themedStyles } from '@/constants/theme';
export const planStyles = themedStyles(() => ({
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' },
  flex: { flex: 1 },
  mealRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  removeMeal: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted, marginTop: 20 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  text: { fontSize: 15, color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  badge: { color: colors.primary, fontWeight: '700' },
  item: { padding: spacing.sm, gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  error: { fontSize: 14, color: colors.danger },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, minHeight: 44, justifyContent: 'center' },
  selected: { borderColor: colors.primary, backgroundColor: colors.surfaceMuted },
}));
