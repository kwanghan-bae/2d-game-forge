/**
 * narrationVariants.ts
 * 이벤트 타입별 나레이션 변형 (5–8개씩). seed 기반으로 선택해 단조로움 방지.
 */

import type { NpcEntity, RealmId, SeasonId } from '../types';
import { josa } from '../utils/josa';

/** Object marker (을/를) — Cycle 4 A2: josa() 으로 forward (single source). */
function obj(noun: string): string {
  return josa(noun, '을를');
}

/* ─────────────────────────── battle ─────────────────────────── */
const BATTLE_VARIANTS: Array<(c: { age: number; enemyNameKR: string }) => string> = [
  (c) => `${c.age}세에 ${obj(c.enemyNameKR)} 처치했다.`,
  (c) => `${c.age}세에 ${obj(c.enemyNameKR)} 베어넘겼다.`,
  (c) => `${c.age}세에 ${obj(c.enemyNameKR)} 단숨에 쓰러뜨렸다.`,
  (c) => `${c.age}세에 ${obj(c.enemyNameKR)} 압도했다.`,
  (c) => `${c.age}세에 ${obj(c.enemyNameKR)} 제압했다.`,
  (c) => `${c.age}세에 ${josa(c.enemyNameKR, '이가')} 쓰러졌다.`,
  (c) => `${c.age}세에 간신히 ${obj(c.enemyNameKR)} 물리쳤다.`,
  (c) => `${c.age}세에 ${c.enemyNameKR}의 숨이 끊어졌다.`,
];

/* ─────────────────────────── levelUp ────────────────────────── */
const LEVELUP_VARIANTS: Array<(c: { age: number; newLevel: number }) => string> = [
  (c) => `${c.age}세에 한 단계 더 강해졌다. (LV ${c.newLevel})`,
  (c) => `${c.age}세에 경지를 넓혔다. (LV ${c.newLevel})`,
  (c) => `${c.age}세에 새로운 힘을 얻었다. (LV ${c.newLevel})`,
  (c) => `${c.age}세에 벽을 넘었다. (LV ${c.newLevel})`,
  (c) => `${c.age}세에 성장의 빛이 일었다. (LV ${c.newLevel})`,
  (c) => `${c.age}세에 강함을 깨달았다. (LV ${c.newLevel})`,
];

/* ────────────────────────── levelUpBatch ────────────────────── */
const LEVELUP_BATCH_VARIANTS: Array<(c: { age: number; fromLevel: number; toLevel: number; count: number }) => string> = [
  (c) => `${c.age}세에 LV ${c.fromLevel} → LV ${c.toLevel} 까지 ${c.count}단계 폭풍 성장했다.`,
  (c) => `${c.age}세에 ${c.count}단계의 비약 — LV ${c.fromLevel} → ${c.toLevel}.`,
  (c) => `${c.age}세에 LV ${c.fromLevel}에서 LV ${c.toLevel}으로 폭발 성장했다. (${c.count}단계)`,
  (c) => `${c.age}세에 한계를 돌파했다 — LV ${c.toLevel}. (${c.count}단계 연속)`,
  (c) => `${c.age}세에 미친 듯이 강해졌다 — LV ${c.fromLevel} → ${c.toLevel}.`,
  (c) => `${c.age}세에 ${c.count}단계 연속 성장. LV ${c.toLevel}에 도달했다.`,
];

/* ─────────────────────────── drop ───────────────────────────── */
const DROP_VARIANTS: Array<(c: { age: number; itemNameKR: string }) => string> = [
  (c) => `${c.age}세에 ${obj(c.itemNameKR)} 손에 넣었다.`,
  (c) => `${c.age}세에 ${obj(c.itemNameKR)} 발견했다.`,
  (c) => `${c.age}세에 바닥에 떨어진 ${obj(c.itemNameKR)} 주웠다.`,
  (c) => `${c.age}세에 ${obj(c.itemNameKR)} 챙겼다.`,
  (c) => `${c.age}세에 ${josa(c.itemNameKR, '이가')} 빛났다.`,
  (c) => `${c.age}세에 ${obj(c.itemNameKR)} 얻어냈다.`,
];

/* ─────────────────────────── shrine ─────────────────────────── */
const SHRINE_HEALED_VARIANTS: Array<(c: { age: number; healed: number }) => string> = [
  (c) => `${c.age}세에 사당에서 기도하여 ${c.healed.toLocaleString()} 회복했다.`,
  (c) => `${c.age}세에 신의 가호로 ${c.healed.toLocaleString()}의 상처가 아물었다.`,
  (c) => `${c.age}세에 성스러운 빛이 흘러 ${c.healed.toLocaleString()}을 회복했다.`,
  (c) => `${c.age}세에 사당의 기운에 ${c.healed.toLocaleString()}이 회복되었다.`,
  (c) => `${c.age}세에 신비로운 기운이 깃들어 ${c.healed.toLocaleString()} 회복했다.`,
];

const SHRINE_CALM_VARIANTS: Array<(c: { age: number }) => string> = [
  (c) => `${c.age}세에 사당에서 평온한 마음을 얻었다.`,
  (c) => `${c.age}세에 오래된 사당 앞에서 묵상했다.`,
  (c) => `${c.age}세에 사당에서 잠시 기도했다.`,
  (c) => `${c.age}세에 고요한 사당에서 마음을 가다듬었다.`,
  (c) => `${c.age}세에 신의 안식을 잠시 누렸다.`,
];

/* ──────────────────────── moralChoice ───────────────────────── */
// moralChoice 의 choiceNameKR 자체가 이미 변형 문구이므로
// age 앞뒤로 살짝 다른 프레임만 추가.
const MORAL_VARIANTS: Array<(c: { age: number; choiceNameKR: string }) => string> = [
  (c) => `${c.age}세에 ${c.choiceNameKR}.`,
  (c) => `${c.age}세의 결단 — ${c.choiceNameKR}.`,
  (c) => `${c.age}세, 갈림길에서 ${c.choiceNameKR}.`,
  (c) => `${c.age}세에 영웅은 선택했다 — ${c.choiceNameKR}.`,
  (c) => `${c.age}세에 주저하지 않았다. ${c.choiceNameKR}.`,
];

/* ─────────────────────── skillLearned ───────────────────────── */
const SKILL_VARIANTS: Array<(c: { age: number; skillNameKR: string }) => string> = [
  (c) => `${c.age}세에 ${obj(c.skillNameKR)} 익혔다.`,
  (c) => `${c.age}세에 ${obj(c.skillNameKR)} 터득했다.`,
  (c) => `${c.age}세에 ${c.skillNameKR}의 비기를 깨달았다.`,
  (c) => `${c.age}세에 ${obj(c.skillNameKR)} 마스터했다.`,
  (c) => `${c.age}세에 ${c.skillNameKR}의 경지에 올랐다.`,
];

/* ─────────────────────── jobUnlock ──────────────────────────── */
const JOB_VARIANTS: Array<(c: { age: number; jobNameKR: string; tier: number }) => string> = [
  (c) => `${c.age}세에 ${josa(c.jobNameKR, '이가')} 되었다. (Tier ${c.tier})`,
  (c) => `${c.age}세에 ${c.jobNameKR}의 길에 들어섰다. (Tier ${c.tier})`,
  (c) => `${c.age}세에 마침내 ${josa(c.jobNameKR, '으로로')} 거듭났다. (Tier ${c.tier})`,
  (c) => `${c.age}세에 ${c.jobNameKR}의 칭호를 얻었다. (Tier ${c.tier})`,
  (c) => `${c.age}세에 영웅은 ${josa(c.jobNameKR, '이가')} 되었다. (Tier ${c.tier})`,
];

/* ─────────────────────── rejuvenation ───────────────────────── */
const REJUVENATION_VARIANTS: Array<(c: { age: number; yearsBack: number; rejuvenationCount: number }) => string> = [
  (c) => `${c.age}세에 빛의 은총으로 ${c.yearsBack}년이 사라졌다 — 재생 #${c.rejuvenationCount}.`,
  (c) => `${c.age}세에 신의 빛이 ${c.yearsBack}년을 되돌렸다 — 재생 #${c.rejuvenationCount}.`,
  (c) => `${c.age}세에 시간의 흐름이 역전됐다. ${c.yearsBack}년 회춘 — 재생 #${c.rejuvenationCount}.`,
  (c) => `${c.age}세에 젊음이 돌아왔다 (${c.yearsBack}년) — 재생 #${c.rejuvenationCount}.`,
  (c) => `${c.age}세에 영원한 빛이 ${c.yearsBack}년의 노화를 지웠다 — 재생 #${c.rejuvenationCount}.`,
];

/* ─────────────────── 선택 헬퍼 ──────────────────────────────── */
/**
 * seed 를 배열 크기로 나눈 나머지 인덱스로 variant 를 고른다.
 * seed = 0 이면 항상 첫 번째(기존 default 텍스트)를 반환해 하위 호환 유지.
 */
function pick<T>(arr: Array<(c: T) => string>, ctx: T, seed: number): string {
  const idx = ((seed % arr.length) + arr.length) % arr.length;
  return arr[idx](ctx);
}

/* ─────────────────── Cycle 161 — tone-tagged 선택 헬퍼 ─────────
 *
 * story-writer #1 권고 (cycle 156 critic) — `getNarrativeWeightMul` 의 wire
 * target. SeasonalModifier catalog 의 `heaven-narrative-ode` 등이 매칭할
 * tone token 풀이 narrationVariants 에 부재했음 (cycle 137/149 catalog 8 의
 * doubly-dormant 상태).
 *
 * 이 cycle 은 *type + helper* 만 추가. 실제 variant pool 의 tone tagging 은
 * cycle 169+ narrative slot 에서 분할. variant pool 의 점진 도입을 위해
 * `TaggedVariant<T>` 와 `pick` 둘 다 호환 (mixed array 허용 안 함 — 새 pool
 * 만 tagged 로 운용).
 */

/** SeasonalModifier catalog 의 narrativeWeightMul key 와 정합. neutral 은
 *  tag 없는 기본. cycle 169+ variant tagging 시 pool 별 tone 강조. */
export type NarrationTone = 'elegy' | 'tragedy' | 'ode' | 'hymn' | 'neutral';

/** Cycle 206 — NarrationTone 의 union → array 형태. catalog invariant test
 *  + runtime tone 순회 사용. union 변경 시 본 array 도 동기화 의무. */
export const ALL_NARRATION_TONES: readonly NarrationTone[] = [
  'elegy', 'tragedy', 'ode', 'hymn', 'neutral',
];

/** Cycle 211 — NarrationTone 의 한국어 label. UI display 시 사용. */
export const NARRATION_TONE_LABEL_KR: Readonly<Record<NarrationTone, string>> = {
  elegy: '비가',
  tragedy: '비극',
  ode: '송가',
  hymn: '찬가',
  neutral: '평이',
};

/** Cycle 231 — NarrationTone 의 짧은 설명. tooltip / detail panel 사용. */
export const NARRATION_TONE_DESC_KR: Readonly<Record<NarrationTone, string>> = {
  elegy: '잔잔한 슬픔의 시',
  tragedy: '잿더미의 노래',
  ode: '천상의 송가',
  hymn: '경배의 찬송',
  neutral: '담담한 한 줄',
};

/** Cycle 237 — NarrationTone 의 영어 alt label. dev tooling / log 등에서 사용.
 *  사용자 UI 는 KR 만 노출. */
export const NARRATION_TONE_LABEL_EN: Readonly<Record<NarrationTone, string>> = {
  elegy: 'Elegy',
  tragedy: 'Tragedy',
  ode: 'Ode',
  hymn: 'Hymn',
  neutral: 'Neutral',
};

/** Cycle 214 — unknown string → safe lookup wrapper. catalog 의 weight key 가
 *  type 외 일 가능성 (cycle 192 invariant 가 정합 보장하지만 caller 가 plain
 *  string 받을 경우). 매칭 부재 → undefined. */
export function getNarrationToneLabel(tone: string): string | undefined {
  return (NARRATION_TONE_LABEL_KR as Record<string, string>)[tone];
}

/** Cycle 226 — 한국어 label → NarrationTone 역방향 lookup. 매칭 부재 → undefined. */
export function getNarrationToneFromLabel(label: string): NarrationTone | undefined {
  for (const tone of ALL_NARRATION_TONES) {
    if (NARRATION_TONE_LABEL_KR[tone] === label) return tone;
  }
  return undefined;
}

/** Cycle 241 — NarrationTone → 영어 label safe lookup. cycle 214 의 KR 대칭. */
export function getNarrationToneEnLabel(tone: string): string | undefined {
  return (NARRATION_TONE_LABEL_EN as Record<string, string>)[tone];
}

/** template 함수에 optional tone 을 부착. cycle 161 의 도입은 type-only — 기존
 *  `pick` 호출자는 변경 없음. */
export interface TaggedVariant<T> {
  readonly fn: (c: T) => string;
  readonly tone?: NarrationTone;
}

/**
 * tone weight map 으로 가중 선택. weight 미지정 시 plain modulo (기존 pick
 * 동등). weight === 0 인 variant 는 후보에서 제외 (catalog 의 weight 부재 =
 * 1 fallback). seed 0 = 첫 항목 (deterministic).
 */
export function pickWeighted<T>(
  arr: ReadonlyArray<TaggedVariant<T>>,
  ctx: T,
  seed: number,
  weights?: Partial<Record<NarrationTone, number>>,
): string {
  if (arr.length === 0) {
    throw new Error('pickWeighted: empty array');
  }
  // weight 미지정 or 비어 있음 → plain modulo
  const noWeights = !weights || Object.keys(weights).length === 0;
  if (noWeights) {
    const idx = ((seed % arr.length) + arr.length) % arr.length;
    return arr[idx].fn(ctx);
  }
  // weight 적용: 각 variant 의 tone 의 weight 곱셈. 미매칭 tone (undefined 또는
  // 'neutral') 은 default 1. weight === 0 → 후보 제외.
  const weighted = arr.map((v) => {
    const w = weights[v.tone ?? 'neutral'];
    return w === undefined ? 1 : w;
  });
  const total = weighted.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    // 모든 weight 가 0 → fallback to plain modulo
    const idx = ((seed % arr.length) + arr.length) % arr.length;
    return arr[idx].fn(ctx);
  }
  // seed 0 = 첫 non-zero weight variant (deterministic — test 의 baseline).
  if (seed === 0) {
    const firstIdx = weighted.findIndex((w) => w > 0);
    return arr[firstIdx].fn(ctx);
  }
  // weight 기반 cumulative pick — seed 를 total 로 modulo.
  const pickPoint = (((seed % total) + total) % total);
  let acc = 0;
  for (let i = 0; i < weighted.length; i++) {
    acc += weighted[i];
    if (pickPoint < acc) return arr[i].fn(ctx);
  }
  // 도달 불가 (총합 fallback)
  return arr[arr.length - 1].fn(ctx);
}

/* ─────────────────────── realmEnter (F2) ────────────────────── */
// Cycle-3 F1 fix: leading "(AGE세) " prefix 제거 + 자연어 "${age}세에 " 로 통일.
// 이유: sim-cycle-v2.ts:330 renderer 의 "- (${age}세) " prefix 와 충돌하던 이중
// 괄호 bug 해소. cycle-2 baseline 컨벤션 (battle/levelUp/drop/...) 과 동일 형태.
const REALM_ENTER_VARIANTS: Record<RealmId, Array<(c: { age: number }) => string>> = {
  base: [
    (c) => `${c.age}세에 들판의 풀이 처음으로 발끝을 스쳤다.`,
    (c) => `${c.age}세에 바람이 동쪽에서 불어왔다 — 시작의 들판이다.`,
    (c) => `${c.age}세에 머리 위로 첫 햇살이 내렸다.`,
    (c) => `${c.age}세에 발걸음마다 흙냄새가 일어났다.`,
    (c) => `${c.age}세에 멀리서 새벽 종소리가 들렸다.`,
  ],
  sea: [
    (c) => `${c.age}세에 바다 안개가 발치까지 올라왔다 — 심해의 문이 열렸다.`,
    (c) => `${c.age}세에 파도가 발목을 적셨다, 그 너머로 검은 물결이 솟았다.`,
    (c) => `${c.age}세에 짠 공기가 폐를 가득 채웠다.`,
    (c) => `${c.age}세에 모래 위에 첫 발자국을 남겼다 — 물길이 그것을 지웠다.`,
    (c) => `${c.age}세에 갈매기 한 마리가 시야 끝에서 사라졌다.`,
  ],
  volcano: [
    (c) => `${c.age}세에 발 밑이 뜨거워졌다 — 화산의 입구다.`,
    (c) => `${c.age}세에 검은 재가 머리 위로 떨어졌다.`,
    (c) => `${c.age}세에 멀리서 용암이 강처럼 흘렀다.`,
    (c) => `${c.age}세에 공기 자체가 떨렸다, 산이 숨 쉬는 소리였다.`,
    (c) => `${c.age}세에 붉은 빛이 얼굴을 비추었다.`,
  ],
  underworld: [
    (c) => `${c.age}세에 발 아래로 길이 사라졌다 — 황천의 입구였다.`,
    (c) => `${c.age}세에 빛이 꺼지고, 차가운 손이 어깨를 스쳤다.`,
    (c) => `${c.age}세에 그림자가 자신의 그림자를 가졌다.`,
    (c) => `${c.age}세에 어디선가 종이 울렸다 — 이미 죽은 자들의 종이었다.`,
    (c) => `${c.age}세에 길의 끝에는 강이 흘렀다, 강은 위로 흘렀다.`,
  ],
  heaven: [
    (c) => `${c.age}세에 발이 구름을 디뎠다 — 천공의 영토에 도달했다.`,
    (c) => `${c.age}세에 빛이 모든 방향에서 동시에 왔다.`,
    (c) => `${c.age}세에 공기가 너무 가벼워, 숨을 잊었다.`,
    (c) => `${c.age}세에 멀리서 노랫소리가 들렸다 — 노래의 출처는 보이지 않았다.`,
    (c) => `${c.age}세에 머리 위 별들이 발밑에서 빛났다.`,
  ],
  chaos: [
    (c) => `${c.age}세에 모든 방향이 한 점으로 모였다 — 혼돈의 중심이다.`,
    (c) => `${c.age}세에 시간이 멈췄다, 그러고는 거꾸로 흘렀다.`,
    (c) => `${c.age}세에 자신의 손이 두 개로 보였다, 그리고 셋, 그리고 무한대.`,
    (c) => `${c.age}세에 들렸던 모든 소리가 한 번에 다시 울렸다.`,
    (c) => `${c.age}세에 무엇이 자신이고 무엇이 아닌지의 경계가 흐려졌다.`,
  ],
};

/* ─────────────────────── seasonChange (F2) ──────────────────── */
const SEASON_REALM_PREFIX: Record<RealmId, string> = {
  base: '들판 위로',
  sea: '바다 위로',
  volcano: '용암 위로',
  underworld: '죽음의 강 위로',
  heaven: '구름 위로',
  chaos: '경계 너머로',
};

const SEASON_CHANGE_VARIANTS: Record<SeasonId, Array<(c: { age: number; prefix: string }) => string>> = {
  spring: [
    (c) => `${c.age}세에 계절이 바뀌었다 — ${c.prefix} 봄이 왔다.`,
  ],
  summer: [
    (c) => `${c.age}세에 계절이 바뀌었다 — ${c.prefix} 여름이 내렸다.`,
  ],
  fall: [
    (c) => `${c.age}세에 계절이 바뀌었다 — ${c.prefix} 가을이 들어찼다.`,
  ],
  winter: [
    (c) => `${c.age}세에 계절이 바뀌었다 — ${c.prefix} 겨울이 덮였다.`,
  ],
};

/* ─────────────────── npcEncounter (Cycle 264 — 6 kind 확장)
 * cycle 256 forNpcDeath 와 같은 패턴 답습. 직전 3 kind (mentor/rival/passerby)
 * 가 NpcEntity['kind'] 6 union 과 불일치 — friend/family_* 조우 시 callsite
 * 가 passerby 로 축소 변환했음. 본 cycle 에서 정합화.
 * legacy 3 kind 의 variant pool 보존 + 3 신규 kind 의 풀 신규.
 * 'passerby' 줄은 union 외 (legacy text), friend kind 에 재배치.
 */
const NPC_ENCOUNTER_VARIANTS: Record<NpcEntity['kind'], Array<(c: { age: number }) => string>> = {
  mentor: [
    (c) => `${c.age}세에 한 늙은 자가 길을 막았다 — 그의 눈은 자신의 미래를 보고 있었다. 멘토를 만났다.`,
    (c) => `${c.age}세에 사원 앞에서 길잡이가 손을 내밀었다. 멘토가 되겠다 했다.`,
    (c) => `${c.age}세에 멘토가 처음 가르친 것은 칼이 아니라 침묵이었다.`,
    (c) => `${c.age}세에 멘토는 자신의 영원을 한 권의 책으로 건넸다.`,
  ],
  rival: [
    (c) => `${c.age}세에 시야 끝에서 같은 표정의 그림자가 나타났다 — 라이벌이었다.`,
    (c) => `${c.age}세에 마을 입구에서 한 검객이 시선을 떨구지 않았다. 라이벌이다.`,
    (c) => `${c.age}세에 라이벌의 첫 칼이 자신의 어깨를 스쳤다 — 그가 더 빨랐다.`,
    (c) => `${c.age}세에 라이벌과 처음으로 같은 별 아래 잠들었다 — 적인 채로.`,
  ],
  friend: [
    // legacy passerby 3 줄 재배치 (어휘 자체 보존)
    (c) => `${c.age}세에 한 행인이 지나쳤다, 그러나 그의 얼굴은 오래 남았다.`,
    (c) => `${c.age}세에 짧은 인사가 길의 끝까지 따라왔다.`,
    (c) => `${c.age}세에 친구가 손을 내밀었다 — 이름은 끝내 묻지 않았다.`,
  ],
  family_parent: [
    (c) => `${c.age}세에 부모를 처음 떠난 뒤로 그리워했다.`,
    (c) => `${c.age}세에 부모가 자신의 첫 검을 손에 쥐어주었다.`,
  ],
  family_spouse: [
    (c) => `${c.age}세에 반려자와 처음 시선을 맞췄다 — 영원과 다른 시간이 시작되었다.`,
    (c) => `${c.age}세에 반려자가 약속의 빛을 그의 손에 걸었다.`,
  ],
  family_child: [
    (c) => `${c.age}세에 자식이 처음으로 자신의 이름을 불렀다.`,
    (c) => `${c.age}세에 자식의 작은 손이 자신의 칼끝을 잡았다 — 부드럽게.`,
  ],
};

/* ─────────────────── naturalDeath (Cycle 258) ────────────────
 * 자연사 1줄 hardcoded → 5 variant + composition (`pick → ageTone → realmTone`).
 * V3 정체성 = eternal hero. 자연사 = idle saga 의 클라이맥스. emotional-peak
 * pool 의 역경제 회수 (story-critic #1 — claim 600+ vs 자연사 1줄).
 * legacy 1줄 ("안식을 맞아 잠들었다") = entry 0 보존 (seed=0 backward compat).
 */
const NATURAL_DEATH_VARIANTS: Array<(c: { age: number }) => string> = [
  (c) => `${c.age}세에 안식을 맞아 잠들었다.`,
  (c) => `${c.age}세에 마지막 호흡이 가지런해졌다.`,
  (c) => `${c.age}세에 한 생애의 페이지가 조용히 닫혔다.`,
  (c) => `${c.age}세에 영웅은 눈을 감았다 — 다음 영웅은 아직 태어나지 않았다.`,
  (c) => `${c.age}세에 모든 길이 끝나 자취가 별이 되었다.`,
];

/* ─────────────────────── npcDeath (F3) — Cycle 256 ─────────────
 * NPC kind 별 분기. legacy 3 줄 (mentor / rival / friend) 보존 + 신규
 * 11 줄 = 총 14 variant. NpcEntity['kind'] union 6 kind 모두 production
 * spawn 확인 (CycleControllerV2.ts:1206/1214/1220/1226/1241).
 * fallback (kind 누락) = friend 풀 — typecheck 가 강제하므로 defensive.
 */
const NPC_DEATH_VARIANTS_BY_KIND: Record<NpcEntity['kind'], Array<(c: { age: number }) => string>> = {
  mentor: [
    (c) => `${c.age}세에 멘토가 침대에서 일어나지 못했다 — 한 시대가 끝났다.`,
    (c) => `${c.age}세에 멘토의 마지막 말은 가르침이 아니라 침묵이었다.`,
    (c) => `${c.age}세에 멘토는 자신의 지팡이를 영웅에게 건네고 잠들었다.`,
  ],
  rival: [
    (c) => `${c.age}세에 라이벌의 마지막 칼은 자신의 것이었다 — 둘 다 살아남지 못했다.`,
    (c) => `${c.age}세에 라이벌이 먼저 무릎을 꿇었다 — 영웅은 처음으로 이긴 것이 무서웠다.`,
    (c) => `${c.age}세에 라이벌의 검은 끝내 자신의 이름을 새기지 못한 채 부러졌다.`,
  ],
  friend: [
    (c) => `${c.age}세에 친구의 부고를 멀리서 들었다 — 이름은 끝내 몰랐다.`,
    (c) => `${c.age}세에 친구가 떠난 자리에 짧은 인사만 남았다.`,
    (c) => `${c.age}세에 친구의 술잔이 마지막으로 빈 채로 식어갔다.`,
  ],
  family_parent: [
    (c) => `${c.age}세에 부모가 자신보다 먼저 별이 되었다.`,
    (c) => `${c.age}세에 부모의 손을 마지막으로 잡았다 — 그 손은 자신을 안았던 그 손이었다.`,
    (c) => `${c.age}세에 부모의 빈 자리에서 영웅은 처음으로 자신의 영원이 무거웠다.`,
  ],
  family_spouse: [
    (c) => `${c.age}세에 반려자가 먼저 잠들었다 — 영웅은 자신의 회춘이 처음으로 죄스러웠다.`,
    (c) => `${c.age}세에 반려자의 마지막 숨을 지켜보았다 — 영원은 함께 늙을 수 없는 형벌이었다.`,
  ],
  family_child: [
    (c) => `${c.age}세에 자식이 영웅보다 먼저 늙어 떠났다.`,
    (c) => `${c.age}세에 자식의 무덤 앞에서 영웅은 처음으로 자신의 영원을 저주했다.`,
  ],
};

/* ─────────────────────── familyEvent (Cycle 271 — pool 6 → 9)
 * cycle 264 답습 — kind 별 풀 두께. eternal hero × 인간 가족 시간 비대칭의
 * narrative 강화. 각 event type 의 풀 2 → 3.
 */
const FAMILY_EVENT_VARIANTS: Record<'marriage' | 'child_born' | 'child_grown', Array<(c: { age: number }) => string>> = {
  marriage: [
    (c) => `${c.age}세에 종소리 아래 결혼식을 올렸다.`,
    (c) => `${c.age}세에 서로의 손을 잡았다 — 이제 둘이다.`,
    (c) => `${c.age}세에 반지가 두 영원을 묶었다 — 한 쪽은 인간이었지만.`,
  ],
  child_born: [
    (c) => `${c.age}세에 첫 자식의 울음소리가 새벽을 깨웠다.`,
    (c) => `${c.age}세에 자식이 태어났다 — 작은 손이 자신의 손을 쥐었다.`,
    (c) => `${c.age}세에 자식의 첫 눈빛이 자신의 영원을 한 번에 흔들었다.`,
  ],
  child_grown: [
    (c) => `${c.age}세에 자식이 처음으로 자신보다 큰 칼을 들었다.`,
    (c) => `${c.age}세에 자식이 떠났다 — 자신의 길로.`,
    (c) => `${c.age}세에 자식의 등이 자신보다 커진 날 — 거울 앞에 처음으로 늙음을 그리워했다.`,
  ],
};

/* ─────────────────── Cycle 35-39 D7 (cycle 19 retry) ─────────────────
 * age prefix 다양화. "Ne에" 의 단조로움 해소. seed % 4 분기.
 * seed=0 일 때 변형 0 만 → 기존 test fixture 호환. */
function age5Tone(text: string, seed: number): string {
  if (seed === 0) return text;
  const variant = seed % 4;
  if (variant === 0) return text;
  const replacement =
    variant === 1 ? '어릴 적부터 ' :
    variant === 2 ? '유년의 어느 날 ' :
    '동심에 머무는 시기에 ';
  return text.replace(/^5세에 /, replacement);
}

/** Cycle 39: age 6-12 (young chapter). 4 variants. */
function ageYoungTone(text: string, age: number, seed: number): string {
  if (seed === 0 || age < 6 || age > 12) return text;
  const variant = seed % 4;
  if (variant === 0) return text;
  const replacement =
    variant === 1 ? `${age}세 무렵 ` :
    variant === 2 ? `${age}세의 어느 날 ` :
    `${age}세 동심으로 `;
  return text.replace(new RegExp(`^${age}세에 `), replacement);
}

/** Cycle 41: age 13-29 (청년기). 4 variants. */
function ageYoungAdultTone(text: string, age: number, seed: number): string {
  if (seed === 0 || age < 13 || age > 29) return text;
  const variant = seed % 4;
  if (variant === 0) return text;
  const replacement =
    variant === 1 ? `${age}세 청춘에 ` :
    variant === 2 ? `${age}세 한창에 ` :
    `${age}세 떠오르는 시기에 `;
  return text.replace(new RegExp(`^${age}세에 `), replacement);
}

/** Cycle 41: age 30-49 (장년기). 4 variants. */
function ageMatureTone(text: string, age: number, seed: number): string {
  if (seed === 0 || age < 30 || age > 49) return text;
  const variant = seed % 4;
  if (variant === 0) return text;
  const replacement =
    variant === 1 ? `${age}세 무르익은 시기에 ` :
    variant === 2 ? `${age}세 깊어진 손으로 ` :
    `${age}세 단련된 의지로 `;
  return text.replace(new RegExp(`^${age}세에 `), replacement);
}

/** Cycle 42: age 50-69 (노년기). */
function ageElderTone(text: string, age: number, seed: number): string {
  if (seed === 0 || age < 50 || age > 69) return text;
  const variant = seed % 4;
  if (variant === 0) return text;
  const replacement =
    variant === 1 ? `${age}세 백발의 시기에 ` :
    variant === 2 ? `${age}세 황혼 무렵 ` :
    `${age}세 깊은 주름으로 `;
  return text.replace(new RegExp(`^${age}세에 `), replacement);
}

/** Cycle 42: age 70+ (마지막 — eternal hero's natural cap). */
function ageFinalTone(text: string, age: number, seed: number): string {
  if (seed === 0 || age < 70) return text;
  const variant = seed % 4;
  if (variant === 0) return text;
  const replacement =
    variant === 1 ? `${age}세 한 생애의 끝에 ` :
    variant === 2 ? `${age}세 만년의 햇살에 ` :
    `${age}세 마지막 호흡으로 `;
  return text.replace(new RegExp(`^${age}세에 `), replacement);
}

/** Single entrypoint — picks by age tier. */
function ageTone(text: string, age: number, seed: number): string {
  if (age === 5) return age5Tone(text, seed);
  if (age <= 12) return ageYoungTone(text, age, seed);
  if (age <= 29) return ageYoungAdultTone(text, age, seed);
  if (age <= 49) return ageMatureTone(text, age, seed);
  if (age <= 69) return ageElderTone(text, age, seed);
  return ageFinalTone(text, age, seed);
}

/* ─────────────────── Cycle 101 — realmTone dispatcher ───────────────────
 * 6 realm × 4 variant (variant 0 = 원문 그대로 = backward compat).
 *
 * 차이점 (의도된 분리):
 *   ageTone   : `^${age}세에 ` prefix 영역 replace
 *   realmTone : 본문 끝에 사이절 어휘 append (`${text} ${suffix}.`)
 * 두 영역이 절대 겹치지 않아 composition 안전.
 *
 * Composition order (호출자 안):
 *   pick → ageTone → realmTone
 *
 * seed=0 → 항상 variant 0 (원문 그대로) → 기존 fixture 100% 호환.
 * realm=null/undefined → 원문 그대로 (early hero spawn 전 graceful).
 */
const REALM_SUFFIX_CATALOG: Record<RealmId, readonly [string, string, string]> = {
  base: ['들판에서', '바람에 흔들리며', '흙냄새 속에서'],
  sea: ['파도 곁에서', '심해의 침묵 속', '갯바람을 가르며'],
  volcano: ['용암의 열기 속', '검은 재 위에서', '붉은 빛을 받으며'],
  underworld: ['황천의 그림자 속', '차가운 손 사이', '꺼진 빛 너머에서'],
  heaven: ['빛의 다리 위', '구름의 결 사이', '별빛 가루를 밟으며'],
  chaos: ['혼돈의 중심에서', '시간을 잊은 곳', '경계가 흐려진 자리에서'],
};

export function realmTone(
  text: string,
  realm: RealmId | null | undefined,
  seed: number,
): string {
  if (!realm) return text;
  if (seed === 0) return text;
  const variant = ((seed % 4) + 4) % 4;
  if (variant === 0) return text;
  const suffix = REALM_SUFFIX_CATALOG[realm][variant - 1];
  return `${text} ${suffix}.`;
}

/* ─────────────────── 공개 API ───────────────────────────────── */
export const NarrationVariants = {
  battle(ctx: { age: number; enemyNameKR: string; realm?: RealmId | null }, seed = 0): string {
    const out = pick(BATTLE_VARIANTS, ctx, seed);
    const aged = ageTone(out, ctx.age, seed);
    return realmTone(aged, ctx.realm, seed);
  },
  levelUp(ctx: { age: number; newLevel: number; realm?: RealmId | null }, seed = 0): string {
    const out = pick(LEVELUP_VARIANTS, ctx, seed);
    const aged = ageTone(out, ctx.age, seed);
    return realmTone(aged, ctx.realm, seed);
  },
  levelUpBatch(ctx: { age: number; fromLevel: number; toLevel: number; count: number; realm?: RealmId | null }, seed = 0): string {
    const out = pick(LEVELUP_BATCH_VARIANTS, ctx, seed);
    const aged = ageTone(out, ctx.age, seed);
    return realmTone(aged, ctx.realm, seed);
  },
  drop(ctx: { age: number; itemNameKR: string; realm?: RealmId | null }, seed = 0): string {
    const out = pick(DROP_VARIANTS, ctx, seed);
    const aged = ageTone(out, ctx.age, seed);
    return realmTone(aged, ctx.realm, seed);
  },
  shrineHealed(ctx: { age: number; healed: number; realm?: RealmId | null }, seed = 0): string {
    const out = pick(SHRINE_HEALED_VARIANTS, ctx, seed);
    const aged = ageTone(out, ctx.age, seed);
    return realmTone(aged, ctx.realm, seed);
  },
  shrineCalm(ctx: { age: number; realm?: RealmId | null }, seed = 0): string {
    const out = pick(SHRINE_CALM_VARIANTS, ctx, seed);
    const aged = ageTone(out, ctx.age, seed);
    return realmTone(aged, ctx.realm, seed);
  },
  moralChoice(ctx: { age: number; choiceNameKR: string; realm?: RealmId | null }, seed = 0): string {
    const out = pick(MORAL_VARIANTS, ctx, seed);
    const aged = ageTone(out, ctx.age, seed);
    return realmTone(aged, ctx.realm, seed);
  },
  skillLearned(ctx: { age: number; skillNameKR: string; realm?: RealmId | null }, seed = 0): string {
    const out = pick(SKILL_VARIANTS, ctx, seed);
    const aged = ageTone(out, ctx.age, seed);
    return realmTone(aged, ctx.realm, seed);
  },
  jobUnlock(ctx: { age: number; jobNameKR: string; tier: number; realm?: RealmId | null }, seed = 0): string {
    const out = pick(JOB_VARIANTS, ctx, seed);
    const aged = ageTone(out, ctx.age, seed);
    return realmTone(aged, ctx.realm, seed);
  },
  rejuvenation(ctx: { age: number; yearsBack: number; rejuvenationCount: number }, seed = 0): string {
    return pick(REJUVENATION_VARIANTS, ctx, seed);
  },
  realmEnter(ctx: { age: number; realm: RealmId }, seed = 0): string {
    const variants = REALM_ENTER_VARIANTS[ctx.realm];
    return pick(variants, { age: ctx.age }, seed);
  },
  seasonChange(ctx: { age: number; season: SeasonId; realm: RealmId }, seed = 0): string {
    const variants = SEASON_CHANGE_VARIANTS[ctx.season];
    const prefix = SEASON_REALM_PREFIX[ctx.realm];
    return pick(variants, { age: ctx.age, prefix }, seed);
  },
  npcEncounter(ctx: { age: number; kind: NpcEntity['kind']; realm?: RealmId | null }, seed = 0): string {
    const variants = NPC_ENCOUNTER_VARIANTS[ctx.kind] ?? NPC_ENCOUNTER_VARIANTS.friend;
    const out = pick(variants, { age: ctx.age }, seed);
    return realmTone(out, ctx.realm, seed);
  },
  naturalDeath(ctx: { age: number; realm?: RealmId | null }, seed = 0): string {
    const out = pick(NATURAL_DEATH_VARIANTS, { age: ctx.age }, seed);
    const aged = ageTone(out, ctx.age, seed);
    return realmTone(aged, ctx.realm, seed);
  },
  npcDeath(ctx: { age: number; kind: NpcEntity['kind']; realm?: RealmId | null }, seed = 0): string {
    const variants = NPC_DEATH_VARIANTS_BY_KIND[ctx.kind] ?? NPC_DEATH_VARIANTS_BY_KIND.friend;
    const out = pick(variants, { age: ctx.age }, seed);
    return realmTone(out, ctx.realm, seed);
  },
  familyEvent(ctx: { age: number; type: 'marriage' | 'child_born' | 'child_grown'; realm?: RealmId | null }, seed = 0): string {
    const variants = FAMILY_EVENT_VARIANTS[ctx.type];
    const out = pick(variants, { age: ctx.age }, seed);
    return realmTone(out, ctx.realm, seed);
  },
};
