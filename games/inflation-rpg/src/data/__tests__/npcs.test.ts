import { describe, it, expect } from 'vitest';
import { NPC_TEMPLATES, getNpcKindEmoji } from '../npcs';
import type { NpcEntity } from '../../types';

describe('Cycle 267 — getNpcKindEmoji helper (UI guide visual hierarchy 회수)', () => {
  const ALL_KINDS: NpcEntity['kind'][] = ['rival', 'mentor', 'friend', 'family_parent', 'family_spouse', 'family_child'];

  it('각 6 kind 모두 ≥ 1 emoji 반환 (NPC_TEMPLATES 정합)', () => {
    for (const kind of ALL_KINDS) {
      const emoji = getNpcKindEmoji(kind);
      expect(emoji).not.toBe('?');
      expect(emoji.length).toBeGreaterThan(0);
    }
  });

  it('NPC_TEMPLATES 의 첫 emoji 와 일치 (deterministic)', () => {
    for (const tpl of NPC_TEMPLATES) {
      expect(getNpcKindEmoji(tpl.kind)).toBe(tpl.emojis[0]);
    }
  });
});
