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
