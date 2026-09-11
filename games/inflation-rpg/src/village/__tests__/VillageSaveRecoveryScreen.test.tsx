import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VillageSaveRecoveryScreen } from '../screens/VillageSaveRecoveryScreen';

describe('Village save recovery screen', () => {
  it('explains that the original save is protected and requires explicit action', () => {
    const onStartFresh = vi.fn();
    render(<VillageSaveRecoveryScreen reason="invalid_schema" onStartFresh={onStartFresh} />);

    expect(screen.getByTestId('village-save-recovery')).toHaveTextContent('저장 복구 필요');
    expect(screen.getByTestId('village-save-recovery')).toHaveTextContent('기존 저장을 덮어쓰지 않았습니다');
    expect(screen.getByTestId('village-save-recovery')).toHaveTextContent('구조 검증에 실패했습니다');
    fireEvent.click(screen.getByRole('button', { name: '새 현재 게임 저장 시작' }));
    expect(onStartFresh).toHaveBeenCalledOnce();
  });

  it('uses a separate message for unreadable JSON', () => {
    render(<VillageSaveRecoveryScreen reason="malformed_json" onStartFresh={() => {}} />);

    expect(screen.getByTestId('village-save-recovery')).toHaveTextContent('읽을 수 없습니다');
  });

  it('moves focus to the recovery heading when a save needs attention', () => {
    render(<VillageSaveRecoveryScreen reason="invalid_schema" onStartFresh={() => {}} />);

    expect(screen.getByRole('heading', { name: '현재 게임 저장을 확인할 수 없습니다' })).toHaveFocus();
  });
});
