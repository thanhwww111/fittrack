import { describe, expect, it } from 'vitest';
import { PROGRAM_PRESETS } from '../src/constants/programPresets';
import { listPresets } from '../src/services/weeklyProgram.service';

describe('Gym weekly preset catalog', () => {
  it('offers complete selectable schedules for every frequency from two to seven days', () => {
    const presets = listPresets();
    expect([...new Set(presets.map(p => p.daysPerWeek))].sort()).toEqual([2, 3, 4, 5, 6, 7]);
    expect(new Set(presets.map(p => p.key)).size).toBe(presets.length);
    for (const preset of presets) {
      expect(new Set(preset.days.map(d => d.dayOfWeek)).size).toBe(preset.daysPerWeek);
      for (const day of preset.days) {
        expect(day.dayOfWeek).toBeGreaterThanOrEqual(1);
        expect(day.dayOfWeek).toBeLessThanOrEqual(7);
        expect(day.name).toBeTruthy();
        expect(day.exercises.length).toBeGreaterThan(0);
      }
    }
  });
  it('includes a lighter seventh day rather than a seventh heavy strength workout', () => {
    const preset = PROGRAM_PRESETS.find(p => p.schedule.length === 7);
    expect(preset).toBeDefined();
    expect(preset!.schedule[6].workout).toBe('recovery');
    expect(preset!.workouts.recovery.exercises.every(e => e.sets <= 2)).toBe(true);
  });
});
