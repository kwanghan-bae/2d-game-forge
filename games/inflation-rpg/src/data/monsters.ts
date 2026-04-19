import type { Monster } from '../types';

export const MONSTERS: Monster[] = [
  { id: 'slime',    nameKR: '슬라임',    emoji: '🟢', levelMin: 1,     levelMax: 100,    hpMult: 1.0, atkMult: 0.8,  defMult: 0.5,  expMult: 1.0,  goldMult: 1.0,  isBoss: false },
  { id: 'goblin',   nameKR: '도깨비',    emoji: '👺', levelMin: 50,    levelMax: 500,    hpMult: 1.2, atkMult: 1.0,  defMult: 0.8,  expMult: 1.1,  goldMult: 1.1,  isBoss: false },
  { id: 'tiger',    nameKR: '호랑이',    emoji: '🐯', levelMin: 200,   levelMax: 2000,   hpMult: 1.5, atkMult: 1.3,  defMult: 1.0,  expMult: 1.3,  goldMult: 1.2,  isBoss: false },
  { id: 'dragon',   nameKR: '용',        emoji: '🐉', levelMin: 1000,  levelMax: 10000,  hpMult: 2.0, atkMult: 1.8,  defMult: 1.5,  expMult: 1.8,  goldMult: 1.5,  isBoss: false },
  { id: 'ghost',    nameKR: '귀신',      emoji: '👻', levelMin: 500,   levelMax: 5000,   hpMult: 0.8, atkMult: 1.5,  defMult: 0.5,  expMult: 1.4,  goldMult: 1.3,  isBoss: false },
  { id: 'undead',   nameKR: '망자',      emoji: '💀', levelMin: 5000,  levelMax: 50000,  hpMult: 1.8, atkMult: 1.6,  defMult: 1.3,  expMult: 1.7,  goldMult: 1.4,  isBoss: false },
  { id: 'deity',    nameKR: '신수',      emoji: '🌟', levelMin: 20000, levelMax: 200000, hpMult: 2.5, atkMult: 2.2,  defMult: 2.0,  expMult: 2.0,  goldMult: 1.8,  isBoss: false },
  { id: 'chaos',    nameKR: '혼돈체',    emoji: '🌀', levelMin: 100000,levelMax: Infinity,hpMult: 3.0, atkMult: 2.8, defMult: 2.5,  expMult: 2.5,  goldMult: 2.0,  isBoss: false },
];

export function getMonstersForLevel(level: number): Monster[] {
  return MONSTERS.filter(m => m.levelMin <= level && m.levelMax >= level);
}

export function pickMonster(level: number): Monster {
  const pool = getMonstersForLevel(level);
  if (pool.length === 0) return MONSTERS[MONSTERS.length - 1]!;
  return pool[Math.floor(Math.random() * pool.length)]!;
}
