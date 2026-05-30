import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('EncounterEngine file split', () => {
  const overworldDir = resolve(import.meta.dirname, '..');
  const encounterEnginePath = resolve(overworldDir, 'EncounterEngine.ts');
  const constantsPath = resolve(overworldDir, 'encounter/constants.ts');

  it('keeps extracted constants in a dedicated module under 800 lines', () => {
    expect(existsSync(constantsPath)).toBe(true);

    const constantsSource = readFileSync(constantsPath, 'utf8');
    expect(constantsSource.split('\n').length).toBeLessThanOrEqual(800);
  });

  it('re-exports constants from EncounterEngine entrypoint', async () => {
    const module = await import('../EncounterEngine');
    expect(module.DANGER_ZONE_RATE).toBe(0.15);
    expect(module.MILESTONE_LEVELS).toEqual([10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000]);
  });

  it('moves exported constants out of the EncounterEngine entrypoint', () => {
    const encounterEngineSource = readFileSync(encounterEnginePath, 'utf8');
    expect(encounterEngineSource).not.toMatch(/^export const /m);
    expect(encounterEngineSource).toContain("export * from './encounter/constants';");
  });
});
