import { describe, it, expect } from 'vitest';
import {
  ANOMALY_OBSERVER_LOGS,
  TACTICAL_MANTRAS,
  getAnomalyObserverLog,
  getTacticalMantra,
  formatAnomalySagaEntry,
} from '../spacetimeAnomalyLore';
import type { SpacetimeAnomalyType, AnomalyTactic } from '../../systems/spacetimeAnomaly';

describe('spacetimeAnomalyLore (C1114)', () => {
  const anomalyKeys: SpacetimeAnomalyType[] = [
    'chrono_surge',
    'gravity_well',
    'quantum_phase',
    'singularity_core',
  ];

  const tactics: AnomalyTactic[] = ['stabilize', 'harness', 'collapse'];

  it('contains comprehensive observer logs for all 4 anomalies', () => {
    anomalyKeys.forEach((key) => {
      const log = getAnomalyObserverLog(key);
      expect(log).toBeDefined();
      expect(log.type).toBe(key);
      expect(log.observerName.length).toBeGreaterThan(0);
      expect(log.fieldNotes.length).toBeGreaterThan(15);
      expect(log.phenomenonHypothesis.length).toBeGreaterThan(15);
    });
  });

  it('contains evocative tactical mantras for all 3 tactics', () => {
    tactics.forEach((tactic) => {
      const mantraInfo = getTacticalMantra(tactic);
      expect(mantraInfo).toBeDefined();
      expect(mantraInfo.nameKR.length).toBeGreaterThan(0);
      expect(mantraInfo.mantra.length).toBeGreaterThan(10);
    });
  });

  it('formats epic saga chronicle inscriptions', () => {
    const saga = formatAnomalySagaEntry('singularity_core', 'collapse', '아스트라');
    expect(saga).toContain('[차원 왜곡]');
    expect(saga).toContain('용사 아스트라이(가)');
    expect(saga).toContain('[강제 붕괴]');
    expect(saga).toContain('불멸의 정수를 쟁취하라!');
  });
});
