import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { V4SaveRecoveryScreen } from '../screens/V4SaveRecoveryScreen';

describe('V4 save recovery screen', () => {
  it('explains that the original save is protected and requires explicit action', () => {
    const onStartFresh = vi.fn();
    render(<V4SaveRecoveryScreen reason="invalid_schema" onStartFresh={onStartFresh} />);

    expect(screen.getByTestId('v4-save-recovery')).toHaveTextContent('저장 복구 필요');
    expect(screen.getByTestId('v4-save-recovery')).toHaveTextContent('기존 저장을 덮어쓰지 않았습니다');
    expect(screen.getByTestId('v4-save-recovery')).toHaveTextContent('구조 검증에 실패했습니다');
    fireEvent.click(screen.getByRole('button', { name: '새 V4 저장 시작' }));
    expect(onStartFresh).toHaveBeenCalledOnce();
  });

  it('uses a separate message for unreadable JSON', () => {
    render(<V4SaveRecoveryScreen reason="malformed_json" onStartFresh={() => {}} />);

    expect(screen.getByTestId('v4-save-recovery')).toHaveTextContent('읽을 수 없습니다');
  });

  it('moves focus to the recovery heading when a save needs attention', () => {
    render(<V4SaveRecoveryScreen reason="invalid_schema" onStartFresh={() => {}} />);

    expect(screen.getByRole('heading', { name: 'V4 저장을 확인할 수 없습니다' })).toHaveFocus();
  });
});
