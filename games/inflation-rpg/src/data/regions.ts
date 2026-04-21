export interface Region {
  id: string;
  nameKR: string;
  emoji: string;
  worldX: number;
  worldY: number;
  bgGradient: string;
  bgPattern: string;
  isHardOnly: boolean;
}

export const REGIONS: Region[] = [
  {
    id: 'plains',
    nameKR: '조선 평야',
    emoji: '🏘️',
    worldX: 20,
    worldY: 75,
    bgGradient: 'linear-gradient(160deg, #7ab648 0%, #5a9e30 60%, #3d7a20 100%)',
    bgPattern: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 8px)',
    isHardOnly: false,
  },
  {
    id: 'forest',
    nameKR: '깊은 숲',
    emoji: '🌲',
    worldX: 35,
    worldY: 55,
    bgGradient: 'linear-gradient(160deg, #1e4620 0%, #2d5a1b 50%, #1a3a12 100%)',
    bgPattern: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 12px)',
    isHardOnly: false,
  },
  {
    id: 'mountains',
    nameKR: '산악 지대',
    emoji: '⛰️',
    worldX: 50,
    worldY: 40,
    bgGradient: 'linear-gradient(160deg, #7f8c8d 0%, #566573 60%, #2c3e50 100%)',
    bgPattern: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 10px)',
    isHardOnly: false,
  },
  {
    id: 'sea',
    nameKR: '동해 바다',
    emoji: '🌊',
    worldX: 72,
    worldY: 45,
    bgGradient: 'linear-gradient(180deg, #1a5276 0%, #154360 50%, #0b2d44 100%)',
    bgPattern: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, transparent 1px, transparent 20px), repeating-linear-gradient(180deg, rgba(255,255,255,0.03) 0px, transparent 1px, transparent 8px)',
    isHardOnly: false,
  },
  {
    id: 'volcano',
    nameKR: '화산 지대',
    emoji: '🌋',
    worldX: 68,
    worldY: 68,
    bgGradient: 'linear-gradient(160deg, #c0392b 0%, #922b21 60%, #641e16 100%)',
    bgPattern: 'radial-gradient(circle at 50% 50%, rgba(255,120,0,0.08) 0%, transparent 60%)',
    isHardOnly: false,
  },
  {
    id: 'underworld',
    nameKR: '저승',
    emoji: '💀',
    worldX: 48,
    worldY: 20,
    bgGradient: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    bgPattern: 'radial-gradient(ellipse at 50% 50%, rgba(100,0,200,0.06) 0%, transparent 70%)',
    isHardOnly: false,
  },
  {
    id: 'heaven',
    nameKR: '천상계',
    emoji: '☁️',
    worldX: 30,
    worldY: 20,
    bgGradient: 'linear-gradient(160deg, #d5e8f5 0%, #a9cfe8 50%, #7ab8e8 100%)',
    bgPattern: 'radial-gradient(circle 3px at 10px 10px, rgba(255,255,255,0.5) 100%, transparent 0%), radial-gradient(circle 3px at 30px 30px, rgba(255,255,255,0.3) 100%, transparent 0%)',
    isHardOnly: false,
  },
  {
    id: 'chaos',
    nameKR: '혼돈의 끝',
    emoji: '🌀',
    worldX: 50,
    worldY: 10,
    bgGradient: 'linear-gradient(160deg, #0a0a0a 0%, #1a0a2e 50%, #0a0a0a 100%)',
    bgPattern: 'conic-gradient(from 0deg at 50% 50%, rgba(100,0,255,0.05), rgba(0,100,255,0.05), rgba(100,0,255,0.05))',
    isHardOnly: false,
  },
  {
    id: 'demon-castle',
    nameKR: '마왕의 성',
    emoji: '🏰',
    worldX: 80,
    worldY: 25,
    bgGradient: 'linear-gradient(160deg, #3d0000 0%, #1a0000 100%)',
    bgPattern: 'repeating-linear-gradient(45deg, rgba(200,0,0,0.06) 0px, rgba(200,0,0,0.06) 1px, transparent 1px, transparent 8px)',
    isHardOnly: true,
  },
];

export function getRegionById(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}
