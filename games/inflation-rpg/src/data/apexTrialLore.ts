/**
 * apexTrialLore.ts — C1107: Apex Trial Boss Dialogue & Cosmic Summit Narrative Lore.
 *
 * Chronicles the ancient encounters, apocalyptic cries, and Hall of Sagas inscriptions
 * for the 3 summit tiers of the Apex Trial Challenge:
 * - Tier 1: 태초의 성흔룡 (Primordial Dawn Wyrm)
 * - Tier 2: 불멸의 황혼성황 (Immortal Dusk Sovereign)
 * - Tier 3: 무극의 창조주 (Omnipotent Zenith Creator)
 */

import type { ApexTrialTier } from '../systems/apexTrialChallenge';

export interface ApexBossLoreEntry {
  tier: ApexTrialTier;
  bossNameKR: string;
  encounterQuote: string;
  mechanicQuote: string;
  defeatCry: string;
  sagaChronicle: string;
}

export const APEX_TRIAL_LORE: Record<ApexTrialTier, ApexBossLoreEntry> = {
  1: {
    tier: 1,
    bossNameKR: '태초의 성흔룡',
    encounterQuote:
      '하늘이 처음 열리던 날의 불꽃을 보았는가? 필멸자의 육신으로 태초의 여명을 감당할 수 없을 것이다!',
    mechanicQuote:
      '태초의 여명이여, 세상을 태우는 폭염으로 모든 불경한 자를 재로 돌려보내라!',
    defeatCry:
      '새벽의 불꽃이 꺼지다니... 네 영혼 속에 깃든 빛은 대체 무엇이란 말인가...',
    sagaChronicle:
      '하늘이 열릴 때부터 타오르던 여명의 성흔룡을 격파하고, 태초의 새벽을 여는 자로 칭송받았다.',
  },
  2: {
    tier: 2,
    bossNameKR: '불멸의 황혼성황',
    encounterQuote:
      '모든 별빛은 결국 황혼으로 기울어 침묵하는 법. 영원한 일몰의 심연에 그대의 칼날을 묻어라.',
    mechanicQuote:
      '일식이 시작된다... 우주의 모든 빛을 거두고 공허의 침식을 영혼에 아로새기리라!',
    defeatCry:
      '황혼이 무너지고... 다시금 별들이 떠오른다... 이 침묵을 깨뜨린 자여...',
    sagaChronicle:
      '영원한 일몰을 지배하던 불멸의 황혼성황을 꺾고, 공허의 침식을 몰아내어 황혼의 정복자가 되었다.',
  },
  3: {
    tier: 3,
    bossNameKR: '무극의 창조주',
    encounterQuote:
      '나는 시작이자 끝이며, 차원 우주를 빚어낸 무극의 섭리이다. 필멸자여, 신의 정점에서 그대의 존망을 시험하라.',
    mechanicQuote:
      '시공간이 붕괴한다! 무극의 특이점이여, 존재의 근원마저 무로 환원하라!',
    defeatCry:
      '창조의 질서마저 초월했단 말인가... 그대가 바로 새로운 우주의 절대자이다...!',
    sagaChronicle:
      '차원 우주의 지존 무극의 창조주를 굴복시키고, 모든 시공간의 정점에 우뚝 선 무극의 초월자로 신화에 새겨졌다.',
  },
};

/**
 * Returns the lore entry for a specific Apex Trial tier.
 */
export function getApexBossLore(tier: ApexTrialTier): ApexBossLoreEntry {
  const lore = APEX_TRIAL_LORE[tier];
  if (!lore) {
    throw new Error(`Invalid Apex Trial tier for lore: ${tier}`);
  }
  return lore;
}

/**
 * Formats a chronicle entry for the Hall of Sagas upon conquering an Apex Trial tier.
 */
export function formatApexTrialSagaEntry(tier: ApexTrialTier, heroName: string): string {
  const lore = getApexBossLore(tier);
  return `[초월 시련 ${tier}단계] 용사 ${heroName}이(가) ${lore.bossNameKR}을(를) 토벌하였다. ${lore.sagaChronicle}`;
}
