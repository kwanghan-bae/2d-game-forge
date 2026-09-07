import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
    render(<OfflineResultScreen summary={summary({ resourcesGained: {} })} onClose={() => {}} onDoubleReward={() => {}} />);

    expect(screen.getByTestId('v4-offline-result')).toHaveTextContent('획득 재화 없음');
    expect(screen.getByRole('button', { name: '이번 정산은 2배 대상 없음' })).toBeDisabled();
  });

  it('calls out a risky expedition that still needs player confirmation', () => {
    render(<OfflineResultScreen summary={summary()} pendingExpeditionConfirmation onClose={() => {}} />);

    expect(screen.getByTestId('v4-offline-result')).toHaveTextContent('위험 원정 결과 확인 필요');
    expect(screen.getByTestId('v4-offline-result')).toHaveTextContent('원정 화면에서 보스 결과를 확인하세요');
  });

  it('does not expose an unknown resource storage key to players', () => {
    render(<OfflineResultScreen summary={summary({ resourcesGained: { unknown: 2 } as never })} onClose={() => {}} />);

    expect(screen.getByTestId('v4-offline-result')).toHaveTextContent('기타 재화');
    expect(screen.getByTestId('v4-offline-result').textContent).not.toContain('unknown');
  });

  it('does not expose non-finite offline summary values', () => {
    render(<OfflineResultScreen summary={summary({
      processedSeconds: Number.POSITIVE_INFINITY,
      efficiency: Number.NaN,
      resourcesGained: { gold: Number.POSITIVE_INFINITY, spirit: Number.NaN },
    })} onClose={() => {}} />);

    const result = screen.getByTestId('v4-offline-result');
    expect(result.textContent).not.toContain('Infinity');
    expect(result.textContent).not.toContain('NaN');
    expect(result).toHaveTextContent('획득 재화 없음');
  });

  it('does not present negative currency deltas as offline rewards', () => {
    render(<OfflineResultScreen summary={summary({ resourcesGained: { gold: -5, spirit: 0 } })} onClose={() => {}} />);

    const result = screen.getByTestId('v4-offline-result');
    expect(result).toHaveTextContent('획득 재화 없음');
    expect(result.textContent).not.toContain('-5');
  });

  it('closes from Escape and exposes the dialog title to assistive technology', () => {
    const onClose = vi.fn();
    render(<OfflineResultScreen summary={summary()} onClose={onClose} />);

    const dialog = screen.getByRole('dialog', { name: '마을이 당신을 기다렸습니다' });
    expect(dialog).toHaveAttribute('aria-labelledby', 'v4-offline-result-title');
    expect(screen.getByRole('heading', { name: '마을이 당신을 기다렸습니다' })).toHaveAttribute('id', 'v4-offline-result-title');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
