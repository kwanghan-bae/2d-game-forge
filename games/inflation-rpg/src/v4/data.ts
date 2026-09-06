import type { FacilityId, RealmEncounterDefinition, RealmId, SupportAgentId, V4CurrencyKey, V4Policy } from './types';

export interface FacilityDefinition {
  id: FacilityId;
  nameKR: string;
  icon: string;
  description: string;
  taskLabelKR: string;
  baseDurationSeconds: number;
  input: Partial<Record<V4CurrencyKey, number>>;
  output: Partial<Record<V4CurrencyKey, number>>;
  outputEquipmentIds?: string[];
  heroExpGain?: number;
}

export const FACILITY_DEFINITIONS: Record<FacilityId, FacilityDefinition> = {
  temple: {
    id: 'temple', nameKR: '신전', icon: '⛩️',
    description: '영웅의 여정을 후원하는 신력을 모읍니다.', taskLabelKR: '기도를 올리기',
    baseDurationSeconds: 30, input: {}, output: { spirit: 18 },
  },
  recovery: {
    id: 'recovery', nameKR: '회복당', icon: '🫖',
    description: '영웅의 HP를 회복하고 피로를 낮춥니다.', taskLabelKR: '약탕 달이기',
    baseDurationSeconds: 20, input: { spirit: 6 }, output: { spirit: 2 },
  },
  blacksmith: {
    id: 'blacksmith', nameKR: '대장간', icon: '⚒️',
    description: '재료를 장비와 금화로 바꿉니다.', taskLabelKR: '철검 제작',
    baseDurationSeconds: 45, input: { gold: 20, materials: 3 }, output: { materials: 2 },
    outputEquipmentIds: ['v4_iron_sword'],
  },
  training: {
    id: 'training', nameKR: '훈련소', icon: '🎯',
    description: '영웅의 전투 경험을 쌓고 다음 행동을 준비합니다.', taskLabelKR: '기초 훈련', heroExpGain: 40,
    baseDurationSeconds: 40, input: { gold: 15 }, output: { spirit: 8 },
  },
  mudang: {
    id: 'mudang', nameKR: '무당집', icon: '🔮',
    description: '정화와 축복으로 원정의 위험을 낮춥니다.', taskLabelKR: '길흉 점치기',
    baseDurationSeconds: 35, input: { spirit: 10 }, output: { rift: 1 },
  },
  expedition: {
    id: 'expedition', nameKR: '원정소', icon: '🧭',
    description: 'Realm을 선택하고 영웅의 다음 장을 엽니다.', taskLabelKR: '경로 정찰',
    baseDurationSeconds: 25, input: { gold: 10 }, output: { materials: 3 },
  },
  archive: {
    id: 'archive', nameKR: '기록관', icon: '📜',
    description: '선택과 승리를 사가로 남겨 영구 해금의 기반을 만듭니다.', taskLabelKR: '사가 정리',
    baseDurationSeconds: 50, input: { materials: 1 }, output: { rift: 1 },
  },
};

export interface AgentDefinition {
  id: SupportAgentId;
  nameKR: string;
  roleKR: string;
  trait: string;
  specialty: FacilityId;
}

export const AGENT_DEFINITIONS: Record<SupportAgentId, AgentDefinition> = {
  blacksmith: { id: 'blacksmith', nameKR: '담철', roleKR: '대장장이', trait: '정밀 제작', specialty: 'blacksmith' },
  mudang: { id: 'mudang', nameKR: '월령', roleKR: '무당', trait: '안전한 축원', specialty: 'mudang' },
  guide: { id: 'guide', nameKR: '솔바람', roleKR: '길잡이', trait: '위험 경로 감지', specialty: 'expedition' },
};

export interface RealmDefinition {
  id: RealmId;
  nameKR: string;
  icon: string;
  description: string;
  risk: number;
  /** Only low-risk routes may be settled without a player confirmation. */
  offlineSafe: boolean;
  durationSeconds: number;
  recommendedPower: number;
  cost: Partial<Record<V4CurrencyKey, number>>;
  reward: Partial<Record<V4CurrencyKey, number>>;
  enemies: string[];
  boss: string;
  encounters: RealmEncounterDefinition[];
}

export const REALM_DEFINITIONS: Record<RealmId, RealmDefinition> = {
  joseon_plains: {
    id: 'joseon_plains', nameKR: '조선 평야', icon: '🌾',
    description: '첫 원정지. 떠돌이 도깨비와 맞서 마을의 이름을 알립니다.', risk: 0.08, offlineSafe: true,
    durationSeconds: 45, recommendedPower: 120, cost: { spirit: 12 }, reward: { gold: 55, materials: 4 },
    enemies: ['도깨비', '들개', '부적 까마귀'], boss: '장승 수문장',
    encounters: [
      { id: 'joseon-plains-normal', tier: 'normal', nameKR: '들판 순찰', durationSeconds: 10, risk: 0.04, recommendedPower: 80, enemyHpMultiplier: 1.5, enemyAtkMultiplier: 0.45 },
      { id: 'joseon-plains-elite', tier: 'elite', nameKR: '도깨비 무리', durationSeconds: 25, risk: 0.08, recommendedPower: 105, enemyHpMultiplier: 2.5, enemyAtkMultiplier: 0.65 },
      { id: 'joseon-plains-boss', tier: 'boss', nameKR: '장승 수문장', durationSeconds: 45, risk: 0.12, recommendedPower: 120, enemyHpMultiplier: 4, enemyAtkMultiplier: 0.8 },
    ],
  },
  deep_forest: {
    id: 'deep_forest', nameKR: '깊은 숲', icon: '🌲',
    description: '길잡이의 감각이 빛나는 숲. 정예 요괴가 나타납니다.', risk: 0.22, offlineSafe: false,
    durationSeconds: 60, recommendedPower: 260, cost: { spirit: 25, materials: 1 }, reward: { gold: 130, materials: 9, rift: 1 },
    enemies: ['산군의 사자', '목각 귀', '안개 여우'], boss: '흑송 산군',
    encounters: [
      { id: 'deep-forest-normal', tier: 'normal', nameKR: '숲길 탐색', durationSeconds: 12, risk: 0.16, recommendedPower: 180, enemyHpMultiplier: 1.5, enemyAtkMultiplier: 0.55 },
      { id: 'deep-forest-elite', tier: 'elite', nameKR: '정예 요괴', durationSeconds: 30, risk: 0.24, recommendedPower: 220, enemyHpMultiplier: 2.5, enemyAtkMultiplier: 0.7 },
      { id: 'deep-forest-boss', tier: 'boss', nameKR: '흑송 산군', durationSeconds: 60, risk: 0.32, recommendedPower: 260, enemyHpMultiplier: 4, enemyAtkMultiplier: 0.8 },
    ],
  },
  underworld: {
    id: 'underworld', nameKR: '저승', icon: '🌑',
    description: '영원한 영웅의 사가가 시험받는 곳. 귀환에는 결심이 필요합니다.', risk: 0.45, offlineSafe: false,
    durationSeconds: 90, recommendedPower: 480, cost: { spirit: 50, materials: 3 }, reward: { gold: 300, materials: 20, rift: 3 },
    enemies: ['망자의 행렬', '저승 사자', '업화 귀'], boss: '염라의 대리인',
    encounters: [
      { id: 'underworld-normal', tier: 'normal', nameKR: '황천 진입', durationSeconds: 15, risk: 0.32, recommendedPower: 320, enemyHpMultiplier: 1.5, enemyAtkMultiplier: 0.6 },
      { id: 'underworld-elite', tier: 'elite', nameKR: '저승 재판', durationSeconds: 40, risk: 0.46, recommendedPower: 400, enemyHpMultiplier: 2.5, enemyAtkMultiplier: 0.75 },
      { id: 'underworld-boss', tier: 'boss', nameKR: '염라의 대리인', durationSeconds: 90, risk: 0.6, recommendedPower: 480, enemyHpMultiplier: 4, enemyAtkMultiplier: 0.8 },
    ],
  },
};

export const POLICY_LABELS: Record<V4Policy, string> = {
  aggression: '공격 우선',
  hoarding: '안전 비축',
  training: '성장 집중',
};

export const FACILITY_IDS = Object.keys(FACILITY_DEFINITIONS) as FacilityId[];
export const REALM_IDS = Object.keys(REALM_DEFINITIONS) as RealmId[];
