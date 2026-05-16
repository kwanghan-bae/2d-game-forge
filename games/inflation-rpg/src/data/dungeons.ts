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
    bossIds: {
      mini: 'plains-ghost',
      major: 'spirit-post-guardian',
      sub: ['cursed-plains', 'plains-lord', 'goblin-chief'],
      final: 'gate-guardian',
    },
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
    bossIds: {
      mini: 'gumiho',
      major: 'tree-spirit',
      sub: ['black-tiger', 'cursed-tree-spirit', 'forest-ruler'],
      final: 'chaos-god',
    },
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
    bossIds: {
      mini: 'mountain-god',
      major: 'kumgang-spirit',
      sub: ['thunder-god', 'sky-mountain-lord', 'black-dragon'],
      final: 'jade-emperor',
    },
    isHardOnly: false,
  },
  {
    id: 'sea',
    nameKR: '해',
    emoji: '🌊',
    themeColor: '#2c3e50',
    unlockGate: { type: 'asc-tier', tier: 1 },
    monsterPool: [
      'coast-eel', 'coast-turtle', 'coast-crab', 'coast-mermaid', 'coast-deepfish',
    ],
    bossIds: {
      mini: 'wave-spirit',
      major: 'dragon-king-guard',
      sub: ['ice-sea-dragon', 'abyss-sea-ruler', 'dragon-king-guard'],
      final: 'true-sea-god',
    },
    isHardOnly: false,
  },
  {
    id: 'volcano',
    nameKR: '화산',
    emoji: '🌋',
    themeColor: '#c0392b',
    unlockGate: { type: 'asc-tier', tier: 3 },
    monsterPool: [
      'volcano-sprite', 'volcano-golem', 'volcano-wyrm', 'volcano-phoenix', 'volcano-lord',
    ],
    bossIds: {
      mini: 'ash-spirit',
      major: 'fire-warlord',
      sub: ['magma-king', 'volcano-heart', 'fire-warlord'],
      final: 'fire-sovereign',
    },
    isHardOnly: false,
  },
  {
    id: 'underworld',
    nameKR: '명계',
    emoji: '💀',
    themeColor: '#34495e',
    unlockGate: { type: 'asc-tier', tier: 5 },
    monsterPool: [
      'cave-bat', 'cave-spider', 'cave-miner-ghost', 'under-dead', 'under-reaper',
    ],
    bossIds: {
      mini: 'hell-gate-guard',
      major: 'yama-king',
      sub: ['grudge-general', 'ghost-king', 'hell-door-guardian'],
      final: 'death-reaper',
    },
    isHardOnly: false,
  },
  {
    id: 'heaven',
    nameKR: '천계',
    emoji: '☁️',
    themeColor: '#f1c40f',
    unlockGate: { type: 'asc-tier', tier: 8 },
    monsterPool: [
      'heaven-immortal', 'heaven-crane', 'heaven-horse', 'heaven-rabbit', 'heaven-phoenix',
    ],
    bossIds: {
      mini: 'cloud-guardian',
      major: 'celestial-garden-spirit',
      sub: ['thunder-celestial', 'celestial-lord', 'heaven-ruler'],
      final: 'jade-emperor',
    },
    isHardOnly: false,
  },
  {
    id: 'chaos',
    nameKR: '혼돈',
    emoji: '🌀',
    themeColor: '#8e44ad',
    unlockGate: { type: 'asc-tier', tier: 12 },
    monsterPool: [
      'chaos-shard', 'chaos-eroder', 'chaos-mutant', 'chaos-bubble', 'chaos-void',
    ],
    bossIds: {
      mini: 'void-boundary-lord',
      major: 'time-destroyer',
      sub: ['god-of-gods', 'primordial-chaos', 'void-boundary-lord'],
      final: 'final-boss',
    },
    isHardOnly: false,
  },
];

export function getDungeonById(id: string): Dungeon | undefined {
  return DUNGEONS.find(d => d.id === id);
}

export function getStartDungeons(): Dungeon[] {
  return DUNGEONS.filter(d => d.unlockGate.type === 'start');
}
