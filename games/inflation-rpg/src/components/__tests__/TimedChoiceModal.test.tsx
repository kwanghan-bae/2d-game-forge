import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TimedChoiceModal } from '../TimedChoiceModal';

const options = [
  { id: 'safe', label: '안전', icon: '🛡️', color: '#345' },
  { id: 'risk', label: '도전', icon: '⚔️', color: '#934' },
];

describe('TimedChoiceModal', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('passes the selected option to the resolver', () => {
    const onChoose = vi.fn();
    render(
      <TimedChoiceModal
        title="선택"
        titleIcon="✨"
        description="하나를 고르세요"
        options={options}
        timeoutMs={3000}
        defaultOptionId="safe"
        accentColor="#fc0"
        onChoose={onChoose}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /도전/ }));

    expect(onChoose).toHaveBeenCalledWith('risk');
  });

  it('resolves the default option when the timer expires', () => {
    vi.useFakeTimers();
    const onChoose = vi.fn();
    render(
      <TimedChoiceModal
        title="선택"
        titleIcon="✨"
        description="하나를 고르세요"
        options={options}
        timeoutMs={3000}
        defaultOptionId="safe"
        accentColor="#fc0"
        onChoose={onChoose}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onChoose).toHaveBeenCalledWith('safe');
  });
});
