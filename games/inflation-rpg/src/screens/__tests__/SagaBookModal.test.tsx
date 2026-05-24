import { describe, it, expect } from 'vitest';
import { matchesFilter } from '../SagaBookModal';

describe('Cycle 1 F3 — SagaBookModal matchesFilter npc 매핑 확장', () => {
  it('F3.12: matchesFilter("npc", ...) 가 NPC event 4 종 + 기존 매핑 포함', () => {
    // Cycle-1 F3 신규 — npc dead-path 회수 (camelCase SagaEventType)
    expect(matchesFilter('npcEncounter', 'npc')).toBe(true);
    expect(matchesFilter('npcDeath', 'npc')).toBe(true);
    expect(matchesFilter('familyEvent', 'npc')).toBe(true);
    // 기존 매핑 회귀 가드
    expect(matchesFilter('moralChoice', 'npc')).toBe(true);
    expect(matchesFilter('shrine', 'npc')).toBe(true);
  });

  it('F3.12b: matchesFilter("npc", ...) 가 무관한 type 은 false', () => {
    expect(matchesFilter('battle', 'npc')).toBe(false);
    expect(matchesFilter('levelUp', 'npc')).toBe(false);
    expect(matchesFilter('drop', 'npc')).toBe(false);
    expect(matchesFilter('realmEnter', 'npc')).toBe(false);
    expect(matchesFilter('seasonChange', 'npc')).toBe(false);
  });

  it('all filter 회귀: 어떤 type 이든 true', () => {
    expect(matchesFilter('npcEncounter', 'all')).toBe(true);
    expect(matchesFilter('realmEnter', 'all')).toBe(true);
    expect(matchesFilter('battle', 'all')).toBe(true);
  });
});
