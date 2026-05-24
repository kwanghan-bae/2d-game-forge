/**
 * narrationVariants.ts
 * 이벤트 타입별 나레이션 변형 (5–8개씩). seed 기반으로 선택해 단조로움 방지.
 */

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
};
