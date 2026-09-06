/**
 * abyssalCorridorLore.ts — C1126: Abyssal Corridor Chronicles & Singularity Lore.
 *
 * Chronicles the lore, ancient cosmic tablets, guardian monologues,
 * and Hall of Sagas inscriptions for all 5 sectors of the Cosmic Abyssal Corridor.
 */

import type { CorridorSectorId } from '../systems/abyssalCorridor';

export interface CorridorSectorLoreEntry {
  sector: CorridorSectorId;
  nameKR: string;
  hanja: string;
  guardianTitle: string;
  loreInscript: string;
  guardianEncounterDialogue: string;
  guardianDefeatDialogue: string;
  sagaChronicle: string;
}

export const CORRIDOR_SECTOR_LORE: Record<CorridorSectorId, CorridorSectorLoreEntry> = {
  1: {
    sector: 1,
    nameKR: '성운의 잔해',
    hanja: '星雲殘骸',
    guardianTitle: '잔해의 파수거신',
    loreInscript:
      '고대 은하가 붕괴하며 남긴 성운의 미립자가 우주를 덮고 있는 폐허. 태고의 문명을 지키던 파수거신이 붉은 화염을 품은 채 침입자를 응시한다.',
    guardianEncounterDialogue:
      '외계의 필멸자여, 별들의 무덤에 발을 들인 대가는 영원한 소멸뿐이다.',
    guardianDefeatDialogue:
      '거신의 불꽃이 꺼져가나... 더 깊은 심연의 공허가 너를 집어삼키리라...',
    sagaChronicle:
      '성운의 잔해를 돌파하여 태고의 화염을 다루는 파수거신을 무릎 꿇리고 심연의 관문을 열었다.',
  },
  2: {
    sector: 2,
    nameKR: '암흑 조각 지대',
    hanja: '暗黑碎片地帶',
    guardianTitle: '암흑의 파편용',
    loreInscript:
      '빛조차 도달하지 못하는 암흑 물질의 파편 지대. 침식하는 공허의 파동 속에서 검은 비늘을 번뜩이는 태고룡이 똬리를 틀고 있다.',
    guardianEncounterDialogue:
      '크아아악! 네 영혼의 빛은 이 암흑의 심연 속에서 찰나의 불씨에 불과하다!',
    guardianDefeatDialogue:
      '나의 암흑 파편이 부서지다니... 허나 진정한 왜곡의 심연을 마주할 수 있을까...',
    sagaChronicle:
      '암흑 조각 지대의 똬리를 튼 암흑룡의 공허 침식을 극복하고 칠흑의 파편 지대를 정복하였다.',
  },
  3: {
    sector: 3,
    nameKR: '양자 왜곡 구역',
    hanja: '量子歪曲區域',
    guardianTitle: '양자의 환영사도',
    loreInscript:
      '인과율과 시공간이 무수한 확률의 파동으로 흩어지는 양자 구역. 실체와 허상이 교차하는 푸른 파동 속에서 환영사도가 미소 짓는다.',
    guardianEncounterDialogue:
      '너의 칼날은 어느 세계선의 나를 베고 있는가? 존재와 부재는 하나일지니.',
    guardianDefeatDialogue:
      '모든 파동 함수가 수렴하는구나... 너의 승리는 확정된 사건이었던가...',
    sagaChronicle:
      '양자 왜곡 구역에서 무한히 분기하는 환영의 장벽을 꿰뚫고 양자의 사도를 격파하였다.',
  },
  4: {
    sector: 4,
    nameKR: '중력 붕괴 중심부',
    hanja: '重力崩壞中心部',
    guardianTitle: '중력의 파멸군주',
    loreInscript:
      '거대 항성이 붕괴하여 형성된 초중력 지대. 뼈마디를 으스러뜨리는 번개와 압도적 인력 속에서 번개의 군주가 강림한다.',
    guardianEncounterDialogue:
      '무릎 꿇어라! 행성마저 으스러뜨리는 이 천문학적 중력 앞에서 네 뼈와 무구는 가루가 되리라!',
    guardianDefeatDialogue:
      '중력장이 붕괴한다... 저 너머... 종언의 특이점이 깨어나고 있다...',
    sagaChronicle:
      '행성을 파쇄하는 극대 중력장을 돌파하여 번개의 파멸군주를 격파하고 특이점의 코어에 도달하였다.',
  },
  5: {
    sector: 5,
    nameKR: '종언의 특이점 코어',
    hanja: '終焉特異點核',
    guardianTitle: '종언의 특이점 지배자',
    loreInscript:
      '모든 물리 법칙과 시공간의 끝, 우주 창세 이전의 절대 무(無)가 응축된 종언의 중심. 우주의 종말을 관장하는 궁극의 지배자가 기다린다.',
    guardianEncounterDialogue:
      '빛도, 시간도, 인과율도 내 안에서 소멸하였다. 이제 너라는 개념을 우주에서 완전히 영구 말소하겠다.',
    guardianDefeatDialogue:
      '믿을 수 없구나... 무한의 질량과 종말의 의지를 꺾은 필멸자가 존재하다니... 너야말로 태초의 승천자다...',
    sagaChronicle:
      '20억 생명력을 지닌 종언의 특이점 지배자를 완전 격파하고 우주의 영원한 승천자로서 성좌의 정점에 군림하였다.',
  },
};

/**
 * Returns the lore entry for the specified Corridor Sector.
 */
export function getCorridorSectorLore(sector: CorridorSectorId): CorridorSectorLoreEntry {
  return CORRIDOR_SECTOR_LORE[sector];
}

/**
 * Formats a Hall of Sagas chronicle entry for conquering a corridor sector.
 */
export function formatCorridorSectorSagaEntry(
  sector: CorridorSectorId,
  heroName: string,
  turns: number
): string {
  const lore = getCorridorSectorLore(sector);
  return `[심연 회랑 제${sector}섹터] ${heroName}이(가) ${turns}턴 만에 [${lore.guardianTitle}]을(를) 토벌: ${lore.sagaChronicle}`;
}

/**
 * Formats the legendary Primordial Ascendant coronation chronicle.
 */
export function formatSingularityTitleChronicle(heroName: string): string {
  return `[태초의 승천자 등극] ${heroName}이(가) 우주적 심연 회랑을 완전 정복하여 [태초의 승천자 (Primordial Ascendant)] 칭호를 획득하였습니다!`;
}
