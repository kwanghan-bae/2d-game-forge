import { fireEvent, render, screen } from '@testing-library/react';
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
});
