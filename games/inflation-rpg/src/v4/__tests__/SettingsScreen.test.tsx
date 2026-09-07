import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SettingsScreen } from '../screens/SettingsScreen';

describe('V4 settings screen', () => {
  it('exposes Korean audio controls and sends only the changed setting', () => {
    const onChange = vi.fn();
    render(
      <SettingsScreen
        settings={{ music: 0.7, sfx: 0.8, muted: false }}
        onChange={onChange}
        onBack={() => {}}
      />,
    );

    fireEvent.change(screen.getByRole('slider', { name: '음악 볼륨' }), { target: { value: '0.4' } });
    fireEvent.click(screen.getByRole('checkbox', { name: '모든 소리 음소거' }));

    expect(onChange).toHaveBeenNthCalledWith(1, { music: 0.4 });
    expect(onChange).toHaveBeenNthCalledWith(2, { muted: true });
    expect(screen.getByText('V4 전용 저장')).toBeInTheDocument();
  });

  it('exposes purchase restoration only when the native bridge provides it', async () => {
    const onRestorePurchases = vi.fn();
    const { rerender } = render(
      <SettingsScreen
        settings={{ music: 0.7, sfx: 0.8, muted: false }}
        onChange={() => {}}
        onBack={() => {}}
        onRestorePurchases={onRestorePurchases}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '구매 복원' }));
      await Promise.resolve();
    });
    expect(onRestorePurchases).toHaveBeenCalledTimes(1);

    rerender(
      <SettingsScreen
        settings={{ music: 0.7, sfx: 0.8, muted: false }}
        onChange={() => {}}
        onBack={() => {}}
      />,
    );
    expect(screen.queryByRole('button', { name: '구매 복원' })).not.toBeInTheDocument();
  });

  it('disables duplicate restore taps until the provider resolves', async () => {
    let resolveRestore!: () => void;
    const restore = vi.fn(() => new Promise<void>((resolve) => { resolveRestore = resolve; }));
    const { rerender } = render(
      <SettingsScreen
        settings={{ music: 0.7, sfx: 0.8, muted: false }}
        onChange={() => {}}
        onBack={() => {}}
        onRestorePurchases={restore}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '구매 복원' }));
    expect(restore).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: '구매 복원 중' })).toBeDisabled();

    await act(async () => {
      resolveRestore();
      await Promise.resolve();
    });
    rerender(
      <SettingsScreen
        settings={{ music: 0.7, sfx: 0.8, muted: false }}
        onChange={() => {}}
        onBack={() => {}}
        onRestorePurchases={restore}
      />,
    );
    expect(screen.getByRole('button', { name: '구매 복원' })).toBeEnabled();
  });

  it('moves focus to the settings heading when the screen opens', () => {
    render(
      <SettingsScreen
        settings={{ music: 0.7, sfx: 0.8, muted: false }}
        onChange={() => {}}
        onBack={() => {}}
      />,
    );

    expect(screen.getByRole('heading', { name: '설정' })).toHaveFocus();
  });

  it('normalizes malformed volume and mute values before rendering controls', () => {
    render(
      <SettingsScreen
        settings={{ music: Number.NaN, sfx: Number.POSITIVE_INFINITY, muted: 'yes' as never }}
        onChange={() => {}}
        onBack={() => {}}
      />,
    );

    expect(screen.getByRole('slider', { name: '음악 볼륨' })).toHaveValue('0');
    expect(screen.getByRole('slider', { name: '효과음 볼륨' })).toHaveValue('0');
    expect(screen.getByRole('checkbox', { name: '모든 소리 음소거' })).not.toBeChecked();
    expect(document.body.textContent).not.toContain('NaN');
    expect(document.body.textContent).not.toContain('Infinity');
  });
});
