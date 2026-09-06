import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRealmForkPair } from '../../buff/realmForkCatalog';
import { RealmForkModal } from '../RealmForkModal';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('RealmForkModal timeout lifecycle', () => {
  it('keeps the original six-second deadline when the parent rerenders', () => {
    const firstResolve = vi.fn();
    const latestResolve = vi.fn();
    const pair = getRealmForkPair();
    const { rerender } = render(
      <RealmForkModal
        oldRealm="base"
        newRealm="sea"
        newRealmNameKR="바다"
        riskCard={pair.risk}
        safeCard={pair.safe}
        autoChoice="safe"
        onResolve={firstResolve}
      />,
    );

    act(() => { vi.advanceTimersByTime(5_000); });
    rerender(
      <RealmForkModal
        oldRealm="base"
        newRealm="sea"
        newRealmNameKR="바다"
        riskCard={pair.risk}
        safeCard={pair.safe}
        autoChoice="safe"
        onResolve={latestResolve}
      />,
    );
    act(() => { vi.advanceTimersByTime(1_000); });

    expect(firstResolve).not.toHaveBeenCalled();
    expect(latestResolve).toHaveBeenCalledTimes(1);
    expect(latestResolve).toHaveBeenCalledWith('safe');
  });
});
