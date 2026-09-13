import { REALM_DEFINITIONS } from '../../data';
import type {
  HeroAction,
  HeroAutonomyDecision,
  HeroAutonomyReason,
  RealmId,
  VillagePolicy,
  VillageSaveEnvelope,
} from '../../types';
import { getVillageHeroPower } from '../hero/progression';
import { getVillageAgentAssignmentAnalysis } from './agents';
import { getVillageAIState, deterministicUnit } from './state';

export interface VillageHeroDecisionAnalysis {
  selected: HeroAutonomyDecision;
  candidates: HeroAutonomyDecision[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finite(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function makeDecision(
  action: HeroAction,
  facilityId: HeroAutonomyDecision['facilityId'],
  realmId: RealmId | null,
  assignedAgentId: HeroAutonomyDecision['assignedAgentId'],
  reason: HeroAutonomyReason,
  score: number,
  rationale: string,
): HeroAutonomyDecision {
  return {
    action,
    facilityId,
    realmId,
    assignedAgentId,
    reason,
    // Keep the raw-ish score visible so personality differences are not
    // erased by an early percentage clamp. Confidence is normalized below.
    score: clamp(score, 0, 200),
    rationale,
  };
}

function policyReason(policy: VillagePolicy): HeroAutonomyReason {
  return policy === 'aggression'
    ? 'aggression_policy'
    : policy === 'hoarding'
      ? 'hoarding_policy'
      : 'training_policy';
}

function chooseRealmId(save: VillageSaveEnvelope, policy: VillagePolicy, scores: Map<RealmId, number>): RealmId | null {
  const unlocked = Object.values(REALM_DEFINITIONS).filter((realm) => save.meta.unlockedRealms.includes(realm.id));
  if (unlocked.length === 0) return null;
  const preferred = policy === 'hoarding'
    ? unlocked.reduce((safe, realm) => realm.risk < safe.risk ? realm : safe, unlocked[0])
    : policy === 'aggression'
      ? unlocked.reduce((bold, realm) => realm.risk > bold.risk ? realm : bold, unlocked[0])
      : unlocked[unlocked.length - 1];
  return [...unlocked]
    .sort((left, right) => {
      const difference = finite(scores.get(right.id)) - finite(scores.get(left.id));
      return difference || (right.id === preferred.id ? 1 : left.id === preferred.id ? -1 : 0);
    })[0]?.id ?? preferred.id;
}

function confidenceFor(candidates: VillageHeroAutonomyCandidate[]): number {
  const sorted = [...candidates].sort((left, right) => right.score - left.score);
  const best = sorted[0]?.score ?? 0;
  const second = sorted[1]?.score ?? 0;
  return clamp(0.5 + (best - second) / 100, 0.5, 0.96);
}

type VillageHeroAutonomyCandidate = HeroAutonomyDecision & { score: number };

/**
 * Utility-based hero decision forecast. Policy remains a strong preference,
 * while personality, needs, memories, and world conditions break the rigid
 * if/else loop that previously made every hero behave identically.
 */
export function getHeroDecisionAnalysis(source: VillageSaveEnvelope): VillageHeroDecisionAnalysis {
  const hero = source.run.hero;
  const ai = getVillageAIState(source);
  const hpMax = Math.max(1, finite(hero.hpMax, 1));
  const hpRatio = clamp(finite(hero.hp, 0) / hpMax, 0, 1);
  const personality = ai.hero.personality;
  const needs = ai.hero.needs;
  const power = getVillageHeroPower(source);
  const recentDefeat = ai.hero.memories.some((memory) => memory.tag === 'defeat' && memory.salience >= 0.5);
  const recentVictory = ai.hero.memories.some((memory) => memory.tag === 'victory' && memory.salience >= 0.5);
  const candidates: VillageHeroAutonomyCandidate[] = [];

  const restScore = 20
    + (1 - hpRatio) * 90
    + needs.fatigue * 0.45
    + personality.caution * 0.18
    - personality.curiosity * 0.08;
  candidates.push(makeDecision(
    'rest',
    hpRatio < 0.9 ? 'recovery' : null,
    null,
    null,
    hpRatio < 0.35 ? 'low_hp' : 'no_action',
    restScore,
    hpRatio < 0.35
      ? 'HP가 35% 아래라 회복을 우선한다.'
      : needs.fatigue >= 60
        ? '피로가 누적되어 다음 행동보다 회복을 우선한다.'
        : '현재 목표보다 마을에서 숨을 고르는 편의 가치가 낮지 않다.',
  ) as VillageHeroAutonomyCandidate);

  const trainingScore = 25
    + (source.run.policy === 'training' ? 48 : 0)
    + (100 - needs.morale) * 0.12
    + needs.purpose * 0.22
    + personality.caution * 0.08
    - needs.fatigue * 0.2;
  candidates.push(makeDecision(
    'train',
    'training',
    null,
    null,
    source.run.policy === 'training' ? 'training_policy' : 'no_action',
    trainingScore,
    source.run.policy === 'training'
      ? '성장 집중 정책과 현재 사명감이 훈련을 가리킨다.'
      : '원정 전에 약한 부분을 보완할 수 있는 선택이다.',
  ) as VillageHeroAutonomyCandidate);

  const realmScores = new Map<RealmId, number>();
  for (const realm of Object.values(REALM_DEFINITIONS)) {
    if (!source.meta.unlockedRealms.includes(realm.id)) continue;
    const readiness = clamp(power / Math.max(1, realm.recommendedPower), 0, 2);
    const policyBias = source.run.policy === 'aggression'
      ? 58 + realm.risk * 28 + personality.courage * 0.18
      : source.run.policy === 'hoarding'
        ? 64 - realm.risk * 85 + personality.caution * 0.18
        : 32 - realm.risk * 35;
    const weatherPenalty = ai.world.weather === 'fog' ? realm.risk * 22 : 0;
    const memoryBias = recentDefeat ? -realm.risk * 24 : recentVictory ? personality.curiosity * 0.06 : 0;
    const score = policyBias
      + readiness * 14
      + personality.curiosity * 0.08
      + needs.morale * 0.08
      - weatherPenalty
      + memoryBias;
    realmScores.set(realm.id, score);
  }
  const selectedRealmId = chooseRealmId(source, source.run.policy, realmScores);
  if (selectedRealmId) {
    const realm = REALM_DEFINITIONS[selectedRealmId];
    const score = realmScores.get(selectedRealmId) ?? 0;
    const guideAssignment = getVillageAgentAssignmentAnalysis(source, 'expedition');
    candidates.push(makeDecision(
      'expedition',
      null,
      selectedRealmId,
      guideAssignment.selected,
      policyReason(source.run.policy),
      score,
      `${realm.nameKR}을 선택했다. ${source.run.policy === 'aggression' ? '전진 의지' : source.run.policy === 'hoarding' ? '안전 여유' : '준비 상태'}와 현재 위험도를 함께 고려했다.`,
    ) as VillageHeroAutonomyCandidate);
  }

  const recoveryCandidate = candidates.find((candidate) => candidate.action === 'rest');
  if (hpRatio < 0.35 && recoveryCandidate) {
    return {
      selected: {
        ...recoveryCandidate,
        facilityId: 'recovery',
        reason: 'low_hp',
        score: 100,
        confidence: 0.96,
      },
      candidates: candidates.map((candidate) => ({ ...candidate, confidence: 0.96 })),
    };
  }

  const selected = [...candidates].sort((left, right) => {
    const difference = right.score - left.score;
    return difference || (left.action === 'expedition' ? -1 : left.action === 'train' ? 0 : 1);
  })[0] ?? makeDecision('rest', null, null, null, 'no_action', 0, '가능한 행동이 없다.') as VillageHeroAutonomyCandidate;
  const confidence = confidenceFor(candidates);
  return {
    selected: { ...selected, confidence },
    candidates: candidates.map((candidate) => ({ ...candidate, confidence })),
  };
}

export function getHeroDecisionNoise(source: VillageSaveEnvelope, action: HeroAction): number {
  const ai = getVillageAIState(source);
  return (deterministicUnit(`${ai.seed}:decision:${source.updatedAt}:${action}`) - 0.5) * 4;
}
