# Cycle 145 비평 (Story Writer) — Claim Narration + Active Season Chip + ClaimerTier

cycle 131-144 에서 narrative surface 는 세 갈래로 확장됐다. (1) cycle 134 의 `claimNarrationVariants.ts` 7 → cycle 142 의 12 variant, (2) cycle 136 의 active season chip (SeasonPassScreen header), (3) cycle 143 의 ClaimerTier 5 단계 (신참→전설). 본 비평은 이 셋만의 narrative-axis 평가다. saga 의 NarrationVariants (battle/levelUp/...) 는 cycle 101 critic 에서 별도 다뤘으니 손대지 않는다.

## narrative health

| 축 | 점수 | 근거 |
|---|---|---|
| variance (variant 풀 두께) | 6/10 | 7 → 12 확장은 정량적으로는 +70%. 그러나 신규 5 줄 (`먼지 한 줌이 다시 별이 되었다` 등) 이 기존 7 줄과 어휘적으로 **별/책장/이름/노래** 4 frame 안에서 회전. 12 줄 풀이 사실상 4 motif × 3 variant 라 12 분 노출 시 motif 인지 회전이 빠르다 |
| 톤 일관성 (신/후원자 어조) | 8/10 | 12 줄 모두 신/하늘/시간/책장 같은 *후원자-신적 어조* 유지. cycle 134 PRD 의 "신의 침묵 속에" 톤 핀 잘 지킴. 단 ClaimerTier 5 줄 (신참/노련/숙련/마스터/전설) 은 어휘 톤이 **장인-검술 RPG 트로프** — 신적 어조와 한 화면에 같이 놓이면 micro-clash |
| 감정 곡선 (claim 순간 보상감) | 5/10 | 12 줄 전부 *완료/인장/기록* 의 closure 톤. **새 saga 가 시작되는** energetic 톤 (예: "다음 장이 부른다") 이 0. claim = saga 의 페이지 turn 인데 closure 만 있고 anticipation 없음 |
| 세계관 정합 (V3 eternal hero + 6 realm) | 6/10 | 신/하늘/별 어휘는 V3 후원자 컨셉과 정합. 단 **realm-aware 가 0** — chaos 차원에서 claim 해도 base 차원에서 claim 해도 같은 풀. seasonalModifierCatalog 의 `chaos-narrative-elegy` (애가 ×1.5) 가 정의됐는데 claim narration 은 wire-up 0. season catalog 와 claim narration 의 surface 가 분리된 상태 |

## 약점 TOP 3

1. **motif 4 frame 안에서 회전 (claimNarrationVariants.ts 전체)** — 12 줄을 분류하면 `별/별빛` 3 (`경배하라, 새 별이 떴다` / `먼지 한 줌이 다시 별이 되었다` / `돌 위에 새겨진 이름이 빛난다`), `책장/페이지` 2 (`한 페이지가 더 채워졌다` / `운명의 책장이 또 한 장 넘어간다`), `이름` 2 (`잠든 영웅의 이름을 신이 부른다` / `돌 위에 새겨진 이름이 빛난다`), `시간/강물` 1, `여명/하늘` 2, `운명의 저울` 1, `신 침묵/미소` 1. 사실상 **4 motif × 평균 3 줄**. 18 줄로 늘려도 같은 motif 안이면 단조. 해결: **`소리/시선/체온/제스처` 4 motif 신규 도입** (예: 신이 손을 내미는 비트, 영웅의 발자국 소리를 신이 듣는 비트).

2. **claim 후 anticipation 부재 (claimNarrationVariants.ts:5-19 전체)** — 12 줄 모두 "한 장이 *채워졌다* / 인장됐다 / 기억된다" 의 **과거형/closure** 톤. claim 은 후원자가 hero 의 다음 saga 를 *밀어주는* 인터랙션인데 narration 은 매번 페이지를 *닫는* 톤. 12 분 idle 시청 시 매 claim 이 "끝났다" 만 6-7 회 반복되면 *진행 중* 감각 사라짐. 해결: 12 줄 중 3-4 줄을 **anticipation 톤으로 swap** ("다음 장이 그대를 기다린다", "신은 다음 노래를 준비한다").

3. **claimer tier 와 season chip 의 narrative wire-up 0 (claimerTier.ts + seasonalModifierSelector consumer 미존재)** — cycle 143 에 5 tier (신참→전설) 가 정의됐고 cycle 136 에 active season chip 이 header 에 떴지만, **`pickClaimNarration(seed)` 가 tier/season 어느 input 도 받지 않는다**. 결과: 전설 등급의 player 와 신참이 같은 12 줄 풀을 본다. 6 SeasonalModifier 가 catalog 에 있어도 narration 영향 0. 페르소나-기반 personalization 의 진짜 hook 이 비어있는 상태. 해결: `pickClaimNarration(seed, { tier?, activeSeason? })` 시그니처로 확장하고, tier 별로 신/후원자 호칭이 변하게 (신참 → "용사여", 전설 → "오랜 동반자여", "그대의 무게가 별보다 깊다").

## 차기 narrative 제안

### 1. **claim narration 의 anticipation 절반 (변환만, 풀 확장 아님)**

12 줄 중 closure-only 톤 7-8 줄을 유지하고 **3-4 줄을 anticipation 톤으로 swap**. 풀 사이즈는 그대로 12 유지 (cycle 142 결정 존중).

예시 변형 (실제 텍스트):

```ts
// 기존 closure (유지)
'한 페이지가 더 채워졌다',
'시간의 강물이 그대를 기억한다',
'돌 위에 새겨진 이름이 빛난다',

// 신규 anticipation (3-4 줄 swap)
'다음 장이 그대를 기다린다',          // page-turn 의 *앞면*
'신은 다음 노래를 준비한다',          // 신이 능동적
'그대의 발걸음이 새 길을 부른다',     // hero 의 다음 saga 환기
'별이 다음 자리로 옮겨 앉는다',       // 별 motif 재사용하되 미래 시제
```

근거: closure 7-8 줄과 anticipation 3-4 줄이 6:4 비율이면 12 분 시청에서 매 claim 마다 *닫힘/열림* 비트가 번갈아 — 진행 중 감각 복원.

### 2. **ClaimerTier 별 후원자 호칭 (claimerTier.ts 확장)**

`pickClaimNarration(seed, { tier })` 으로 시그니처 확장. tier 마다 narration 의 호칭 부분만 변형.

예시 변형 (실제 텍스트):

```ts
// 신참 (count < 10) — 격려/소개 톤
'용사여, 그대의 첫 발걸음을 치하한다',
'젊은 그대, 새 페이지를 시작했다',

// 노련 (10-49) — 인정 톤
'노련한 그대여, 한 페이지가 더 채워졌다',
'경험의 무게가 그대를 따른다',

// 숙련 (50-199) — 동반자 톤
'손에 익은 그대여, 다음 장이 부른다',

// 마스터 (200-999) — 경의 톤
'마스터여, 그대의 이름이 신의 책장에 새겨졌다',

// 전설 (1000+) — 친밀/유대 톤
'오랜 동반자여, 그대의 발걸음을 신은 안다',
'전설이여, 그대의 무게가 별보다 깊다',
```

근거: cycle 143 의 tier 5 단계가 UI chip 으로만 surface 되고 narration 에 0 영향. tier 가 늘수록 *친밀도* 가 올라가는 호칭 곡선이 saga 의 eternal hero × 후원자 *관계 진화* 비트와 정합. 풀 크기는 5 tier × 2-3 호칭 ≈ 12-15 줄 — 기존 12 와 같은 규모.

### 3. **active SeasonalModifier 별 신 어조 후크 (1-2 줄, sub-pool)**

`pickClaimNarration(seed, { activeSeason })` 추가. 6 catalog 중 *narrative_weight* 타입인 `chaos-narrative-elegy` 가 active 일 때만 추가 풀에서 1 줄 추첨 (확률 20%).

예시 변형 (실제 텍스트):

```ts
// chaos-narrative-elegy active 시 sub-pool (확률 20%)
'혼돈의 비가가 그대의 이름을 부른다',          // catalog name 직접 reflect
'한 페이지가 채워졌지만, 잉크는 검다',         // elegy 톤
'그대의 노래는 슬프다 — 그러나 끝나지 않는다',  // 비극 + eternal hero

// volcano-fire-trait-boost active 시 (선택 — type=trait_weight 라 narrative 영향 wire 자체는 보수적으로 1 줄만)
'용암의 시즌이 그대의 검을 데운다',
```

근거: cycle 137 의 catalog 5→6 확장으로 6 season rotation 30-day cycle 가 보장됐는데 narration 0 wire 는 그 6 month 의 시각/시청 다양성을 버리는 셈. `narrative_weight` 타입 modifier 만 narration sub-pool 을 가지면 invariant (atk/hp/MAX_ARRIVALS 무관) 보존. 80% 는 base pool, 20% 만 season-aware → 풀 분리감은 강하지 않되 *season 이 살아있다* 신호.

## 표류 경보

- **eternal hero 컨셉 mild 표류 (closure-only 편향)**: claim narration 12 줄 전부 *완료* 톤이라 hero 의 saga 가 *닫히는* 인상을 누적시킨다. eternal hero 는 매 claim 이 페이지 turn 이고 saga 는 무한이라는 컨셉인데, narration 만 보면 매번 *책 한 권 끝남* 으로 읽힌다. 약점 #2 의 anticipation swap 으로 회수 가능.
- **realm 톤 분리 0 (claim narration realm-blind)**: NarrationVariants (battle/levelUp/...) 는 cycle 101 부터 6 realm 의 어휘 분리를 도입했는데 claim narration 만 realm 무관. chaos 에서 claim 한 player 가 base 에서 claim 한 것과 같은 줄을 본다. season chip 은 보이는데 narration 은 안 변함 — UI/text contract 가 불일치. 약점 #3 + 제안 #3 으로 부분 회수.
- **claimer tier UI-only surface (narration 영향 0)**: cycle 143 의 5 tier 가 chip 으로만 보이고 narration/UX 어디에도 진짜 영향 0. *visible but inert* 상태. 약점 #3 + 제안 #2 으로 회수. 회수 안 하면 cycle 150+ player 가 전설 등급에 도달해도 신참과 정확히 같은 12 줄을 본다 — "tier 가 의미 없다" 라는 메타-피드백 위험.
- **새 트로프 도입 없음 (정합)**: 12 variant 와 5 tier 모두 기존 6 realm + 후원자/신 컨셉 안에서 움직임. 새 캐릭터/세계관/판타지 트로프 도입 0 — persona 의 "절대 금지" 준수.
