/**
 * narrationVariants.ts
 * 이벤트 타입별 나레이션 변형 (5–8개씩). seed 기반으로 선택해 단조로움 방지.
 */

import type { RealmId, SeasonId } from '../types';

/** Object marker (을/를) — NarrativeGenerator 의 동일 로직 복사. */
function obj(noun: string): string {
  const last = noun.charCodeAt(noun.length - 1);
  if (Number.isNaN(last) || last < 0xac00 || last > 0xd7a3) return `${noun}를`;
  const jongseong = (last - 0xac00) % 28;
  return jongseong === 0 ? `${noun}를` : `${noun}을`;
}

/* ─────────────────────────── battle ─────────────────────────── */
const BATTLE_VARIANTS: Array<(c: { age: number; enemyNameKR: string }) => string> = [
  (c) => `${c.age}세에 ${obj(c.enemyNameKR)} 처치했다.`,
  (c) => `${c.age}세에 ${obj(c.enemyNameKR)} 베어넘겼다.`,
  (c) => `${c.age}세에 ${obj(c.enemyNameKR)} 단숨에 쓰러뜨렸다.`,
  (c) => `${c.age}세에 ${obj(c.enemyNameKR)} 압도했다.`,
  (c) => `${c.age}세에 ${obj(c.enemyNameKR)} 제압했다.`,
  (c) => `${c.age}세에 ${c.enemyNameKR}가 쓰러졌다.`,
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
  (c) => `${c.age}세에 ${c.itemNameKR}이(가) 빛났다.`,
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
  (c) => `${c.age}세에 ${c.jobNameKR}이(가) 되었다. (Tier ${c.tier})`,
  (c) => `${c.age}세에 ${c.jobNameKR}의 길에 들어섰다. (Tier ${c.tier})`,
  (c) => `${c.age}세에 마침내 ${c.jobNameKR}로 거듭났다. (Tier ${c.tier})`,
  (c) => `${c.age}세에 ${c.jobNameKR}의 칭호를 얻었다. (Tier ${c.tier})`,
  (c) => `${c.age}세에 영웅은 ${c.jobNameKR}가 되었다. (Tier ${c.tier})`,
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

/* ─────────────────────── realmEnter (F2) ────────────────────── */
const REALM_ENTER_VARIANTS: Record<RealmId, Array<(c: { age: number }) => string>> = {
  base: [
    (c) => `(${c.age}세) 들판의 풀이 처음으로 발끝을 스쳤다.`,
    (c) => `(${c.age}세) 바람이 동쪽에서 불어왔다 — 시작의 들판이다.`,
    (c) => `(${c.age}세) 머리 위로 첫 햇살이 내렸다.`,
    (c) => `(${c.age}세) 발걸음마다 흙냄새가 일어났다.`,
    (c) => `(${c.age}세) 멀리서 새벽 종소리가 들렸다.`,
  ],
  sea: [
    (c) => `(${c.age}세) 바다 안개가 발치까지 올라왔다 — 심해의 문이 열렸다.`,
    (c) => `(${c.age}세) 파도가 발목을 적셨다, 그 너머로 검은 물결이 솟았다.`,
    (c) => `(${c.age}세) 짠 공기가 폐를 가득 채웠다.`,
    (c) => `(${c.age}세) 모래 위에 첫 발자국을 남겼다 — 물길이 그것을 지웠다.`,
    (c) => `(${c.age}세) 갈매기 한 마리가 시야 끝에서 사라졌다.`,
  ],
  volcano: [
    (c) => `(${c.age}세) 발 밑이 뜨거워졌다 — 화산의 입구다.`,
    (c) => `(${c.age}세) 검은 재가 머리 위로 떨어졌다.`,
    (c) => `(${c.age}세) 멀리서 용암이 강처럼 흘렀다.`,
    (c) => `(${c.age}세) 공기 자체가 떨렸다, 산이 숨 쉬는 소리였다.`,
    (c) => `(${c.age}세) 붉은 빛이 얼굴을 비추었다.`,
  ],
  underworld: [
    (c) => `(${c.age}세) 발 아래로 길이 사라졌다 — 황천의 입구였다.`,
    (c) => `(${c.age}세) 빛이 꺼지고, 차가운 손이 어깨를 스쳤다.`,
    (c) => `(${c.age}세) 그림자가 자신의 그림자를 가졌다.`,
    (c) => `(${c.age}세) 어디선가 종이 울렸다 — 이미 죽은 자들의 종이었다.`,
    (c) => `(${c.age}세) 길의 끝에는 강이 흘렀다, 강은 위로 흘렀다.`,
  ],
  heaven: [
    (c) => `(${c.age}세) 발이 구름을 디뎠다 — 천공의 영토에 도달했다.`,
    (c) => `(${c.age}세) 빛이 모든 방향에서 동시에 왔다.`,
    (c) => `(${c.age}세) 공기가 너무 가벼워, 숨을 잊었다.`,
    (c) => `(${c.age}세) 멀리서 노랫소리가 들렸다 — 노래의 출처는 보이지 않았다.`,
    (c) => `(${c.age}세) 머리 위 별들이 발밑에서 빛났다.`,
  ],
  chaos: [
    (c) => `(${c.age}세) 모든 방향이 한 점으로 모였다 — 혼돈의 중심이다.`,
    (c) => `(${c.age}세) 시간이 멈췄다, 그러고는 거꾸로 흘렀다.`,
    (c) => `(${c.age}세) 자신의 손이 두 개로 보였다, 그리고 셋, 그리고 무한대.`,
    (c) => `(${c.age}세) 들렸던 모든 소리가 한 번에 다시 울렸다.`,
    (c) => `(${c.age}세) 무엇이 자신이고 무엇이 아닌지의 경계가 흐려졌다.`,
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
    (c) => `(${c.age}세) 계절이 바뀌었다 — ${c.prefix} 봄이 왔다.`,
  ],
  summer: [
    (c) => `(${c.age}세) 계절이 바뀌었다 — ${c.prefix} 여름이 내렸다.`,
  ],
  fall: [
    (c) => `(${c.age}세) 계절이 바뀌었다 — ${c.prefix} 가을이 들어찼다.`,
  ],
  winter: [
    (c) => `(${c.age}세) 계절이 바뀌었다 — ${c.prefix} 겨울이 덮였다.`,
  ],
};

/* ─────────────────── 공개 API ───────────────────────────────── */
export const NarrationVariants = {
  battle(ctx: { age: number; enemyNameKR: string }, seed = 0): string {
    return pick(BATTLE_VARIANTS, ctx, seed);
  },
  levelUp(ctx: { age: number; newLevel: number }, seed = 0): string {
    return pick(LEVELUP_VARIANTS, ctx, seed);
  },
  levelUpBatch(ctx: { age: number; fromLevel: number; toLevel: number; count: number }, seed = 0): string {
    return pick(LEVELUP_BATCH_VARIANTS, ctx, seed);
  },
  drop(ctx: { age: number; itemNameKR: string }, seed = 0): string {
    return pick(DROP_VARIANTS, ctx, seed);
  },
  shrineHealed(ctx: { age: number; healed: number }, seed = 0): string {
    return pick(SHRINE_HEALED_VARIANTS, ctx, seed);
  },
  shrineCalm(ctx: { age: number }, seed = 0): string {
    return pick(SHRINE_CALM_VARIANTS, ctx, seed);
  },
  moralChoice(ctx: { age: number; choiceNameKR: string }, seed = 0): string {
    return pick(MORAL_VARIANTS, ctx, seed);
  },
  skillLearned(ctx: { age: number; skillNameKR: string }, seed = 0): string {
    return pick(SKILL_VARIANTS, ctx, seed);
  },
  jobUnlock(ctx: { age: number; jobNameKR: string; tier: number }, seed = 0): string {
    return pick(JOB_VARIANTS, ctx, seed);
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
};
