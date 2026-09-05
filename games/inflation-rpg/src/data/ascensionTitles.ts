/**
 * ascensionTitles.ts — C1049: Ascension Titles & Rune Enchanting Narrative Flavor.
 *
 * Defines prestigious titles unlocked by conquering Ascension Trial milestones,
 * stat bonuses granted by titles, and evocative blacksmith dialogue for rune enchanting.
 */

import type { RuneType } from '../systems/enchantSystem';

export type AscensionTitleId =
  | 'trial_challenger'
  | 'seeker_of_elements'
  | 'conqueror_of_wrath'
  | 'slayer_of_chaos';

export interface TitleStatBonus {
  atkPercent?: number;
  defPercent?: number;
  hpPercent?: number;
  allElementalDmgPercent?: number;
}

export interface AscensionTitle {
  id: AscensionTitleId;
  nameKR: string;
  badge: string;
  floorRequired: number;
  description: string;
  flavor: string;
  bonuses: TitleStatBonus;
}

export const ASCENSION_TITLES: AscensionTitle[] = [
  {
    id: 'trial_challenger',
    nameKR: '시련의 도전자',
    badge: '⚔️',
    floorRequired: 3,
    description: '승천의 시련 3층(천둥의 용제)을 돌파한 용사에게 주어지는 칭호.',
    flavor: '초심자의 한계를 딛고 상위 원소의 영역에 발을 들인 증표.',
    bonuses: {
      atkPercent: 2,
    },
  },
  {
    id: 'seeker_of_elements',
    nameKR: '원소의 탐구자',
    badge: '🌀',
    floorRequired: 5,
    description: '승천의 시련 5층(작열의 거신)을 격파한 용사에게 주어지는 칭호.',
    flavor: '삼원소의 상성을 간파하고 대장간의 불꽃을 다스리는 자.',
    bonuses: {
      allElementalDmgPercent: 5,
    },
  },
  {
    id: 'conqueror_of_wrath',
    nameKR: '천벌의 극복자',
    badge: '⚡',
    floorRequired: 7,
    description: '승천의 시련 7층(천벌의 뇌조)을 격침한 용사에게 주어지는 칭호.',
    flavor: '하늘의 분노마저 단단한 철갑으로 받아넘긴 역전의 용사.',
    bonuses: {
      defPercent: 4,
      hpPercent: 4,
    },
  },
  {
    id: 'slayer_of_chaos',
    nameKR: '종언을 꺾은 패왕',
    badge: '👑',
    floorRequired: 10,
    description: '승천의 시련 10층 최종 보스(종언의 패왕)를 멸한 전설적 존재.',
    flavor: '끝없는 인플레이션과 심연의 혼돈을 넘어 절대자의 경지에 닿았다.',
    bonuses: {
      atkPercent: 5,
      defPercent: 5,
      hpPercent: 5,
      allElementalDmgPercent: 10,
    },
  },
];

/**
 * Returns all titles unlocked by the highest cleared trial floor.
 */
export function getUnlockedTitles(clearedFloorMax: number): AscensionTitle[] {
  return ASCENSION_TITLES.filter(t => clearedFloorMax >= t.floorRequired);
}

/**
 * Returns title by its unique id.
 */
export function getAscensionTitle(id: AscensionTitleId): AscensionTitle | null {
  return ASCENSION_TITLES.find(t => t.id === id) ?? null;
}

/**
 * Blacksmith dialogues for each elemental rune infusion.
 */
export const BLACKSMITH_RUNE_DIALOGUES: Record<RuneType, string[]> = {
  rune_fire: [
    '작열하는 불꽃의 기운이 강철 속으로 파고든다... 타오르는 투지를 보아라!',
    '화(火)의 룬이 깃들었다. 이제 네 칼날이 닿는 곳마다 잿더미가 남을 게야.',
    '불꽃의 숨결이 무구에 불멸의 열기를 불어넣었네!',
  ],
  rune_water: [
    '서리 내린 푸른 냉기가 칼끝을 감싸는군. 차가운 이성으로 적을 베어라.',
    '수(水)의 룬이 스며들었다. 거센 파도처럼 적의 맹공을 씻어내릴 걸세.',
    '빙결의 정수가 강철을 얼어붙지 않는 절대 영도로 벼려냈다네.',
  ],
  rune_lightning: [
    '짜릿한 벼락의 숨결이 깃들었다! 이 뇌전 앞에 어떤 사악도 버티지 못할 터.',
    '뇌(雷)의 룬이 깨어났군. 일섬에 먹구름을 가르고 적의 숨통을 끊어라!',
    '번개의 포효가 들리는가? 신속하고 가차 없이 번뜩일 무구로다.',
  ],
  rune_dark: [
    '심연의 어둠을 다루는 것은 위험하지만... 이 패기라면 능히 종언을 벨 수 있겠지.',
    '암(暗)의 룬이 강철의 심장과 하나가 되었다. 어둠으로 더 짙은 어둠을 삼켜라!',
    '금단의 흑요석 기운이 날을 세웠군. 절대자마저 떨게 할 불길한 걸작이다.',
  ],
};

/**
 * Hero reaction dialogues when their gear is enchanted.
 */
export const HERO_RUNE_REACTIONS: Record<RuneType, Record<string, string>> = {
  rune_fire: {
    warrior: '칼자루에서 전해지는 뜨거운 열기... 심장이 요동치는군!',
    mage: '작열의 화염구보다 더 순수한 불꽃의 정수가 느껴져요.',
    default: '불꽃의 힘이 무기에 깃들어 적을 불사를 준비를 마쳤다.',
  },
  rune_water: {
    rogue: '칼날이 서릿발처럼 차갑군. 그림자 속에서 숨통을 끊기에 제격이야.',
    healer: '맑고 고요한 물의 기운... 상처를 감싸고 악을 씻어낼 거예요.',
    default: '서늘한 냉기가 감돌며 적의 열기를 얼어붙게 만든다.',
  },
  rune_lightning: {
    hunter: '화살 끝에서 튀는 불꽃... 번개처럼 날아가 심장을 꿰뚫으리라.',
    warrior: '찌릿한 전율이 손끝을 타고 오른다! 일격에 끝내주마!',
    default: '벼락의 파괴력이 깃들어 번뜩이는 일격을 예고한다.',
  },
  rune_dark: {
    rogue: '어둠의 심연... 날 비추는 그림자마저 집어삼킬 것 같군.',
    mage: '금단의 주술이지만, 승천을 위해서라면 이 힘도 감수하겠어요.',
    default: '칠흑 같은 심연의 기운이 무구를 휘감아 파멸을 부른다.',
  },
};

/**
 * Gets a random blacksmith line when a rune is successfully enchanted.
 */
export function getRuneEnchantBlacksmithQuote(rune: RuneType): string {
  const quotes = BLACKSMITH_RUNE_DIALOGUES[rune];
  return quotes[Math.floor(Math.random() * quotes.length)];
}

/**
 * Gets hero reaction to their equipment being enchanted with a rune.
 */
export function getRuneEnchantHeroReaction(rune: RuneType, heroClassId: string = 'default'): string {
  const reactions = HERO_RUNE_REACTIONS[rune];
  return reactions[heroClassId] ?? reactions.default;
}
