import { activeTab, parentTabHref } from '@/lib/navigation';
describe('personal plan navigation', () => {
  it('returns plan children to the plan tab', () => {
    expect(activeTab('/plan/survey')).toBe('plan');
    expect(activeTab('/plan/coach')).toBe('plan');
    expect(parentTabHref('/plan/coach')).toBe('/(tabs)/plan');
    expect(activeTab('/plan/draft?id=one')).toBe('plan');
    expect(parentTabHref('/plan/history')).toBe('/(tabs)/plan');
  });
});
