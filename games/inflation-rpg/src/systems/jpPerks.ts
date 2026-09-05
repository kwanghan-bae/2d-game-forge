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
  | 'quest_insight' // Show hidden quest progress hints
  // C1021: Tier 2 Advanced Perks
  | 'crit_mastery'  // Crits deal +50% damage
  | 'boss_slayer'   // Deal +25% damage to bosses
  | 'wealth_barrier' // Damage taken reduced by 1% per 10,000 gold (cap 25%)
  | 'relic_affinity'; // +20% chance to find relics

export interface JpPerkDef {
  id: JpPerkId;
  name: string;
  description: string;
  cost: number;
  tier?: 1 | 2;
  /** If set, this perk requires another perk to be owned first */
  requires?: JpPerkId;
}

export const JP_PERKS: JpPerkDef[] = [
  { id: 'cycle_speed', name: '시간 가속', description: '사이클 시간 10% 감소', cost: 5, tier: 1 },
  { id: 'drop_luck', name: '행운의 손', description: '장비 드롭률 +15%', cost: 8, tier: 1 },
  { id: 'gold_interest', name: '금고 이자', description: '사이클 종료 시 보유 골드 5% 이자', cost: 10, tier: 1 },
  { id: 'crit_cascade', name: '연쇄 치명타', description: '치명타 시 30% 확률로 연속 발동', cost: 12, tier: 1 },
  { id: 'boss_bounty', name: '보스 현상금', description: '보스 처치 골드 +50%', cost: 8, tier: 1 },
  { id: 'revive_once', name: '불굴의 의지', description: '사이클당 1회 부활 (HP 30%)', cost: 15, tier: 1 },
  { id: 'exp_momentum', name: '연전연승', description: '연속 처치 시 경험치 +2% 누적', cost: 10, tier: 1, requires: 'cycle_speed' },
  { id: 'quest_insight', name: '퀘스트 직감', description: '숨겨진 퀘스트 진행도 힌트 표시', cost: 6, tier: 1 },
  // C1021: Tier 2 Advanced Perks
  { id: 'crit_mastery', name: '치명타 숙련', description: '치명타 피해량 +50%', cost: 16, tier: 2, requires: 'crit_cascade' },
  { id: 'boss_slayer', name: '보스 학살자', description: '보스에게 입히는 피해 +25%', cost: 14, tier: 2, requires: 'boss_bounty' },
  { id: 'wealth_barrier', name: '황금 방벽', description: '보유 골드 1만당 받는 피해 1% 감소 (최대 25%)', cost: 18, tier: 2, requires: 'gold_interest' },
  { id: 'relic_affinity', name: '유물 친화', description: '전투 승리 시 유물 발견 확률 +20%', cost: 15, tier: 2, requires: 'drop_luck' },
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
    // C1021: Tier 2 perk modifiers
    critDamageBonus: ownedPerks.includes('crit_mastery') ? 0.5 : 0,
    bossDamageBonus: ownedPerks.includes('boss_slayer') ? 0.25 : 0,
    goldBarrierRate: ownedPerks.includes('wealth_barrier') ? 0.01 : 0,
    relicFindBonus: ownedPerks.includes('relic_affinity') ? 0.2 : 0,
  };
}
