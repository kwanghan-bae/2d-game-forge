/**
 * Cycle 6 P0 — Reload 시 활성 cycle 증발 회귀 가드.
 *
 * 정찰 finding: 4분 플레이 (LV 813006) → page reload → MainMenu 가 "이어하기"
 * 버튼을 못 띄움. Root cause: heroSnapshot 은 "메인 메뉴" 버튼 클릭 경로에서만
 * persist 되어 page reload / 앱 강제 종료 / 브라우저 충돌 시 null 인 채로
 * 다음 부팅을 맞이함.
 *
 * Fix: OverworldRunner 의 arrived_at handler 가 매 arrival 마다
 * `saveHeroSnapshot(controller.getHero().serialize(seed))` 를 호출한다.
 *
 * 본 테스트는 두 부분 모두 가드:
 *  1) Store contract — saveHeroSnapshot → run.heroSnapshot non-null 후 selector
 *     가 "이어하기" 분기 반환 (MainMenu 가 read 하는 동일 경로).
 *  2) Controller serialize round-trip — 임의 상태로 진행한 hero 를 직렬화하면
 *     LV / age 등이 유지되어 다음 cycle 부팅에서 동일 hero 로 복원 가능.
 */

import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MainMenu } from '../MainMenu';
import { useGameStore, INITIAL_RUN, INITIAL_META } from '../../store/gameStore';
import { CycleControllerV2 } from '../../overworld/CycleControllerV2';
import type { HeroSnapshot } from '../../hero/HeroEntity';

beforeEach(() => {
  useGameStore.setState({ screen: 'main-menu', run: INITIAL_RUN, meta: INITIAL_META });
});

describe('cycle-6 P0 — run-resume after reload', () => {
  it('saveHeroSnapshot 후 MainMenu 가 "이어하기" 버튼을 노출한다', () => {
    // page reload 직전과 동일한 상태 합성 — run.heroSnapshot 만 non-null
    const ctrl = new CycleControllerV2({
      seed: 12345,
      traits: [],
      heroHpMax: 100,
      heroAtkBase: 50,
    });
    const snapshot = ctrl.getHero().serialize(ctrl.getSeed());
    useGameStore.getState().saveHeroSnapshot(snapshot);

    expect(useGameStore.getState().run.heroSnapshot).not.toBeNull();
    expect(useGameStore.getState().run.heroSnapshot?.name).toBe(snapshot.name);

    render(<MainMenu />);
    // 이어하기 버튼이 visible — 정찰의 screen-08 에선 없었음.
    expect(screen.getByTestId('btn-resume-cycle')).toBeInTheDocument();
    // "새 사이클 시작" 도 여전히 노출되지만 opacity 0.7 로 secondary 처리.
    expect(screen.getByTestId('btn-start-cycle')).toBeInTheDocument();
  });

  it('clearHeroSnapshot 후 MainMenu 가 "이어하기" 버튼을 숨긴다', () => {
    // 정상 cycle 종료 → clearHeroSnapshot → 다음 부팅엔 "새 사이클 시작" 만.
    const snapshot: HeroSnapshot = {
      name: '테스트', emoji: '🧒', age: 5, chapter: '어린시절', job: '평민',
      level: 100, exp: 0, hp: 50, hpMax: 100, atk: 100, atkBase: 50, hpBase: 100,
      actionCount: 0, rejuvenationCount: 0, gridX: 0, gridY: 0,
      equipment: [], personality: { moral: 0, prudent: 0, heroic: 0, merciful: 0, pious: 0 },
      unlockedJobId: null, unlockedMilestones: [], learnedSkillIds: [], seed: 1,
    };
    useGameStore.getState().saveHeroSnapshot(snapshot);
    expect(useGameStore.getState().run.heroSnapshot).not.toBeNull();

    useGameStore.getState().clearHeroSnapshot();
    expect(useGameStore.getState().run.heroSnapshot).toBeNull();

    render(<MainMenu />);
    expect(screen.queryByTestId('btn-resume-cycle')).toBeNull();
    expect(screen.getByTestId('btn-start-cycle')).toBeInTheDocument();
  });

  it('handleArrival 다회 후 직렬화한 snapshot 이 진행 상태를 반영한다', () => {
    // 본 fix 의 핵심 — OverworldRunner 가 매 arrival 마다 호출하는 흐름의 sim.
    // 단순 단조 호출만 검증 (Phaser 없이): handleArrival → serialize → save 가
    // age / actionCount 가 0 이 아닌 의미 있는 값을 담아내는지.
    const ctrl = new CycleControllerV2({
      seed: 99,
      traits: [],
      heroHpMax: 100,
      heroAtkBase: 50,
    });
    ctrl.setCurrentRealmId('base');

    const initialAge = ctrl.getHero().age;
    // 여러 번 plain landmark 도착 — age 가 진행하도록.
    for (let i = 0; i < 30; i++) {
      ctrl.handleArrival('enemy', `enemy_${i}`);
    }
    const heroAfter = ctrl.getHero();
    // age 또는 actionCount 가 전진했는지 — 둘 중 하나만 진전해도 valid sim 진행.
    expect(heroAfter.actionCount).toBeGreaterThan(0);
    expect(heroAfter.age).toBeGreaterThanOrEqual(initialAge);

    const snap = heroAfter.serialize(ctrl.getSeed());
    useGameStore.getState().saveHeroSnapshot(snap);

    const stored = useGameStore.getState().run.heroSnapshot;
    expect(stored).not.toBeNull();
    expect(stored?.actionCount).toBe(heroAfter.actionCount);
    expect(stored?.age).toBe(heroAfter.age);
    expect(stored?.level).toBe(heroAfter.level);
  });

  it('reload simulation: snapshot 으로 새 controller 부팅 시 hero state 가 복원된다', () => {
    // 본 P0 의 end-to-end 의미: snapshot 만 살아있어도 LV / age 가 reset 안 되어야.
    const seed = 4242;
    const ctrlA = new CycleControllerV2({
      seed, traits: [], heroHpMax: 100, heroAtkBase: 50,
    });
    ctrlA.setCurrentRealmId('base');
    for (let i = 0; i < 20; i++) {
      ctrlA.handleArrival('enemy', `enemy_${i}`);
    }
    const heroBefore = ctrlA.getHero();
    const snap = heroBefore.serialize(ctrlA.getSeed());

    // 새 cycle controller — heroSnapshot 만 전달 (reload 후 cycleSliceV2.start
    // 가 자동 hydrate 하는 경로와 동일).
    const ctrlB = new CycleControllerV2({
      seed, traits: [], heroHpMax: 100, heroAtkBase: 50,
      heroSnapshot: snap,
    });
    const heroAfter = ctrlB.getHero();
    expect(heroAfter.name).toBe(heroBefore.name);
    expect(heroAfter.level).toBe(heroBefore.level);
    expect(heroAfter.age).toBe(heroBefore.age);
    expect(heroAfter.actionCount).toBe(heroBefore.actionCount);
    expect(heroAfter.rejuvenationCount).toBe(heroBefore.rejuvenationCount);
  });
});
