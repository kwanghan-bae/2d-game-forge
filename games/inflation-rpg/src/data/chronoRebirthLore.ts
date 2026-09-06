/**
 * chronoRebirthLore.ts — C1144: Reincarnation Inscriptions & Time Warp Chronicles.
 *
 * Chronicles the ancient hymns of Ouroboros the Chrono Weaver, reincarnation scriptures,
 * and Hall of Sagas chronicles for the 4 Chrono Rebirth Tiers.
 */

import type { ChronoRebirthTierId } from '../systems/chronoRebirth';

export interface ChronoRebirthLoreEntry {
  tierId: ChronoRebirthTierId;
  nameKR: string;
  hanja: string;
  weaverIncantation: string;
  rebirthEpilogue: string;
  sagaChronicle: string;
}

export const CHRONO_REBIRTH_LORE: Record<ChronoRebirthTierId, ChronoRebirthLoreEntry> = {
  apprentice_warp: {
    tierId: 'apprentice_warp',
    nameKR: '견습의 시공 도약',
    hanja: '見習時空跳躍',
    weaverIncantation:
      '초보적인 시공의 실타래를 엮어내니, 작은 시간의 웅덩이를 건너뛰어 새로운 여명의 문으로 도약하라!',
    rebirthEpilogue:
      '과거의 훈련과 기억이 영혼에 스며들어, 50레벨의 정예 모험가로서 순식간에 새로운 시대를 맞이하였다.',
    sagaChronicle:
      '견습의 시공 도약을 통해 50레벨과 거금을 안고 새로운 여정을 시작하였다.',
  },
  astral_warp: {
    tierId: 'astral_warp',
    nameKR: '성간의 시공 도약',
    hanja: '星間時空跳躍',
    weaverIncantation:
      '별들의 궤도를 가로지르는 성간의 회랑이 열리도다. 은하의 흐름을 타고 100레벨의 위풍당당한 영웅으로 강림하라!',
    rebirthEpilogue:
      '수많은 별빛의 가호가 육신을 재구성하여, 초기 구역의 모든 시련을 단숨에 초월하는 강대한 영웅으로 환생하였다.',
    sagaChronicle:
      '성간의 시공 도약을 발동하여 100레벨의 영웅으로 재림하고 은하의 파동을 계승하였다.',
  },
  primordial_warp: {
    tierId: 'primordial_warp',
    nameKR: '원초의 시공 도약',
    hanja: '原初時空跳躍',
    weaverIncantation:
      '우주 창세 이전의 원초적 시공간이 뒤틀리며 차원의 축을 접도다. 150레벨의 신화적 존재로서 역사의 흐름을 앞질러라!',
    rebirthEpilogue:
      '태초의 불꽃과 멸각의 칼날이 영혼에 새겨져, 중반부의 강적들조차 순식간에 제압하는 신화의 주재자로 거듭났다.',
    sagaChronicle:
      '원초의 시공 도약으로 150레벨의 신화적 권능과 4천만 골드의 금고를 쥐고 환생하였다.',
  },
  singularity_rebirth: {
    tierId: 'singularity_rebirth',
    nameKR: '특이점 대환생',
    hanja: '特異點大轉生',
    weaverIncantation:
      '모든 차원과 인과율의 종착지인 특이점을 딛고 우주의 무한한 윤회를 완성하도다! 200레벨, 1억 골드, 2배의 기적을 품은 절대 승천신으로 부활하라!',
    rebirthEpilogue:
      '시간과 공간의 법칙 자체가 그대의 의지 앞에 고개 숙이니, 우주 삼라만상이 그대의 재림을 찬양하도다.',
    sagaChronicle:
      '특이점 대환생을 완수하여 200레벨의 신격과 1억 골드의 태초 보물창고를 품고 영원한 윤회의 정점에 등극하였다.',
  },
};

/**
 * Returns the lore entry for a specified Chrono Rebirth tier.
 */
export function getChronoRebirthLore(tierId: ChronoRebirthTierId): ChronoRebirthLoreEntry {
  return CHRONO_REBIRTH_LORE[tierId];
}

/**
 * Formats a Hall of Sagas chronicle entry for executing a rebirth.
 */
export function formatRebirthSagaEntry(
  tierId: ChronoRebirthTierId,
  rebirthCount: number,
  heroName: string
): string {
  const lore = getChronoRebirthLore(tierId);
  return `[제${rebirthCount}회 시공 환생] ${heroName}이(가) [${lore.nameKR} (${lore.hanja})]을(를) 완수: ${lore.sagaChronicle}`;
}
