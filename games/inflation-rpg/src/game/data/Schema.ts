import { z } from 'zod';

export const MonsterSchema = z.object({
  id: z.number(),
  name: z.string(),
  hp: z.string(), // 수식 지원을 위해 string
  attack: z.string(),
  exp: z.number(),
  gold: z.number(),
});

export type MonsterData = z.infer<typeof MonsterSchema>;

export const ItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.string(),
  description: z.string(),
  price: z.number(),
  stats: z.object({
    atk: z.number().optional(),
    def: z.number().optional(),
    hp: z.number().optional(),
    agi: z.number().optional(),
    luk: z.number().optional(),
  }).optional(),
});

export type ItemData = z.infer<typeof ItemSchema>;
