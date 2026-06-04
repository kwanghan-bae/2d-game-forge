/**
 * C1007 — JP Perk System
 * Players spend accumulated JP on permanent perks that provide meaningful
 * strategic choices (not just stat boosts).
 */

export type JpPerkId =
  | 'cycle_speed'    // Reduce cycle time by 10%
  | 'drop_luck'     // +15% equipment drop rate
  | 'gold_interest' // Earn 5% interest on gold at cycle end
  | 'crit_cascade'  // Crits have 30% chance to chain
  | 'boss_bounty'   // +50% gold from bosses
  | 'revive_once'   // Revive once per cycle at 30% HP
  | 'exp_momentum'  // +2% exp per consecutive kill (resets on flee)
  | 'quest_insight'; // Show hidden quest progress hints

export interface JpPerkDef {
  id: JpPerkId;
  name: string;
  description: string;
  cost: number;
  /** If set, this perk requires another perk to be owned first */
  requires?: JpPerkId;
}

export const JP_PERKS: JpPerkDef[] = [
  { id: 'cycle_speed', name: '시간 가속', description: '사이클 시간 10% 감소', cost: 5 },
  { id: 'drop_luck', name: '행운의 손', description: '장비 드롭률 +15%', cost: 8 },
  { id: 'gold_interest', name: '금고 이자', description: '사이클 종료 시 보유 골드 5% 이자', cost: 10 },
  { id: 'crit_cascade', name: '연쇄 치명타', description: '치명타 시 30% 확률로 연속 발동', cost: 12 },
  { id: 'boss_bounty', name: '보스 현상금', description: '보스 처치 골드 +50%', cost: 8 },
  { id: 'revive_once', name: '불굴의 의지', description: '사이클당 1회 부활 (HP 30%)', cost: 15 },
  { id: 'exp_momentum', name: '연전연승', description: '연속 처치 시 경험치 +2% 누적', cost: 10, requires: 'cycle_speed' },
  { id: 'quest_insight', name: '퀘스트 직감', description: '숨겨진 퀘스트 진행도 힌트 표시', cost: 6 },
];

export function getPerkDef(id: JpPerkId): JpPerkDef | undefined {
  return JP_PERKS.find(p => p.id === id);
}

export function canPurchasePerk(
  perkId: JpPerkId,
  ownedPerks: JpPerkId[],
  currentJp: number,
): { canBuy: boolean; reason?: string } {
  const def = getPerkDef(perkId);
  if (!def) return { canBuy: false, reason: 'unknown_perk' };
  if (ownedPerks.includes(perkId)) return { canBuy: false, reason: 'already_owned' };
  if (def.requires && !ownedPerks.includes(def.requires)) {
    return { canBuy: false, reason: 'missing_prerequisite' };
  }
  if (currentJp < def.cost) return { canBuy: false, reason: 'insufficient_jp' };
  return { canBuy: true };
}

export function purchasePerk(
  perkId: JpPerkId,
  ownedPerks: JpPerkId[],
  currentJp: number,
): { newOwned: JpPerkId[]; newJp: number } | null {
  const { canBuy } = canPurchasePerk(perkId, ownedPerks, currentJp);
  if (!canBuy) return null;
  const def = getPerkDef(perkId)!;
  return {
    newOwned: [...ownedPerks, perkId],
    newJp: currentJp - def.cost,
  };
}

/** Returns active perk effects for combat/cycle use */
export function getActivePerkEffects(ownedPerks: JpPerkId[]) {
  return {
    cycleSpeedMul: ownedPerks.includes('cycle_speed') ? 0.9 : 1.0,
    dropRateBonus: ownedPerks.includes('drop_luck') ? 0.15 : 0,
    goldInterestRate: ownedPerks.includes('gold_interest') ? 0.05 : 0,
    critCascadeChance: ownedPerks.includes('crit_cascade') ? 0.3 : 0,
    bossGoldMul: ownedPerks.includes('boss_bounty') ? 1.5 : 1.0,
    reviveEnabled: ownedPerks.includes('revive_once'),
    expMomentumRate: ownedPerks.includes('exp_momentum') ? 0.02 : 0,
    questInsight: ownedPerks.includes('quest_insight'),
  };
}
