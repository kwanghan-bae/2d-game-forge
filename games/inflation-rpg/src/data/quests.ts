import type { Quest } from '../types';

export const QUESTS: Quest[] = [
  // ── plains (4 quest) ──
  { id: 'q-plains-1', regionId: 'plains', nameKR: '도깨비 사냥꾼',
    description: '도깨비병사 100마리 처치',
    type: 'kill_count', target: { monsterId: 'plains-imp', count: 100 },
    reward: { gold: 5000, bp: 1 } },
  { id: 'q-plains-2', regionId: 'plains', nameKR: '망령 정화',
    description: '폐허의 망령 처치',
    type: 'boss_defeat', target: { bossId: 'plains-ghost', count: 1 },
    reward: { gold: 8000, equipmentId: 'a-iron' } },
  { id: 'q-plains-3', regionId: 'plains', nameKR: '평야 수집가',
    description: '단도 5개 수집',
    type: 'item_collect', target: { equipmentId: 'w-knife', count: 5 },
    reward: { gold: 3000 } },
  { id: 'q-plains-4', regionId: 'plains', nameKR: '평야의 군주',
    description: '평야의 군주 처치',
    type: 'boss_defeat', target: { bossId: 'plains-lord', count: 1 },
    reward: { gold: 30000, bp: 3 } },

  // ── forest (4 quest) ──
  { id: 'q-forest-1', regionId: 'forest', nameKR: '여우 사냥',
    description: '여우 50마리 처치',
    type: 'kill_count', target: { monsterId: 'forest-fox', count: 50 },
    reward: { gold: 6000, bp: 1 } },
  { id: 'q-forest-2', regionId: 'forest', nameKR: '구미호 토벌',
    description: '구미호 처치',
    type: 'boss_defeat', target: { bossId: 'gumiho', count: 1 },
    reward: { gold: 15000, equipmentId: 'w-vine-bow' } },
  { id: 'q-forest-3', regionId: 'forest', nameKR: '숲의 통치자',
    description: '숲의 통치자 처치',
    type: 'boss_defeat', target: { bossId: 'forest-ruler', count: 1 },
    reward: { gold: 50000, bp: 4 } },
  { id: 'q-forest-4', regionId: 'forest', nameKR: '곰 사냥꾼',
    description: '곰 30마리 처치',
    type: 'kill_count', target: { monsterId: 'forest-bear', count: 30 },
    reward: { gold: 8000 } },

  // ── mountains (4 quest) ──
  { id: 'q-mountains-1', regionId: 'mountains', nameKR: '도깨비 대장 토벌',
    description: '도깨비 대장 처치',
    type: 'boss_defeat', target: { bossId: 'goblin-chief', count: 1 },
    reward: { gold: 12000, equipmentId: 'a-iron' } },
  { id: 'q-mountains-2', regionId: 'mountains', nameKR: '관문 통과',
    description: '관문 수호신 처치',
    type: 'boss_defeat', target: { bossId: 'gate-guardian', count: 1 },
    reward: { gold: 18000, bp: 2 } },
  { id: 'q-mountains-3', regionId: 'mountains', nameKR: '회색곰 사냥',
    description: '회색곰 30마리 처치',
    type: 'kill_count', target: { monsterId: 'mountain-grey', count: 30 },
    reward: { gold: 25000, bp: 1 } },
  { id: 'q-mountains-4', regionId: 'mountains', nameKR: '광부의 한',
    description: '광부유령 50마리 처치',
    type: 'kill_count', target: { monsterId: 'mountain-miner', count: 50 },
    reward: { gold: 30000 } },

  // ── coast (3 quest) ──
  { id: 'q-coast-1', regionId: 'coast', nameKR: '해신의 노여움',
    description: '해신 처치',
    type: 'boss_defeat', target: { bossId: 'sea-god', count: 1 },
    reward: { gold: 40000, equipmentId: 'w-trident' } },
  { id: 'q-coast-2', regionId: 'coast', nameKR: '심해 어부',
    description: '심해어 50마리 처치',
    type: 'kill_count', target: { monsterId: 'coast-deepfish', count: 50 },
    reward: { gold: 50000, bp: 2 } },
  { id: 'q-coast-3', regionId: 'coast', nameKR: '인어의 노래',
    description: '인어 30마리 처치',
    type: 'kill_count', target: { monsterId: 'coast-mermaid', count: 30 },
    reward: { gold: 35000 } },

  // ── underground (3 quest) ──
  { id: 'q-cave-1', regionId: 'underground', nameKR: '동굴 탐험가',
    description: '거대거미 50마리 처치',
    type: 'kill_count', target: { monsterId: 'cave-spider', count: 50 },
    reward: { gold: 30000 } },
  { id: 'q-cave-2', regionId: 'underground', nameKR: '광부의 안식',
    description: '광부영혼 100마리 처치',
    type: 'kill_count', target: { monsterId: 'cave-miner-ghost', count: 100 },
    reward: { gold: 60000, equipmentId: 'w-pickaxe' } },
  { id: 'q-cave-3', regionId: 'underground', nameKR: '석상의 침묵',
    description: '석상골렘 30마리 처치',
    type: 'kill_count', target: { monsterId: 'cave-golem', count: 30 },
    reward: { gold: 80000, bp: 3 } },

  // ── heaven-realm (3 quest) ──
  { id: 'q-heaven-1', regionId: 'heaven-realm', nameKR: '봉황의 깃털',
    description: '봉황 10마리 처치',
    type: 'kill_count', target: { monsterId: 'heaven-phoenix', count: 10 },
    reward: { gold: 200000, equipmentId: 'w-celestial-spear' } },
  { id: 'q-heaven-2', regionId: 'heaven-realm', nameKR: '옥황상제 알현',
    description: '옥황상제 처치',
    type: 'boss_defeat', target: { bossId: 'jade-emperor', count: 1 },
    reward: { gold: 500000, bp: 5 } },
  { id: 'q-heaven-3', regionId: 'heaven-realm', nameKR: '신마 길들이기',
    description: '신마 30마리 처치',
    type: 'kill_count', target: { monsterId: 'heaven-horse', count: 30 },
    reward: { gold: 300000 } },

  // ── underworld (3 quest) ──
  { id: 'q-under-1', regionId: 'underworld', nameKR: '저승사자 처단',
    description: '저승사자 처치',
    type: 'boss_defeat', target: { bossId: 'death-reaper', count: 1 },
    reward: { gold: 400000, equipmentId: 'w-soulreaper' } },
  { id: 'q-under-2', regionId: 'underworld', nameKR: '망자의 길',
    description: '저승망자 100마리 처치',
    type: 'kill_count', target: { monsterId: 'under-dead', count: 100 },
    reward: { gold: 250000, bp: 3 } },
  { id: 'q-under-3', regionId: 'underworld', nameKR: '도깨비불 정화',
    description: '도깨비불 50마리 처치',
    type: 'kill_count', target: { monsterId: 'under-flame', count: 50 },
    reward: { gold: 350000 } },

  // ── chaos (3 quest) ──
  { id: 'q-chaos-1', regionId: 'chaos', nameKR: '혼돈 정화',
    description: '혼돈신 처치',
    type: 'boss_defeat', target: { bossId: 'chaos-god', count: 1 },
    reward: { gold: 1000000, equipmentId: 'acc-chaos-orb' } },
  { id: 'q-chaos-2', regionId: 'chaos', nameKR: '공허의 흔적',
    description: '공허파편 50마리 처치',
    type: 'kill_count', target: { monsterId: 'chaos-void', count: 50 },
    reward: { gold: 800000, bp: 4 } },
  { id: 'q-chaos-3', regionId: 'chaos', nameKR: '시간 파수꾼',
    description: '시간의 파수꾼 처치',
    type: 'boss_defeat', target: { bossId: 'time-warden', count: 1 },
    reward: { gold: 1500000, equipmentId: 'acc-time-shard' } },

  // ── final-realm (1 quest) ──
  { id: 'q-final-1', regionId: 'final-realm', nameKR: '종말의 시작',
    description: '최종보스 처치',
    type: 'boss_defeat', target: { bossId: 'final-boss', count: 1 },
    reward: { gold: 5000000, equipmentId: 'w-mythic-sword', bp: 8 } },
];

export function getQuestsForRegion(regionId: string): Quest[] {
  return QUESTS.filter(q => q.regionId === regionId);
}

export function getQuestById(id: string): Quest | undefined {
  return QUESTS.find(q => q.id === id);
}
