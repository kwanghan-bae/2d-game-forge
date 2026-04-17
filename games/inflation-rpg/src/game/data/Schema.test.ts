import { describe, it, expect } from 'vitest';
import { MonsterSchema, ItemSchema } from './Schema';

describe('Zod Schemas', () => {
  describe('MonsterSchema', () => {
    it('should validate a valid monster object', () => {
      const validMonster = {
        id: 1,
        name: 'Slime',
        hp: '10 + level * 2',
        attack: '5',
        exp: 10,
        gold: 5,
      };
      const result = MonsterSchema.safeParse(validMonster);
      expect(result.success).toBe(true);
    });

    it('should fail on missing fields', () => {
      const invalidMonster = {
        id: 1,
        name: 'Slime',
      };
      const result = MonsterSchema.safeParse(invalidMonster);
      expect(result.success).toBe(false);
    });
  });

  describe('ItemSchema', () => {
    it('should validate a valid item object', () => {
      const validItem = {
        id: 1001,
        name: 'Sword',
        type: 'weapon',
        description: 'A sharp blade',
        price: 100,
        stats: {
          atk: 10,
        },
      };
      const result = ItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });

    it('should validate an item without stats', () => {
      const validItem = {
        id: 1001,
        name: 'Potion',
        type: 'consumable',
        description: 'Heals 50 HP',
        price: 50,
      };
      const result = ItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });
  });
});
