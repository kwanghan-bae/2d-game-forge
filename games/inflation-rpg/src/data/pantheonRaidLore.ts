/**
 * pantheonRaidLore.ts — C1156: Apocalyptic Hymns of the 4 Cosmic Titans & Pantheon Sagas.
 *
 * Chronicles the cataclysmic decrees of the 4 Cosmic Titans of the Eternal Pantheon:
 * - Phase 1: Ouroboros the Chrono Weaver (시공의 방직신 우로보로스)
 * - Phase 2: Ymir the Primordial Colossus (원초의 거신 이미르)
 * - Phase 3: Nyx the Void Sovereign (허무의 지배자 닉스)
 * - Phase 4: Aion the Singularity Overlord (특이점 대군주 아이온)
 * - True Omniverse Sovereign victory decree & Hall of Sagas chronicle formatter.
 */

import type { PantheonPhase } from '../systems/pantheonRaid';

export interface PantheonTitanLore {
  phase: PantheonPhase;
  bossId: string;
  nameKR: string;
  titleKR: string;
  entryDecree: string;
  defeatLament: string;
}

export const PANTHEON_TITAN_LORE: Record<PantheonPhase, PantheonTitanLore> = {
  1: {
    phase: 1,
    bossId: 'ouroboros_chrono_weaver',
    nameKR: '우로보로스',
    titleKR: '시공의 방직신',
    entryDecree:
      '영겁의 꼬리를 무는 뱀의 눈동자가 열리니, 그대의 과거와 미래가 시공의 굴레 속으로 압축되리라!',
    defeatLament:
      '나의 시간선마저 그대의 칼날 앞에 끊어지는가... 허나 다음 거신이 그대의 오만을 부수리라.',
  },
  2: {
    phase: 2,
    bossId: 'ymir_primordial_colossus',
    nameKR: '이미르',
    titleKR: '원초의 거신',
    entryDecree:
      '우주 창세 이전의 바위와 대지가 일어섰도다! 억겁의 세월을 버텨온 태고의 뼈대로 그대를 짓밟으리라!',
    defeatLament:
      '원초의 대지가 산산조각 나다니... 필멸자의 육신에 어찌 태초의 불꽃이 깃들어 있단 말인가.',
  },
  3: {
    phase: 3,
    bossId: 'nyx_void_sovereign',
    nameKR: '닉스',
    titleKR: '허무의 지배자',
    entryDecree:
      '빛을 잃은 모든 은하들의 무덤, 칠흑의 허무가 손짓하노라. 존재의 의미를 잃고 영원한 어둠 속으로 스러져라!',
    defeatLament:
      '허무의 어둠을 찢고 타오르는 그 빛은 대체 무엇인가... 진정한 절대신의 서광인가...',
  },
  4: {
    phase: 4,
    bossId: 'aion_singularity_overlord',
    nameKR: '아이온',
    titleKR: '특이점 대군주',
    entryDecree:
      '모든 차원과 인과율의 종착지인 특이점의 문이 열렸도다. 우주의 시작이자 끝인 짐의 의지 앞에 무릎 꿇으라!',
    defeatLament:
      '특이점이 무너지고 새로운 우주가 탄생하는구나... 그대야말로 만신전의 정점에 선 진 우주 주재신이로다!',
  },
};

export const PANTHEON_VICTORY_EPILOGUE =
  '4대 우주 거신이 모두 무릎 꿇고 만신전의 회랑이 무한한 성광으로 물들었으니, 삼라만상이 그대를 [진 우주 주재신]으로 찬양하도다!';

/**
 * Returns lore information for a given Pantheon Titan phase.
 */
export function getPantheonTitanLore(phase: PantheonPhase): PantheonTitanLore {
  return PANTHEON_TITAN_LORE[phase];
}

/**
 * Formats a Hall of Sagas chronicle entry for conquering the Eternal Pantheon.
 */
export function formatPantheonSagaEntry(
  clearCount: number,
  heroName: string,
  totalTurns: number
): string {
  return `[제${clearCount}회 초월의 만신전 완파] ${heroName}이(가) 4대 우주 거신(우로보로스, 이미르, 닉스, 아이온)을 총 ${totalTurns}턴 만에 격파하고 [진 우주 주재신]에 등극하였습니다.`;
}
