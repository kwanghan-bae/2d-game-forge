import type { Boss } from '../types';

export const BOSSES: Boss[] = [
  // Normal mode (9)
  { id: 'goblin-chief',   nameKR: '도깨비 대장',  emoji: '👹', areaId: 'goblin-pass',      bpReward: 3, isHardMode: false, hpMult: 10, atkMult: 2 },
  { id: 'gate-guardian',  nameKR: '관문 수호신',  emoji: '⛩️',  areaId: 'baekdu-gate',      bpReward: 3, isHardMode: false, hpMult: 10, atkMult: 2 },
  { id: 'sea-god',        nameKR: '해신',         emoji: '🌊', areaId: 'dragon-palace',    bpReward: 4, isHardMode: false, hpMult: 12, atkMult: 2.5 },
  { id: 'black-dragon',   nameKR: '흑룡',         emoji: '🐲', areaId: 'black-dragon-den', bpReward: 5, isHardMode: false, hpMult: 15, atkMult: 3 },
  { id: 'death-reaper',   nameKR: '저승사자',     emoji: '💀', areaId: 'underworld-gate',  bpReward: 5, isHardMode: false, hpMult: 15, atkMult: 3 },
  { id: 'jade-emperor',   nameKR: '옥황상제',     emoji: '👑', areaId: 'jade-palace',      bpReward: 6, isHardMode: false, hpMult: 20, atkMult: 3.5 },
  { id: 'chaos-god',      nameKR: '혼돈신',       emoji: '🌀', areaId: 'chaos-land',       bpReward: 6, isHardMode: false, hpMult: 20, atkMult: 3.5 },
  { id: 'final-boss',     nameKR: '최종보스',     emoji: '🌟', areaId: 'final-realm',      bpReward: 8, isHardMode: false, hpMult: 30, atkMult: 4 },
  { id: 'time-warden',    nameKR: '시간의 파수꾼',emoji: '⏳', areaId: 'time-rift',        bpReward: 6, isHardMode: false, hpMult: 20, atkMult: 3.5 },
  // Hard mode (9)
  { id: 'abyss-lord',     nameKR: '심연의 군주',  emoji: '🕳️',  areaId: 'hard-abyss',       bpReward: 4, isHardMode: true,  hpMult: 15, atkMult: 3 },
  { id: 'void-king',      nameKR: '공허의 왕',    emoji: '🌑', areaId: 'hard-void',        bpReward: 5, isHardMode: true,  hpMult: 18, atkMult: 3.5 },
  { id: 'hard-goblin',    nameKR: '도깨비 왕',    emoji: '👺', areaId: 'goblin-pass',      bpReward: 4, isHardMode: true,  hpMult: 15, atkMult: 3 },
  { id: 'hard-dragon',    nameKR: '황금룡',       emoji: '✨', areaId: 'black-dragon-den', bpReward: 5, isHardMode: true,  hpMult: 20, atkMult: 4 },
  { id: 'hard-reaper',    nameKR: '사신',         emoji: '🔱', areaId: 'underworld-gate',  bpReward: 5, isHardMode: true,  hpMult: 20, atkMult: 4 },
  { id: 'hard-emperor',   nameKR: '천제',         emoji: '🏆', areaId: 'jade-palace',      bpReward: 6, isHardMode: true,  hpMult: 25, atkMult: 4.5 },
  { id: 'hard-chaos',     nameKR: '원초혼돈',     emoji: '💫', areaId: 'chaos-land',       bpReward: 6, isHardMode: true,  hpMult: 25, atkMult: 4.5 },
  { id: 'hard-final',     nameKR: '진 최종보스',  emoji: '🌈', areaId: 'final-realm',      bpReward: 8, isHardMode: true,  hpMult: 40, atkMult: 5 },
  { id: 'hard-time',      nameKR: '시간파괴자',   emoji: '⚡', areaId: 'time-rift',        bpReward: 6, isHardMode: true,  hpMult: 25, atkMult: 4.5 },
];

export function getBossById(id: string): Boss | undefined {
  return BOSSES.find(b => b.id === id);
}

export function getBossesForArea(areaId: string, isHardMode: boolean): Boss[] {
  return BOSSES.filter(b => b.areaId === areaId && b.isHardMode === isHardMode);
}
