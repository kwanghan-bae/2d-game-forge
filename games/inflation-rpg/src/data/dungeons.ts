import type { Dungeon } from '../types';

export const DUNGEONS: Dungeon[] = [
  {
    id: 'plains',
    nameKR: '평야',
    emoji: '🏘️',
    themeColor: '#7ab648',
    unlockGate: { type: 'start' },
    monsterPool: [
      'plains-imp', 'plains-rat', 'plains-crow', 'plains-bandit', 'plains-ronin',
      'slime', 'goblin',
    ],
    isHardOnly: false,
  },
  {
    id: 'forest',
    nameKR: '깊은숲',
    emoji: '🌲',
    themeColor: '#1e4620',
    unlockGate: { type: 'start' },
    monsterPool: [
      'forest-fox', 'forest-squirrel', 'forest-bear', 'forest-spirit', 'forest-snake',
      'slime', 'goblin', 'tiger',
    ],
    isHardOnly: false,
  },
  {
    id: 'mountains',
    nameKR: '산악',
    emoji: '⛰️',
    themeColor: '#7f8c8d',
    unlockGate: { type: 'start' },
    monsterPool: [
      'mountain-goat', 'mountain-bandit', 'mountain-eagle', 'mountain-miner', 'mountain-grey',
      'goblin', 'tiger',
    ],
    isHardOnly: false,
  },
];

export function getDungeonById(id: string): Dungeon | undefined {
  return DUNGEONS.find(d => d.id === id);
}

export function getStartDungeons(): Dungeon[] {
  return DUNGEONS.filter(d => d.unlockGate.type === 'start');
}
