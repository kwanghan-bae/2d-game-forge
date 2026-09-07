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
  equipmentUpgraded: [],
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

  it('shows offline equipment upgrades separately from newly gained gear', () => {
    render(<OfflineResultScreen summary={summary({ equipmentUpgraded: ['v4_iron_sword'] })} onClose={() => {}} />);

    expect(screen.getByTestId('v4-offline-result')).toHaveTextContent('장비 강화 · 마을의 철검');
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
    expect(screen.getByTestId('v4-offline-result')).toHaveTextContent('원정 화면에서 결과를 확인하세요');
    expect(screen.getByTestId('v4-offline-result').textContent).not.toContain('보스 결과를 확인하세요');
  });

  it('keeps a completed expedition summary neutral until its outcome is shown', () => {
    render(<OfflineResultScreen summary={summary({ completedExpedition: true })} onClose={() => {}} />);

    const result = screen.getByTestId('v4-offline-result');
    expect(result).toHaveTextContent('원정 귀환 완료 · 원정 화면에서 결과를 확인하세요.');
    expect(result).not.toHaveTextContent('다음 Realm 해금은');
  });

  it('offers a direct route to the expedition result when offline work returned', () => {
    const onClose = vi.fn();
    const onOpenExpedition = vi.fn();
    render(
      <OfflineResultScreen
        summary={summary({ completedExpedition: true })}
        onClose={onClose}
        onOpenExpedition={onOpenExpedition}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '원정 결과 보기' }));

    expect(onOpenExpedition).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
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

  it('shows offline settlement notes that explain the applied boundary', () => {
    render(<OfflineResultScreen summary={summary({ notes: ['안전한 작업만 오프라인으로 정산했습니다.'] })} onClose={() => {}} />);

    expect(screen.getByTestId('v4-offline-result')).toHaveTextContent('안전한 작업만 오프라인으로 정산했습니다.');
  });

  it('does not duplicate a clock anomaly note beside its dedicated warning', () => {
    const note = '기기의 시간이 이전 처리 시각보다 빠릅니다. 보상을 중복 정산하지 않았습니다.';
    render(<OfflineResultScreen summary={summary({ clockAnomaly: 'backwards', notes: [note] })} onClose={() => {}} />);

    const result = screen.getByTestId('v4-offline-result');
    expect(result).toHaveTextContent('기기 시간이 이전 처리 시각보다 빠릅니다.');
    expect(result.textContent).not.toContain(note);
  });

  it('closes from Escape and exposes the dialog title to assistive technology', () => {
    const onClose = vi.fn();
    render(<OfflineResultScreen summary={summary()} onClose={onClose} />);

    const dialog = screen.getByRole('dialog', { name: '마을이 당신을 기다렸습니다' });
    expect(dialog).toHaveAttribute('aria-labelledby', 'v4-offline-result-title');
    expect(screen.getByRole('heading', { name: '마을이 당신을 기다렸습니다' })).toHaveAttribute('id', 'v4-offline-result-title');
    expect(screen.getByRole('button', { name: '마을 확인' })).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps keyboard focus inside the result dialog', () => {
    render(<OfflineResultScreen summary={summary()} onClose={() => {}} onDoubleReward={() => {}} />);

    const doubleReward = screen.getByRole('button', { name: /오프라인 재화 2배/ });
    const close = screen.getByRole('button', { name: '마을 확인' });
    close.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(doubleReward).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(close).toHaveFocus();
  });

  it('restores focus to the opener when the result dialog unmounts', () => {
    const opener = document.createElement('button');
    opener.type = 'button';
    opener.textContent = '오프라인 결과 열기';
    document.body.append(opener);
    opener.focus();

    const { unmount } = render(<OfflineResultScreen summary={summary()} onClose={() => {}} />);
    expect(screen.getByRole('button', { name: '마을 확인' })).toHaveFocus();
    unmount();

    expect(opener).toHaveFocus();
    opener.remove();
  });
});
