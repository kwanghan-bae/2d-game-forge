# Cycle 156 비평 (Story Writer) — Anticipation 4 + TierVocative 60 variation + narrativeWeightMul doubly-dormant

cycle 145 critic 이 제안한 세 권고 중 **두 개는 회수**, **한 개는 미회수**. (1) anticipation 톤 swap → cycle 147 에서 12 줄 중 4 줄 신규 추가 (`'다음 무대의 막이 천천히 열린다'` 등). (2) ClaimerTier 별 후원자 호칭 → cycle 148 에서 `TIER_VOCATIVE_PREFIX` 5 tier × 12 base = 60 variation. (3) active SeasonalModifier 별 sub-pool → **미회수** (이유: 데이터 token 자체가 없는 doubly-dormant 상태, 본 cycle 약점 #1). 추가로 cycle 155 에서 `getNarrativeWeightMul` helper 가 정착됐지만 consumer 0 + 매칭 대상 데이터 0 — V3 narration 의 가장 큰 invisible delta.

## narrative health

| 축 | 점수 | 근거 |
|---|---|---|
| variance (variant 풀 두께) | 7/10 | claim narration 12 줄은 cycle 145 의 6/10 에서 anticipation 4 추가로 closure 8 : anticipation 4 = 6:4 비율 확립. motif scatter 도 12 줄이 거의 1 줄 1 motif (노고/페이지/저울/별/침묵/시간/하늘/이름 + 무대/돌길/깃발/장) — cycle 145 가 지적한 4×3 회전 봉인 실질 해소. 60 variation 은 marketing math (사용자가 한 세션에 보는 prefix 는 단일 tier 의 고정 1 호칭 → 실 노출 다양성은 여전히 base 12). saga narrationVariants 풀은 cycle 101 이후 정체 — 여기는 별도 사안 |
| 톤 일관성 (tier / season / persona) | 6/10 | tier prefix 5 종 (`'용사여'` / `'오랜 길손이여'` / `'익숙한 손이여'` / `'장로여'` / `'오랜 동반자여'`) 은 거리감→친밀감 곡선이 깔끔. 그러나 `CLAIM_NARRATION_VARIANTS[0]` 의 base 가 자체 vocative `'용사여'` 를 이미 보유 — prefix 합성 시 **이중 호칭** 발생 (약점 #2). 또 cycle 149 의 `chaos-narrative-elegy` / `heaven-narrative-ode` 두 modifier 가 active 여도 narration 변화 0 — season 톤 강조 미실현 |
| 감정 곡선 (claim 순간 보상감) | 8/10 | cycle 145 의 5/10 에서 큰 회수. closure 8 의 *닫힘* 톤 사이에 anticipation 4 의 *열림* 톤이 6:4 로 끼어들면서 매 claim 마다 닫힘/열림 비트가 번갈아 발생 가능. *진행 중* 감각 복원. anticipation 4 자체의 어휘 (`'막이 천천히 열린다'`, `'아직 쓰지 않은 장이 그대를 기다린다'`) 도 closure 8 의 신적 어조 (`'한 페이지가 더 채워졌다'`) 와 micro-clash 없음 — 동일 화자(신/후원자)의 시제만 미래로 swap |
| 세계관 정합 (V3 eternal hero + 6 realm) | 5/10 | claim narration 은 여전히 **realm-blind**. chaos 차원에서 claim 해도 base 에서 claim 해도 같은 풀. cycle 145 의 같은 비판 미회수. 더 큰 부채는 cycle 155 의 `getNarrativeWeightMul` 가 *doubly dormant* — (a) consumer 0, (b) `narrationVariants.ts` 의 430 줄 어디에도 `elegy/tragedy/ode/hymn` 같은 tone tag 0 개. catalog 의 narrativeWeightMul key 가 매칭할 데이터 구조 자체가 없음. 6 realm × 4 season 의 surface variation 이 narration 한 줄도 못 흔든 상태 |

## 약점 TOP 3

1. **`narrativeWeightMul` 이 doubly-dormant (seasonalModifierCatalog.ts:39,89 + seasonalModifierApply.ts:34 + narrationVariants.ts 전체)** — cycle 155 가 `getNarrativeWeightMul(rule, tone): number` 를 pure helper 로 정착했지만 grep 결과 callsite 0 (자기 self-test 만). 더 결정적인 누락 = `narrationVariants.ts` 의 430 줄 어디에도 `tone: 'elegy' | 'tragedy' | 'ode' | 'hymn'` 같은 tag *0 개*. 즉 catalog 의 `chaos-narrative-elegy` (cycle 137) 과 `heaven-narrative-ode` (cycle 149) 두 modifier 의 narrativeWeightMul key (elegy/tragedy/ode/hymn) 가 매칭할 **데이터 구조 자체가 없음**. wire 가 안 된 게 아니라 적용 대상 token 이 비어있음. 결과: 30-day rotation 의 6 modifier 중 2 개 (1/3) 가 *완전한 inert* — 다른 4 종은 traitWeightMul/cosmeticTint 로 sim/UI 에 영향 있지만 두 narrative modifier 는 *catalog 의 description 외에는 어디서도 surface 0*. 해결 방향: NarrationVariants 의 emotional-peak variant (death/rejuvenation/realm-enter chaos·heaven) 에 `{ tone: 'elegy' | 'ode' | ... }` 메타 부착 + `NarrationVariants.pick` 시그니처에 `activeModifier?` 받아 tone 가중 weighted random.

2. **이중 호칭 버그 — `CLAIM_NARRATION_VARIANTS[0]` 의 자체 vocative 와 `TIER_VOCATIVE_PREFIX` 충돌 (claimNarrationVariants.ts:13)** — 12 base 중 첫 줄 `'용사여, 그대의 노고를 치하한다'` 가 자체 호칭 `'용사여'` 를 이미 보유. 나머지 11 줄은 vocative 없음. cycle 148 의 prefix 합성 `` `${TIER_VOCATIVE_PREFIX[tier]}, ${base}` `` 가 적용되면 — `'용사여, 용사여, 그대의 노고를 치하한다'` (신참), `'오랜 동반자여, 용사여, 그대의 노고를 치하한다'` (전설) 같은 이중 호칭 출력. 후원자가 hero 를 두 호칭으로 동시에 부르는 어색한 텍스트. 1/12 확률 + seed 0 일 때 deterministic 노출 → 신참 tier 의 신규 사용자 첫 인상 직격. 테스트 (claimNarrationVariants.test.ts:36-37) 는 string 구조만 검증해 못 잡음. 해결 방향: `CLAIM_NARRATION_VARIANTS[0]` 의 `'용사여, '` prefix 제거 → `'그대의 노고를 치하한다'` 로 통일. 신참 tier 호칭 fallback 은 prefix `'용사여'` 가 이미 담당.

3. **cycle 145 권고 #3 미회수 + claim narration realm-blind 표류 (claimNarrationVariants.ts 전체 + seasonalModifierSelector)** — cycle 145 가 `pickClaimNarration(seed, { activeSeason })` 으로 sub-pool 20% 추가를 권고했지만 cycle 146-155 어디에도 회수 0. 약점 #1 의 doubly-dormant 와 같은 원인 — narrative_weight axis 가 traitWeightMul / cosmeticTint 보다 항상 후순위로 밀렸다. 결과: SeasonPassScreen header 의 active season chip 은 보이는데 claim narration 자체는 시즌 1-6 어느 시점에도 동일 12 줄 풀에서만 뽑힘. 또 cycle 101+ NarrationVariants 의 6 realm × 5 variant realmEnter 와 달리 claim narration 만 realm 어휘 0. 해결 방향: 약점 #1 의 tone tag 도입과 묶어 한 sub-spec 로 처리. claim narration 은 *eternal hero 의 saga page-turn* 이라는 컨셉을 살리려면 sub-pool 2-3 줄 (예: chaos modifier active 시 `'혼돈의 비가가 그대의 이름을 부른다'`) 만 추가해도 month-by-month 분위기 변화 surface.

## 차기 narrative 제안

### 1. **NarrationVariants 의 emotional-peak variant 에 tone tag 부착 + `pick` 가중 (약점 #1 의 회수 spec)**

scope = saga 의 NarrationVariants 4 종 (death / rejuvenation / realmEnter chaos·heaven). 본 cycle 의 doubly-dormant 해결의 *최소 spec*. 모든 variant 에 tag 다는 게 아니라 *catalog 의 tone key 와 매칭하는 줄만* 메타 부착.

예시 변형 (실제 텍스트 — narrationVariants.ts 의 기존 줄 retag, 신규 줄 추가 0):

```ts
// 기존 REJUVENATION_VARIANTS (cycle V3) — tone tag 부착 only
const REJUVENATION_VARIANTS: Array<{ tone?: 'ode' | 'hymn' | 'elegy'; build: (c) => string }> = [
  { build: (c) => `${c.age}세에 빛의 은총으로 ${c.yearsBack}년이 사라졌다 — 재생 #${c.rejuvenationCount}.`, tone: 'ode' },       // 빛/은총 = ode
  { build: (c) => `${c.age}세에 신의 빛이 ${c.yearsBack}년을 되돌렸다 — 재생 #${c.rejuvenationCount}.`, tone: 'hymn' },           // 신의 빛 = hymn
  { build: (c) => `${c.age}세에 시간의 흐름이 역전됐다. ${c.yearsBack}년 회춘 — 재생 #${c.rejuvenationCount}.` },                  // tone 없음 (neutral)
  { build: (c) => `${c.age}세에 젊음이 돌아왔다 (${c.yearsBack}년) — 재생 #${c.rejuvenationCount}.` },
  { build: (c) => `${c.age}세에 영원한 빛이 ${c.yearsBack}년의 노화를 지웠다 — 재생 #${c.rejuvenationCount}.`, tone: 'ode' },     // 영원한 빛 = ode
];

// REALM_ENTER underworld 의 한 줄에 elegy tag (chaos-narrative-elegy 와 cross-tag)
{ build: (c) => `${c.age}세에 어디선가 종이 울렸다 — 이미 죽은 자들의 종이었다.`, tone: 'elegy' },
{ build: (c) => `${c.age}세에 길의 끝에는 강이 흘렀다, 강은 위로 흘렀다.`, tone: 'tragedy' },
```

`NarrationVariants.rejuvenation(opts, seed, activeModifier?)` 가 active modifier 의 `narrativeWeightMul` 을 호출해 가중 random. heaven-ode active 시 ode/hymn tagged 줄이 1.5× weight — 사용자가 한 달 동안 회춘 비트에서 천상 어조를 자주 듣는다. chaos-elegy 도 동일.

근거: 약점 #1 의 doubly-dormant 를 *데이터 부족* + *consumer 부재* 양쪽 동시에 해결하는 최소 spec. tag 추가는 variant 줄 수 증가 0 (기존 줄에 메타만 부착). pick 시그니처 확장도 backward-compatible (activeModifier 미전달 시 기존 seed-based pick). 6 modifier 중 2 narrative_weight 가 처음으로 *visible delta* 획득.

### 2. **`CLAIM_NARRATION_VARIANTS[0]` 의 자체 vocative 제거 (약점 #2 의 1-line fix)**

scope = claimNarrationVariants.ts:13 한 줄.

```ts
// 기존
'용사여, 그대의 노고를 치하한다',

// 수정
'그대의 노고를 치하한다',
```

근거: prefix 합성과 충돌하는 deterministic bug. seed=0 시 항상 노출 + 1/12 확률 무작위 노출. test (claimNarrationVariants.test.ts) 의 새 case 도 동반 — `pickClaimNarration(0, '신참').split(', ').length === 2` (이중 호칭이면 3 이상). 풀 크기 12 유지, 톤 변화 0 (호칭은 prefix 가 담당).

### 3. **claim narration 의 realm-aware sub-pool 2-3 줄 (cycle 145 #3 미회수 분 회수)**

scope = `pickClaimNarration(seed, tier, activeSeason?)` 시그니처 확장. base 12 풀 외 sub-pool 2-3 줄을 activeSeason 의 type === 'narrative_weight' 일 때만 20% 확률로 추가 추첨.

예시 변형 (실제 텍스트):

```ts
const CLAIM_SUBPOOL_BY_TONE: Readonly<Record<'elegy' | 'tragedy' | 'ode' | 'hymn', readonly string[]>> = {
  // chaos-narrative-elegy active 시 (cycle 137)
  elegy: [
    '혼돈의 비가가 그대의 이름을 부른다',
    '한 페이지가 채워졌지만, 잉크는 검다',
  ],
  tragedy: [
    '그대의 노래는 슬프다 — 그러나 끝나지 않는다',
  ],
  // heaven-narrative-ode active 시 (cycle 149)
  ode: [
    '천상의 송가가 그대의 발걸음을 따른다',
    '구름 위 화음이 그대의 이름을 부른다',
  ],
  hymn: [
    '신의 성가가 그대의 한 장을 봉인한다',
  ],
};
```

근거: cycle 145 #3 의 미회수분 + 약점 #1 spec 의 *claim 쪽* mirror. saga narration (제안 #1) 과 claim narration (제안 #3) 양쪽이 같은 tone token 을 공유 → 시즌 한 달 동안 saga 도 claim 도 동일 톤으로 *분위기 통일*. 사용자가 명시적으로 인지 못 해도 10 분 idle 시 "이 달은 슬프다" 같은 *ambient* feel 형성. 풀 크기 12 → 14-15 (sub-pool 가산), 20% 확률 trigger 라 base 풀의 결정성도 보존.

## 표류 경보

- **`narrativeWeightMul` doubly-dormant (data + consumer 양쪽 비어있음)**: 약점 #1 그대로. cycle 137 의 chaos-elegy 가 9 cycle 동안 inert, cycle 149 의 heaven-ode 도 6 cycle 동안 inert. catalog 에 8 modifier 중 narrative type 2 종 (1/4) 이 surface 0 — *visible-but-inert* 보다 더 나쁜 *invisible-and-inert*. 제안 #1 + #3 묶음 spec 으로 회수 가능.
- **이중 호칭 버그 (CLAIM_NARRATION_VARIANTS[0] 의 vocative)**: 약점 #2 그대로. 1-line fix 라 cycle 156 안에 정리 가능.
- **claim narration realm-blind 누적**: cycle 145 critic 이 이미 지적, cycle 146-155 어디서도 회수 0. 11 cycle 표류 누적. SeasonPassScreen 의 active season chip 이 *보이는데* narration 은 *안 변하는* UI/text contract 불일치.
- **새 트로프 도입 없음 (정합 유지)**: anticipation 4 의 motif (무대·돌길·깃발·장) 와 TIER_VOCATIVE_PREFIX 5 호칭 모두 V3 후원자/신/eternal hero 컨셉 안에서 움직임. 새 캐릭터/세계관 추가 0 — persona 절대 금지 준수.
- **claim 풀 사이즈 stable (12 줄 유지)**: cycle 142 의 12 줄 결정 + cycle 147 의 closure-anticipation 6:4 swap 으로 *풀 크기 증가 없이 톤 다양성 확보*. 풀 inflation 회피 — 좋은 누적 패턴.
