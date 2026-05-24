import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpendModal, BUFF_CATEGORY, CATEGORY_LABEL_KR } from '../SpendModal';
import { BUFF_CATALOG } from '../../buff/catalog';
import { useGameStore } from '../../store/gameStore';
import { useCycleStoreV2 } from '../../overworld/cycleSliceV2';

describe('Cycle 4 B2 — SpendModal 카테고리 탭 (Hick\'s Law mitigation)', () => {
  beforeEach(() => {
    useCycleStoreV2.getState().reset();
    // 충분한 light 으로 disabled 변동 영향 최소화
    useGameStore.setState(s => ({ ...s, meta: { ...s.meta, light: 100000 } }));
  });

  it('catalog 7 buff 모두 카테고리 배정', () => {
    for (const def of BUFF_CATALOG) {
      expect(BUFF_CATEGORY[def.id]).toBeDefined();
    }
  });

  it('각 카테고리 ≥ 1, max 3 buff', () => {
    const counts: Record<string, number> = { movement: 0, resource: 0, time: 0, misc: 0 };
    for (const def of BUFF_CATALOG) {
      counts[BUFF_CATEGORY[def.id]] += 1;
    }
    for (const c of ['movement', 'resource', 'time', 'misc'] as const) {
      expect(counts[c]).toBeGreaterThanOrEqual(1);
      expect(counts[c]).toBeLessThanOrEqual(3);
    }
  });

  it('CATEGORY_LABEL_KR 4 카테고리 모두 한글', () => {
    for (const c of ['movement', 'resource', 'time', 'misc'] as const) {
      expect(CATEGORY_LABEL_KR[c]).toMatch(/^[가-힣]+$/);
    }
  });

  it('모달 진입 시 4 탭 + movement 탭 selected', () => {
    render(<SpendModal onClose={() => {}} />);
    expect(screen.getByTestId('spend-tab-movement')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('spend-tab-resource')).toBeInTheDocument();
    expect(screen.getByTestId('spend-tab-time')).toBeInTheDocument();
    expect(screen.getByTestId('spend-tab-misc')).toBeInTheDocument();
  });

  it('movement 탭에서 move_speed 만 노출 (다른 buff card 0)', () => {
    render(<SpendModal onClose={() => {}} />);
    expect(screen.getByTestId('buff-card-move_speed')).toBeInTheDocument();
    expect(screen.queryByTestId('buff-card-drop_chance')).toBeNull();
    expect(screen.queryByTestId('buff-card-light_rate')).toBeNull();
    expect(screen.queryByTestId('buff-card-rejuv_discount')).toBeNull();
    expect(screen.queryByTestId('buff-card-aging_slow')).toBeNull();
    expect(screen.queryByTestId('buff-card-field_diff')).toBeNull();
  });

  it('resource 탭 클릭 시 drop_chance + light_rate 노출', () => {
    render(<SpendModal onClose={() => {}} />);
    fireEvent.click(screen.getByTestId('spend-tab-resource'));
    expect(screen.getByTestId('buff-card-drop_chance')).toBeInTheDocument();
    expect(screen.getByTestId('buff-card-light_rate')).toBeInTheDocument();
    expect(screen.queryByTestId('buff-card-move_speed')).toBeNull();
  });

  it('time 탭 클릭 시 rejuv_discount + aging_slow + oneshot_rejuv 노출 (≤3)', () => {
    render(<SpendModal onClose={() => {}} />);
    fireEvent.click(screen.getByTestId('spend-tab-time'));
    expect(screen.getByTestId('buff-card-rejuv_discount')).toBeInTheDocument();
    expect(screen.getByTestId('buff-card-aging_slow')).toBeInTheDocument();
    // oneshot_rejuv 는 isOneShot 으로 BuffCard 가 아닌 별도 카드로 렌더
    expect(screen.getByTestId('buff-oneshot-rejuv-1')).toBeInTheDocument();
    expect(screen.queryByTestId('buff-card-move_speed')).toBeNull();
  });

  it('misc 탭 클릭 시 field_diff 만 노출', () => {
    render(<SpendModal onClose={() => {}} />);
    fireEvent.click(screen.getByTestId('spend-tab-misc'));
    expect(screen.getByTestId('buff-card-field_diff')).toBeInTheDocument();
    expect(screen.queryByTestId('buff-card-move_speed')).toBeNull();
    expect(screen.queryByTestId('buff-card-drop_chance')).toBeNull();
  });

  it('PRD acceptance: 한 화면 visible buff ≤ 3 (모든 탭)', () => {
    const { container } = render(<SpendModal onClose={() => {}} />);
    const countCards = () => {
      const cards = container.querySelectorAll('[data-testid^="buff-card-"]');
      const oneshots = container.querySelectorAll('[data-testid^="buff-oneshot-"]');
      return cards.length + oneshots.length;
    };
    // movement: 1
    expect(countCards()).toBeLessThanOrEqual(3);
    fireEvent.click(screen.getByTestId('spend-tab-resource'));
    expect(countCards()).toBeLessThanOrEqual(3);
    fireEvent.click(screen.getByTestId('spend-tab-time'));
    expect(countCards()).toBeLessThanOrEqual(3);
    fireEvent.click(screen.getByTestId('spend-tab-misc'));
    expect(countCards()).toBeLessThanOrEqual(3);
  });
});
