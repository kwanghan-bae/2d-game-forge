import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createInitialV4Save } from '../save';
import { ExpeditionScreen } from '../screens/ExpeditionScreen';
import type { ExpeditionResult, V4SaveEnvelope } from '../types';

function renderResult(result: ExpeditionResult) {
  const save = createInitialV4Save(101);
  save.run.lastExpeditionResult = result;
  const props = {
    save,
    now: save.updatedAt,
    onStart: vi.fn(),
    onConfirm: vi.fn(),
    onConfirmUnlock: vi.fn(),
    onRefresh: vi.fn(),
    onIntervention: vi.fn(),
    onBack: vi.fn(),
  } satisfies React.ComponentProps<typeof ExpeditionScreen>;
  return render(<ExpeditionScreen {...props} />);
}

function baseResult(overrides: Partial<ExpeditionResult> = {}): ExpeditionResult {
  return {
    id: 'result-1',
    realmId: 'joseon_plains',
    outcome: 'victory',
    completedAt: 1_000,
    reward: { gold: 55, materials: 4 },
    heroPower: 180,
    recommendedPower: 150,
    turns: 5,
    totalDamageDealt: 220,
    totalDamageTaken: 18,
    heroRemainingHp: 120,
    weaknessKR: '공격력',
    recommendedFacilityId: 'blacksmith',
    recommendedEquipmentId: null,
    retryAfterSeconds: 20,
    ...overrides,
  };
}

describe('V4 expedition result screen', () => {
  it('renders Korean resource labels instead of storage keys', () => {
    renderResult(baseResult());

    const result = screen.getByTestId('v4-expedition-result');
    expect(result).toHaveTextContent('금화 +55');
    expect(result).toHaveTextContent('재료 +4');
    expect(result.textContent).not.toContain('gold +55');
    expect(result.textContent).not.toContain('materials +4');
  });

  it('renders the Korean name of a recommended equipment item', () => {
    renderResult(baseResult({
      outcome: 'defeat',
      recommendedEquipmentId: 'v4_guardian_armor',
    }));

    const result = screen.getByTestId('v4-expedition-result');
    expect(result).toHaveTextContent('추천 장비 · 수호 갑옷');
    expect(result.textContent).not.toContain('v4_guardian_armor');
  });
});
