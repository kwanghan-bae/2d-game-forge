import { describe, it, expect } from 'vitest';
import {
  getBlacksmithDialogue,
  getCharacterReforgeReaction,
  BLACKSMITH_DIALOGUES,
  CHARACTER_REFORGE_REACTIONS,
} from '../blacksmithFlavor';

describe('C1036: Blacksmith NPC & Character Reforge Flavor Tests', () => {
  it('returns valid dialogue for all blacksmith outcomes', () => {
    const outcomes = ['welcome', 'success', 'great_success', 'failure', 'max_level', 'dismantle'] as const;
    for (const outcome of outcomes) {
      const dialogue = getBlacksmithDialogue(outcome, 0);
      expect(typeof dialogue).toBe('string');
      expect(dialogue.length).toBeGreaterThan(5);
      expect(BLACKSMITH_DIALOGUES[outcome]).toContain(dialogue);
    }
  });

  it('cycles dialogue deterministically with index param', () => {
    const d0 = getBlacksmithDialogue('success', 0);
    const d1 = getBlacksmithDialogue('success', 1);
    const d3 = getBlacksmithDialogue('success', 3);

    expect(d0).not.toBe(d1);
    expect(d0).toBe(d3); // modulo cycle
  });

  it('provides unique archetype reactions for warrior, mage, rogue, tank', () => {
    const warriorSuccess = getCharacterReforgeReaction('hwarang', 'success');
    const mageSuccess = getCharacterReforgeReaction('mudang', 'success');
    const rogueSuccess = getCharacterReforgeReaction('geomgaek', 'success');
    const tankSuccess = getCharacterReforgeReaction('choeui', 'success');

    expect(warriorSuccess).toContain('베는');
    expect(mageSuccess).toContain('마력');
    expect(rogueSuccess).toContain('급소');
    expect(tankSuccess).toContain('묵직하군');

    expect(warriorSuccess).not.toBe(mageSuccess);
  });

  it('provides great_success and safe failure reactions for all archetypes', () => {
    const archetypes = Object.keys(CHARACTER_REFORGE_REACTIONS) as (keyof typeof CHARACTER_REFORGE_REACTIONS)[];
    for (const arc of archetypes) {
      expect(CHARACTER_REFORGE_REACTIONS[arc].great_success.length).toBeGreaterThan(0);
      expect(CHARACTER_REFORGE_REACTIONS[arc].failure.length).toBeGreaterThan(0);
      expect(CHARACTER_REFORGE_REACTIONS[arc].max_level.length).toBeGreaterThan(0);
    }
  });

  it('defaults gracefully for unknown character id', () => {
    const reaction = getCharacterReforgeReaction('unknown_hero', 'success');
    expect(reaction).toBe(CHARACTER_REFORGE_REACTIONS.warrior.success);
  });
});
