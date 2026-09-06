/**
 * alchemyFlavor.ts — C1066: Taoist Danhak Alchemy Lore & Elixir Ingestion Quotes.
 *
 * Provides Korean traditional Danhak (선도 단학 仙道丹學) furnace folklore,
 * mystical origins of the 4 celestial elixirs, and visceral sensory ingestion quotes.
 */

import type { ElixirType } from '../systems/astralAlchemy';

export interface ElixirFlavor {
  origin: string;
  ingestionReactionFirst: string;
  ingestionReactionMid: string;
  ingestionReactionMax: string;
}

export const CAULDRON_NAME = '천화신정 (天火神鼎)';
export const CAULDRON_DESC =
  '태고의 선인들이 차원의 틈새에서 건져낸 원석을 정화하여 우주의 영기를 조화롭게 빚어내던 전설의 단로.';

export const ELIXIR_FLAVOR_LORE: Record<ElixirType, ElixirFlavor> = {
  solar_pill: {
    origin: '삼태극의 양기(陽氣)와 구천(九天)의 태양 정기를 응축하여 빚은 황금 환약.',
    ingestionReactionFirst:
      '환약이 목을 넘어가자마자 온몸의 혈맥이 붉게 타오르며 칼끝에 서린 기운이 거세게 솟구친다!',
    ingestionReactionMid:
      '태양단의 양기가 심장에 확고히 자리잡아 일격필살의 투지가 끓어오른다.',
    ingestionReactionMax:
      '온몸이 황금빛 태양의 화염과 하나 되어, 베어내지 못할 장벽이 없음을 느낀다!',
  },
  lunar_elixir: {
    origin: '광한전(廣寒殿) 깊은 못에서 채취한 달빛의 진액과 태음(太陰)의 맑은 기운을 융합한 비약.',
    ingestionReactionFirst:
      '서늘하고 맑은 한기가 뼛속 깊이 스며들며 피부가 강철처럼 단단해지고 숨결이 평온해진다.',
    ingestionReactionMid:
      '달빛의 음기가 오장육부를 감싸며 치명적인 공격 앞에서도 흔들리지 않는 생명력을 선사한다.',
    ingestionReactionMax:
      '태음의 정수가 완전한 결계를 이루어, 그 어떤 마물의 흉탄도 나를 무너뜨릴 수 없다!',
  },
  lightning_crystal: {
    origin: '구름 위 천둥의 정령들이 천벌의 벼락을 맞아가며 굳혀낸 뇌정(雷晶)의 결정체.',
    ingestionReactionFirst:
      '짜릿한 전류가 척추를 타고 뇌리로 치솟으며 눈앞의 모든 마물의 움직임이 느려 보인다!',
    ingestionReactionMid:
      '신경망이 번개처럼 번뜩이며 적의 급소를 향해 벼락같은 속도로 칼날이 쇄도한다.',
    ingestionReactionMax:
      '찰나의 순간에 만 번의 칼을 벼려내는 신속(神速)과 무결한 치명타의 경지에 도달했다!',
  },
  abyssal_essence: {
    origin: '하늘과 땅이 나뉘기 전의 혼원(混元) 태초의 혼돈을 병 속에 가둔 신비로운 정수.',
    ingestionReactionFirst:
      '심연의 소용돌이가 단전에 자리 잡아, 적의 충격을 허공으로 흩어버리기 시작한다!',
    ingestionReactionMid:
      '원소의 흐름이 몸을 타고 돌며 속성 공명의 위력이 증폭되고 가해지는 고통이 경감된다.',
    ingestionReactionMax:
      '삼라만상의 원소가 내 손끝에서 춤추며, 그 어떤 파멸적인 타격도 내 숨결을 꺾지 못한다!',
  },
};

/**
 * Returns a dynamic reaction quote based on current dose level.
 */
export function getElixirIngestionQuote(elixirId: ElixirType, dose: number): string {
  const lore = ELIXIR_FLAVOR_LORE[elixirId];
  if (!lore) return '영약의 기운이 몸속으로 흡수되었습니다.';

  if (dose >= 10) {
    return lore.ingestionReactionMax;
  }
  if (dose >= 5) {
    return lore.ingestionReactionMid;
  }
  return lore.ingestionReactionFirst;
}

/**
 * Returns narrative feedback based on total elixirs ingested across all types.
 */
export function getCauldronProgressQuote(totalDoses: number): string {
  if (totalDoses === 0) {
    return '단학 가마의 불꽃이 조용히 타오르며 영약 연성을 기다립니다.';
  }
  if (totalDoses < 10) {
    return '영약의 맑은 향기가 단전 주위에 맴돌며 범인의 육신을 초월하기 시작합니다.';
  }
  if (totalDoses < 30) {
    return '사대 영약의 조화가 피와 뼈를 재구성하여 반선(半仙)의 위엄을 뿜어냅니다.';
  }
  if (totalDoses < 40) {
    return '천지개벽의 기운이 가마와 용사의 영혼을 휘감으며 궁극의 완성을 목전에 두었습니다.';
  }
  return '모든 영약의 정수가 완전한 태극(太極)을 이루어 불멸의 신선(神仙) 경지에 올랐습니다!';
}
