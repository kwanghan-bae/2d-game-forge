import type { PersonalityDim } from '../hero/PersonalityState';
import type { LandmarkKind } from './landmarks';

export interface PersonalityEncounterBranch {
  choice: string;
  nameKR: string;
  delta: number;
}

export interface PersonalityEncounter {
  kind: LandmarkKind;
  dim: PersonalityDim;
  positive: PersonalityEncounterBranch;
  negative: PersonalityEncounterBranch;
}

/** 4 new landmark encounters wiring drift on heroic / prudent / pious / moral.
 *  merciful drift is emitted by EncounterEngine's battle_won proc instead — keep
 *  that one out of this catalog so the catalog stays purely landmark-driven. */
export const PERSONALITY_ENCOUNTERS: readonly PersonalityEncounter[] = [
  {
    kind: 'watchtower', dim: 'heroic',
    positive: { choice: 'defend_village', nameKR: '망루에서 마을을 지켜 영웅의 길을 따랐다', delta: 3 },
    negative: { choice: 'flee_attack',    nameKR: '습격을 피해 도망쳐 비겁의 그림자를 안았다', delta: -3 },
  },
  {
    kind: 'treasure_cave', dim: 'prudent',
    positive: { choice: 'safe_path',      nameKR: '의심스러운 보물을 멀리하여 신중함을 길렀다', delta: 3 },
    negative: { choice: 'reckless_greed', nameKR: '위험한 보물에 손대며 충동이 깊어졌다',       delta: -3 },
  },
  {
    // cycle 1 F1: pious positive delta 3 → 2 (mage saturation 추가 완화).
    // pious 는 holy_ruin + shrine meditation + sightseeing 1/3 chance 의 3 source
    // 가 cumulate 하여 다른 dim 대비 빨리 차오름 (sim 측정 mage share 0.40 ≥ 0.35
    // ceiling). negative 는 그대로 유지 — cliff 방어 (pious 절벽으로 떨어지는
    // 분기는 priest/apprentice 로 흡수되어 mage saturation 과 무관).
    kind: 'holy_ruin', dim: 'pious',
    positive: { choice: 'deep_prayer', nameKR: '폐허의 제단에서 깊은 기도로 신앙이 두터워졌다', delta: 2 },
    negative: { choice: 'skip_ritual', nameKR: '신성한 유적을 외면하며 세속에 가까워졌다',     delta: -3 },
  },
  {
    kind: 'crossroads', dim: 'moral',
    positive: { choice: 'help_traveler', nameKR: '길 위 행인을 도와 영혼이 정화되었다', delta: 3 },
    negative: { choice: 'rob_traveler',  nameKR: '길 위 행인을 약탈하여 영혼이 어두워졌다', delta: -3 },
  },
];

export function findEncounterForKind(kind: LandmarkKind): PersonalityEncounter | undefined {
  return PERSONALITY_ENCOUNTERS.find(e => e.kind === kind);
}

/** Branch by current personality value on the encounter's dim. >= 0 reinforces
 *  toward positive, < 0 reinforces toward negative — prior=0 heroes get a
 *  deterministic seed that subsequent visits compound. */
export function selectBranch(current: number, enc: PersonalityEncounter): PersonalityEncounterBranch {
  return current >= 0 ? enc.positive : enc.negative;
}
