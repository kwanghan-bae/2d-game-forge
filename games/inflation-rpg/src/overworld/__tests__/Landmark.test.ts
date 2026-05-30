import { describe, it, expect } from 'vitest';
import { filterCandidatesByRealm, type PlacedLandmark } from '../Landmark';
import type { LandmarkType } from '../../data/landmarks';

// Cycle-8 C1: target selection 단계에서 cross-realm non-exit target 제외.
//
// hot path 의 root cause = OverworldScene.pickNextDestination 의
// columnBounds 가 currentRealm 만 적용하여 target 이 다른 realm 의 column
// (예: hero=base[0,20], target=sea[20,40]) 일 때 pathfinder 가 매번 fail →
// F4 retry 가 4분 idle 89 회 발동. C1 fix = candidate selection 단계에서
// hero realm 의 columnRange 밖 non-exit target 을 사전 제외.
//
// exit landmark 는 column 무관 통과 (cross-realm transition path 보장).

function mkType(kind: 'enemy' | 'boss' | 'shrine' | 'exit' | 'cave', id = kind): LandmarkType {
  return { id, kind, emoji: 'x', nameKR: 'x' } as LandmarkType;
}

function mkLm(gridX: number, kind: 'enemy' | 'boss' | 'shrine' | 'exit' | 'cave', instanceId?: string): PlacedLandmark {
  return {
    instanceId: instanceId ?? `${kind}_${gridX}`,
    type: mkType(kind),
    gridX,
    gridY: 5,
    consumed: false,
  };
}

describe('filterCandidatesByRealm — Cycle-8 C1', () => {
  it('Case 1: hero=base + target col 25 (sea) 는 candidates 에서 제외', () => {
    // base columnRange = [0,20], sea columnRange = [20,40].
    const candidates: PlacedLandmark[] = [
      mkLm(5, 'enemy', 'base_enemy'),
      mkLm(25, 'enemy', 'sea_enemy'),
    ];
    const filtered = filterCandidatesByRealm(candidates, 'base');
    expect(filtered.map(l => l.instanceId)).toEqual(['base_enemy']);
  });

  it('Case 2: hero=base + target col 10 (base) — normal case 통과', () => {
    const candidates: PlacedLandmark[] = [
      mkLm(5, 'enemy', 'a'),
      mkLm(10, 'shrine', 'b'),
      mkLm(15, 'cave', 'c'),
    ];
    const filtered = filterCandidatesByRealm(candidates, 'base');
    expect(filtered.map(l => l.instanceId)).toEqual(['a', 'b', 'c']);
  });

  it('Case 3: exit landmark 는 column 무관 항상 통과 (cross-realm transition 보장)', () => {
    // base columnRange = [0,20]. exit_b 는 col 20 (sea 첫 column) 에 위치
    // 하지만 transition 후보로 남아야 함.
    const candidates: PlacedLandmark[] = [
      mkLm(19, 'exit', 'exit_a_in_base'),
      mkLm(20, 'exit', 'exit_b_in_sea'),
      mkLm(25, 'enemy', 'sea_enemy_blocked'),
    ];
    const filtered = filterCandidatesByRealm(candidates, 'base');
    expect(filtered.map(l => l.instanceId).sort()).toEqual([
      'exit_a_in_base',
      'exit_b_in_sea',
    ]);
  });

  it('Case 4: currentRealm undefined → filter 미적용 (모든 candidate 통과)', () => {
    const candidates: PlacedLandmark[] = [
      mkLm(5, 'enemy', 'a'),
      mkLm(50, 'boss', 'b'),
    ];
    const filtered = filterCandidatesByRealm(candidates, undefined);
    expect(filtered.map(l => l.instanceId)).toEqual(['a', 'b']);
  });

  it('Case 5: hero=sea + target col 5 (base, hero 뒤로) — non-exit 차단', () => {
    // 회귀 방향: hero 가 sea realm 일 때 base 의 잔존 enemy 가 후보로 안 들어옴
    // (현재 cycle 의 stale-realm 변형 차단).
    const candidates: PlacedLandmark[] = [
      mkLm(5, 'enemy', 'base_leftover'),
      mkLm(25, 'enemy', 'sea_present'),
      mkLm(35, 'shrine', 'sea_shrine'),
    ];
    const filtered = filterCandidatesByRealm(candidates, 'sea');
    expect(filtered.map(l => l.instanceId).sort()).toEqual([
      'sea_present',
      'sea_shrine',
    ]);
  });

  it('Case 6: filter 가 모두 제거한다면 (예: hero realm 안에 후보 0) → exit 만 남음', () => {
    // exit 만 통과해도 transition 으로 풀림. fallback empty 처리는 caller 책임.
    const candidates: PlacedLandmark[] = [
      mkLm(25, 'enemy', 'sea_enemy'),
      mkLm(19, 'exit', 'exit_a'),
    ];
    const filtered = filterCandidatesByRealm(candidates, 'base');
    expect(filtered.map(l => l.instanceId)).toEqual(['exit_a']);
  });
});

// Cycle-9 R2: cross-realm exit candidate audit. cycle-8 postsim 의 11/11
// fallback 모두 Mode 2 (cross-realm 2+ jump exit pick) 또는 그 cascade
// (Mode 1 = hero 가 cross-realm jump 후 scene realm 에서 column out-of-range)
// 로 분류됨. R2 fix 는 exit candidate 의 column 검증을 추가:
//   - exit 은 currentRealm.columnRange 안 (= "_a" side at colEnd-1) 또는
//   - nextRealm.columnRange[0] (= "_b" side, 인접 next realm 의 첫 column)
//     에만 위치해야 통과. 그 외 (= 2+ realm jump) 은 거부.
describe('filterCandidatesByRealm — Cycle-9 R2 cross-realm exit audit', () => {
  it('R2 Case 1: hero=base + 2-realm-jump exit (col 79 = underworld→heaven) 차단', () => {
    // base columnRange [0,20], sea(next) columnRange [20,40].
    // col 79 = _underworld_to_heaven_a 위치. base hero 는 reach 불가.
    // cycle-8 warning 1 (`hero (9,7) target (79,6) realm=base`) 재현.
    const candidates: PlacedLandmark[] = [
      mkLm(5, 'enemy', 'base_enemy'),
      mkLm(79, 'exit', 'underworld_to_heaven_a'),
    ];
    const filtered = filterCandidatesByRealm(candidates, 'base');
    expect(filtered.map(l => l.instanceId)).toEqual(['base_enemy']);
  });

  it('R2 Case 2: hero=base + 1-realm exit entry (col 20 = sea entry) 통과', () => {
    // sea = base.nextRealm. col 20 = sea.columnRange[0]. 정상 transition.
    const candidates: PlacedLandmark[] = [
      mkLm(20, 'exit', 'sea_from_base_b'),
    ];
    const filtered = filterCandidatesByRealm(candidates, 'base');
    expect(filtered.map(l => l.instanceId)).toEqual(['sea_from_base_b']);
  });

  it('R2 Case 3: hero=base + currentRealm-side exit (col 19) 통과', () => {
    // col 19 = base.columnRange[1] - 1. _base_to_sea_a 위치.
    const candidates: PlacedLandmark[] = [
      mkLm(19, 'exit', 'base_to_sea_a'),
    ];
    const filtered = filterCandidatesByRealm(candidates, 'base');
    expect(filtered.map(l => l.instanceId)).toEqual(['base_to_sea_a']);
  });

  it('R2 Case 4: hero=base + exit at col 21 (sea 내부, entry 아님) 차단', () => {
    // sea.columnRange[0] = 20. col 21 은 entry 가 아니라 sea 내부 → 거부.
    // 실제 mapLayout 은 이런 exit 을 생성하지 않지만 미래 regression 방어.
    const candidates: PlacedLandmark[] = [
      mkLm(21, 'exit', 'fake_exit_in_sea_middle'),
    ];
    const filtered = filterCandidatesByRealm(candidates, 'base');
    expect(filtered).toEqual([]);
  });

  it('R2 Case 5: hero=sea + exit at col 100 (heaven→chaos a) 차단 (2+ jump)', () => {
    // sea.nextRealm = volcano (columnRange[0]=40). col 100 = 2 realm 건너뜀.
    // cycle-8 warning 3 (`hero (38,6) target (100,7) realm=sea`) 재현.
    const candidates: PlacedLandmark[] = [
      mkLm(35, 'enemy', 'sea_enemy'),
      mkLm(100, 'exit', 'heaven_to_chaos_a'),
    ];
    const filtered = filterCandidatesByRealm(candidates, 'sea');
    expect(filtered.map(l => l.instanceId)).toEqual(['sea_enemy']);
  });

  it('R2 Case 6: hero=chaos (nextRealm null) + 모든 exit 차단', () => {
    // chaos.nextRealm = null. chaos hero 는 exit 후보 자체가 의미 없음.
    // 모든 exit 은 chaos.columnRange [100,120] 밖에 있고 nextEntryCol 도 없음.
    const candidates: PlacedLandmark[] = [
      mkLm(105, 'enemy', 'chaos_enemy'),
      mkLm(19, 'exit', 'base_to_sea_a'),
      mkLm(40, 'exit', 'volcano_from_sea_b'),
    ];
    const filtered = filterCandidatesByRealm(candidates, 'chaos');
    expect(filtered.map(l => l.instanceId)).toEqual(['chaos_enemy']);
  });
});

// C737: landmarkToCandidate realm-based difficulty
import { landmarkToCandidate } from '../Landmark';

describe('landmarkToCandidate — C737 realm-based difficulty', () => {
  it('boss in base realm → difficulty = fieldLevelRange[0] = 1', () => {
    const lm = mkLm(5, 'boss', 'base_boss_1');
    const c = landmarkToCandidate(lm, 'base');
    expect(c.difficulty).toBe(1);
  });

  it('boss in sea realm → difficulty = 50', () => {
    const lm = mkLm(25, 'boss', 'sea_boss_1');
    const c = landmarkToCandidate(lm, 'sea');
    expect(c.difficulty).toBe(50);
  });

  it('boss in volcano realm → difficulty = 500', () => {
    const lm = mkLm(45, 'boss', 'vol_boss_1');
    const c = landmarkToCandidate(lm, 'volcano');
    expect(c.difficulty).toBe(500);
  });

  it('enemy in sea realm → difficulty = 50 × 0.5 = 25', () => {
    const lm = mkLm(25, 'enemy', 'sea_enemy_1');
    const c = landmarkToCandidate(lm, 'sea');
    expect(c.difficulty).toBe(25);
  });

  it('non-combat (shrine) → difficulty = 0 regardless of realm', () => {
    const lm = mkLm(25, 'shrine', 'sea_shrine_1');
    const c = landmarkToCandidate(lm, 'sea');
    expect(c.difficulty).toBe(0);
  });

  it('fallback: no realmId → legacy hardcoded difficulty (boss=3, enemy=1)', () => {
    const lm = mkLm(5, 'boss', 'fallback_boss');
    const c = landmarkToCandidate(lm);
    expect(c.difficulty).toBe(3);
  });
});
