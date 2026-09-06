import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OfflineResultScreen } from '../screens/OfflineResultScreen';
import type { OfflineSummary } from '../types';

const summary = (overrides: Partial<OfflineSummary> = {}): OfflineSummary => ({
  processedSeconds: 3_600,
  efficiency: 0.7,
  completedTaskIds: [],
  completedExpedition: false,
  resourcesGained: { gold: 55 },
  equipmentGained: [],
  wasClamped: false,
  clockAnomaly: null,
  notes: [],
  ...overrides,
});

describe('V4 offline result screen', () => {
  it('renders player-facing equipment names instead of storage ids', () => {
    render(<OfflineResultScreen summary={summary({ equipmentGained: ['v4_iron_sword'] })} onClose={() => {}} />);

    expect(screen.getByTestId('v4-offline-result')).toHaveTextContent('마을의 철검');
    expect(screen.getByTestId('v4-offline-result').textContent).not.toContain('v4_iron_sword');
  });

  it('explains whether the device clock moved backwards or into the future', () => {
    const { rerender } = render(<OfflineResultScreen summary={summary({ clockAnomaly: 'backwards' })} onClose={() => {}} />);
    expect(screen.getByTestId('v4-offline-result')).toHaveTextContent('이전 처리 시각보다 빠릅니다');

    rerender(<OfflineResultScreen summary={summary({ clockAnomaly: 'future' })} onClose={() => {}} />);
    expect(screen.getByTestId('v4-offline-result')).toHaveTextContent('저장 시각이 현재보다 미래입니다');

    rerender(<OfflineResultScreen summary={summary({ clockAnomaly: 'invalid' })} onClose={() => {}} />);
    expect(screen.getByTestId('v4-offline-result')).toHaveTextContent('기기 시각을 확인할 수 없어');
  });

  it('makes an empty offline reward explicit', () => {
    render(<OfflineResultScreen summary={summary({ resourcesGained: {} })} onClose={() => {}} />);

    expect(screen.getByTestId('v4-offline-result')).toHaveTextContent('획득 재화 없음');
  });
});
