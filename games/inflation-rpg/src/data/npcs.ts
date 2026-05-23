import type { Chapter } from '../hero/HeroLifecycle';
import type { NpcEntity } from '../types';
import type { PersonalityDim } from '../hero/PersonalityState';

export interface NpcTemplate {
  kind: NpcEntity['kind'];
  candidateNames: string[];
  emojis: string[];
  ageRate: number;
  spawnChapter: Chapter | 'any';
  initialAge: number;
  personalityDim?: PersonalityDim;
}

export const NPC_TEMPLATES: readonly NpcTemplate[] = [
  // 라이벌
  { kind: 'rival',         candidateNames: ['검은별','은검','폭풍','잿불','북풍'],   emojis: ['🗡️','⚔️','🔪'], ageRate: 1.0, spawnChapter: '어린시절', initialAge: 8 },
  // 멘토
  { kind: 'mentor',        candidateNames: ['현자 솔','대지의 인','별빛 노인','지팡이의 사도'], emojis: ['🧙','📜','🕯️'], ageRate: 1.5, spawnChapter: '청년기', initialAge: 50 },
  // 친구
  { kind: 'friend',        candidateNames: ['로빈','데이지','시오','메이','준'],    emojis: ['🙂','😊','🤝'], ageRate: 1.2, spawnChapter: 'any',     initialAge: 10 },
  // 가족 — 부모
  { kind: 'family_parent', candidateNames: ['아버지','어머니'],                      emojis: ['👨','👩'],       ageRate: 1.8, spawnChapter: '어린시절', initialAge: 30 },
  // 가족 — 배우자
  { kind: 'family_spouse', candidateNames: ['반려자 미르','연인 라엘'],              emojis: ['💑','💕'],       ageRate: 1.0, spawnChapter: '청년기', initialAge: 20 },
  // 가족 — 자식
  { kind: 'family_child',  candidateNames: ['아들','딸'],                            emojis: ['👦','👧'],       ageRate: 1.5, spawnChapter: '장년기', initialAge: 1 },
];
