import { describe, it, expect, vi } from 'vitest';

// Phaser cannot run in a test environment (no canvas/WebGL).
// The only exports we test here are pure helpers that don't touch Phaser at runtime.
// Mock the module so that Phaser's static initialisation does not execute.
// Phaser 3 ESM has no default export — export named members directly.
vi.mock('phaser', () => ({
  Scene: class Scene { constructor(_key: string) {} },
}));

import { generateMapLayout, GRID_W, GRID_H } from '../OverworldScene';
import { OverworldScene } from '../OverworldScene';
import type { RealmId } from '../../types';

describe('generateMapLayout', () => {
  it('returns a grid sized GRID_W × GRID_H', () => {
    const layout = generateMapLayout(42);
    expect(layout.tiles.length).toBe(GRID_H);
    expect(layout.tiles[0].length).toBe(GRID_W);
  });

  it('includes at least one village landmark', () => {
    const layout = generateMapLayout(42);
    const villages = layout.landmarks.filter(l => l.type.kind === 'village');
    expect(villages.length).toBeGreaterThanOrEqual(1);
  });

  it('places at least 12 enemy/boss landmarks', () => {
    const layout = generateMapLayout(42);
    const combatLandmarks = layout.landmarks.filter(l => l.type.kind === 'enemy' || l.type.kind === 'boss');
    expect(combatLandmarks.length).toBeGreaterThanOrEqual(12);
  });

  it('initial map has at least 19 total landmarks', () => {
    const layout = generateMapLayout(42);
    expect(layout.landmarks.length).toBeGreaterThanOrEqual(19);
  });

  it('landmark coordinates are within grid bounds', () => {
    const layout = generateMapLayout(42);
    for (const lm of layout.landmarks) {
      expect(lm.gridX).toBeGreaterThanOrEqual(0);
      expect(lm.gridX).toBeLessThan(GRID_W);
      expect(lm.gridY).toBeGreaterThanOrEqual(0);
      expect(lm.gridY).toBeLessThan(GRID_H);
    }
  });

  it('same seed produces same layout', () => {
    const a = generateMapLayout(99);
    const b = generateMapLayout(99);
    expect(a.landmarks.map(l => l.instanceId + ':' + l.gridX + ',' + l.gridY))
      .toEqual(b.landmarks.map(l => l.instanceId + ':' + l.gridX + ',' + l.gridY));
  });

  // V1c-1 — each new drift kind gets 2 instances so prior=0 heroes can still
  // reach the tier-3 personality threshold via ±3 drift × 2 visits.
  it.each([
    ['watchtower'],
    ['treasure_cave'],
    ['holy_ruin'],
    ['crossroads'],
  ] as const)('places at least 2 %s landmarks', (kindId) => {
    const layout = generateMapLayout(42);
    const matches = layout.landmarks.filter(l => l.type.kind === kindId);
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});

// Cycle-9 R1: pickNextDestination 의 columnBounds 가 hero 시작 column 과
// target column 을 항상 포함하도록 확장. cycle 8 finisher Mode 1 boundary
// cascade (hero 가 exit_a 도착 후 realm 이 sea 로 flip 되지만 hero gridX
// 는 colEnd-1 = 19 인 채 다음 pick 의 columnBounds [20,40] 가 start 를
// BLOCK → F4 retry) 를 차단한다.
//
// computeColumnBounds 는 순수 메서드라 Phaser runtime 부재에서도 호출 가능.
// init/create 를 거치지 않고 scene 인스턴스의 private 필드를 직접 세팅
// 한다 (test-only 접근, public API surface 추가 회피).
describe('OverworldScene.computeColumnBounds — Cycle-9 R1', () => {
  function makeScene(currentRealm: RealmId | undefined): OverworldScene {
    const scene = new OverworldScene();
    // currentRealm 은 private 이지만 테스트에선 정상 사용자 흐름 (init →
    // setCurrentRealm) 대신 직접 세팅한다. setCurrentRealm 도 setter 인데
    // 인자가 RealmId 라서 undefined 케이스 표현 불가 → reflective 접근.
    (scene as unknown as { currentRealm: RealmId | undefined }).currentRealm = currentRealm;
    return scene;
  }

  it('R1 Case 1: 정상 (hero col 5, target col 10, realm base) → [0,20] 유지', () => {
    const scene = makeScene('base');
    expect(scene.computeColumnBounds(5, 10)).toEqual([0, 20]);
  });

  it('R1 Case 2: realm-boundary cascade 방어 — hero col 19 (exit_a 잔류), realm flipped to sea → bounds 가 col 19 를 포함', () => {
    // sea.columnRange = [20,40]. cycle 8 Mode 1 시나리오 정확히 재현.
    // bounds 가 hero start col 19 를 BLOCK 하지 않도록 cMin <= 19.
    const scene = makeScene('sea');
    const bounds = scene.computeColumnBounds(19, 25);
    expect(bounds).not.toBeUndefined();
    const [cMin, cMax] = bounds!;
    expect(cMin).toBeLessThanOrEqual(19);
    expect(cMax).toBeGreaterThanOrEqual(40); // sea range 유지
    expect(cMax).toBeGreaterThan(25); // target 도 포함
  });

  it('R1 Case 3: exit_b target (col 20) — current realm base, bounds 가 col 20 도 walkable', () => {
    // base.columnRange = [0,20]. exit_b at col 20 (sea entry). 기존
    // [0,20) 은 col 20 을 BLOCK 했음. 이제 cMax >= 21.
    const scene = makeScene('base');
    const bounds = scene.computeColumnBounds(9, 20);
    expect(bounds).not.toBeUndefined();
    const [cMin, cMax] = bounds!;
    expect(cMin).toBe(0);
    expect(cMax).toBeGreaterThanOrEqual(21); // target col 20 포함
  });

  it('R1 Case 4: currentRealm undefined → bounds undefined (pathfinder unconstrained)', () => {
    const scene = makeScene(undefined);
    expect(scene.computeColumnBounds(5, 10)).toBeUndefined();
  });

  it('R1 Case 5: hero 가 이미 realm 밖 (cycle-8 cascade 잔존) — bounds 가 hero col + realm range 모두 포함', () => {
    // cycle-8 warning 4: `hero (100,7) realm=volcano`. volcano range [40,60].
    // R1 fix 후 bounds = [min(40, 100, target), max(60, 101, target+1)].
    // target=57 가정 (cycle-8 warning 그대로).
    const scene = makeScene('volcano');
    const bounds = scene.computeColumnBounds(100, 57);
    expect(bounds).not.toBeUndefined();
    const [cMin, cMax] = bounds!;
    expect(cMin).toBeLessThanOrEqual(40);
    expect(cMin).toBeLessThanOrEqual(57);
    expect(cMax).toBeGreaterThan(100); // hero col 포함
    expect(cMax).toBeGreaterThan(57); // target 포함
  });
});
