import { describe, test, expect } from 'vitest';
import { DamageEntry, DamageFloaterLogic } from '../../components/DamageFloaterLogic';

describe('DamageFloaterLogic', () => {
  test('addEntry creates a new entry with timestamp', () => {
    const logic = new DamageFloaterLogic();
    logic.addEntry({ value: 42, type: 'damage' });
    const entries = logic.getActiveEntries(Date.now());
    expect(entries).toHaveLength(1);
    expect(entries[0].value).toBe(42);
    expect(entries[0].type).toBe('damage');
  });

  test('entries expire after duration', () => {
    const logic = new DamageFloaterLogic({ duration: 800 });
    const now = Date.now();
    logic.addEntry({ value: 10, type: 'damage' }, now);
    expect(logic.getActiveEntries(now + 500)).toHaveLength(1);
    expect(logic.getActiveEntries(now + 900)).toHaveLength(0);
  });

  test('supports multiple concurrent entries', () => {
    const logic = new DamageFloaterLogic();
    const now = Date.now();
    logic.addEntry({ value: 10, type: 'damage' }, now);
    logic.addEntry({ value: 20, type: 'heal' }, now + 100);
    logic.addEntry({ value: 30, type: 'exp' }, now + 200);
    expect(logic.getActiveEntries(now + 300)).toHaveLength(3);
  });

  test('critical type is supported', () => {
    const logic = new DamageFloaterLogic();
    logic.addEntry({ value: 999, type: 'critical' });
    const entries = logic.getActiveEntries(Date.now());
    expect(entries[0].type).toBe('critical');
  });

  test('getProgress returns 0 at start and 1 at end of duration', () => {
    const logic = new DamageFloaterLogic({ duration: 1000 });
    const now = Date.now();
    logic.addEntry({ value: 5, type: 'damage' }, now);
    const entries = logic.getActiveEntries(now);
    expect(entries[0].progress).toBeCloseTo(0, 1);
    const entriesLate = logic.getActiveEntries(now + 500);
    expect(entriesLate[0].progress).toBeCloseTo(0.5, 1);
  });

  test('clear removes all entries', () => {
    const logic = new DamageFloaterLogic();
    logic.addEntry({ value: 1, type: 'damage' });
    logic.addEntry({ value: 2, type: 'heal' });
    logic.clear();
    expect(logic.getActiveEntries(Date.now())).toHaveLength(0);
  });
});
