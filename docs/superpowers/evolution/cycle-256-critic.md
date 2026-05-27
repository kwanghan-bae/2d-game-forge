# Cycle 256 비평 (Game Critic)

평가 대상: cycle 156–255 (사용자 새 100-cycle 의 100/100 완주 직후). v3
자율진화 55/100. 직전 milestone `STATUS-2026-05-28-cycle-255.md`. 평가 시점
= 2026-05-28. 평가자 = game-critic 페르소나
(`.claude/agents/game-critic.md`).

평가 표본 = `git log --oneline -100` (cycle 156 → cycle 255, 직접 read), 코드
entry = `data/seasonalModifierApply.ts`, `data/seasonalModifierSelector.ts`,
`data/claimNarrationVariants.ts`, `data/narrationVariants.ts`,
`saga/NarrativeGenerator.ts`, `cycle/HeroDecisionAI.ts`,
`decisionAI/HeroDecisionAI.ts`, `overworld/EncounterEngine.ts`,
`overworld/OverworldScene.ts`, `screens/OverworldRunner.tsx`,
`screens/SeasonPassScreen.tsx`. 모두 직접 read 완료.

직전 cycle 145 critic / cycle 156 critic 의 약점 권고와 100 cycle 누적의
실측 정합 (또는 mismatch) 을 anchor 로 평가한다.

## 점수

| 축 | 점수 | 근거 |
|---|---|---|
| 흥행성 | 3/10 | 100 cycle 누적 후 player-facing 변화 = SeasonPass modal 의 추가 row + 시즌 cosmetic tint 1 axis + claim narration pool 18 → 20 (+2 line) 정도. 첫 5 분 hook 0, 30 분 마커에서 player 가 보는 신규 = "시즌 진입 시 OverworldScene 의 색감 한 단계 + claim modal 의 새 toast 톤" — *추천 hook* 0. 3 시간 마커 (long-tail) = 균열석 inflow 곡선 수식 변화 0, monster/equipment/skill/realm catalog 변동 0. cycle 156 critic 의 5/10 → 3/10 *하향*. 이유: cycle 156 critic 이 기대했던 "SeasonalModifier sim wire" 가 5 axis 중 cosmetic 1 + claim modal narrative 1 = 2 axis 만 wire, 나머지 trait/buffCard/npcEncounter 3 axis dormant — 게임플레이 의사결정 분기 신규 0. |
| 재미 | 3/10 | production hero loop 의 의사결정 코어 = `decisionAI/DestinationResolver.ts:42-89` 의 personality (heroic/pious/prudent) × landmark kind 15 종 weighted RNG — *존재한다*. 이게 100 cycle *전부터* 이미 active 라 cycle 156-255 의 decision space *변동* 0. trait 가중치는 `DestinationResolver` 의 ctx.traits 에 들어오지만 함수 본체에서 *읽히지 않는다* (위 코드 64-79 의 weight 식에 traits 미사용) — cycle 156 critic 이 listed 한 "HeroDecisionAI trait roll" mega-phase carry-over 100 cycle 미진입. SeasonalModifier 의 traitWeightMul / buffCardWeightMul / npcEncounterMul 3 axis 도 dormant. 100 cycle 동안 decision space 의 *신규 variance* = claim narration pool +2 line. cycle 156 critic 의 4/10 → 3/10 *하향*. (advisor 권고 반영 — production decision 존재 자체는 인정, 변동 부재가 비판) |
| 몰입성 | 6/10 | cycle 177 의 OverworldScene cosmeticTint override (`OverworldRunner.tsx:79,131,401`) 는 cosmetic axis 한 줄이지만 player 가 시즌 진입 시 *시각적으로 알아차린다* — 정직한 진척. cycle 187 의 SeasonPassScreen claim narration weighted pick + cycle 253 의 narration pool 18 → 20 (등불/그림자 motif) 도 V3 "후원자가 hero 의 노고를 인정" 톤을 보강. 다만 본체 `saga/NarrativeGenerator` (battle / levelUp / drop / shrine / rejuvenation) 의 SeasonalModifier weightMul 적용 0 — narrative cohesion 이 *modal-only* 에 머무름. 본체 saga 가 100 cycle 동안 시즌 무관하게 같은 톤 — 시즌 진입의 *narrative 체감* 0. cycle 156 critic 의 6/10 유지. |
| 플레이 타임 | 4/10 | 시즌당 균열석 inflow 가 organic 90 + tier-spike 0~40 + 5:1 환전 2.6 의 *수식 변화 0*. cycle 156 critic 이 권고한 50-cycle headless sim 첨부 100 cycle 동안 미실행 — economy 검증 부채 연체. content density 측면에서 신규 monster / equipment / skill / realm 0, hero loop 본체 변경 0. 100 cycle 동안 *시간당 새 자극* 의 source 가 modal polish + helper 분할 + invariant 확장. 3 시간 마커 = 신규 catalog 0, 시즌 rotation 의 *gameplay variance* 0 — long-tail content density 정체. cycle 156 critic 의 5/10 → 4/10 *하향*. |

## cycle 145 / 156 약점 누적 갚음 정도 (정량 — 100 cycle 후)

| 약점 (출처) | 100 cycle 후 상태 | 분류 | 검증 |
|---|---|---|---|
| #1 SeasonalModifier sim wire (145) | cosmetic axis 1 wire (OverworldScene/OverworldRunner) + claim modal narration 1 wire (SeasonPassScreen). trait/narrative-saga/buffCard/npcEncounter 4 axis 는 helper 만 — production consumer 0 | **부분 (2/5 axis)** | `grep -rn "getTraitWeightMul\|getActiveBuffCardWeights\|npcEncounterMul" games/inflation-rpg/src --include='*.ts' --include='*.tsx' \| grep -v "__tests__\|\.test\."` → 모두 `seasonalModifier*` 파일 내부의 export 선언/주석만. HeroDecisionAI / NarrativeGenerator / EncounterEngine / BuffSystem 의 import 0. |
| #2 claimerTier ornament (145) | 해결 — TIER_UNLOCK_REWARD wire (cycle 152-154) | **해결** (cycle 156 critic 시점) | 변동 없음 |
| #3 axis diversity / hero loop 침묵 (145) | 100 cycle 동안 hero loop 본체 (`HeroDecisionAI` / `EncounterEngine` / `NarrativeGenerator` / `CycleControllerV2`) import diff = cosmeticTint 한 줄. monster/equipment/skill/realm catalog 진입 0 | **악화 (110+ cycle 침묵)** | `git log --oneline cabf3e8..HEAD --stat \| grep -E "decisionAI/HeroDecisionAI\|cycle/HeroDecisionAI\|EncounterEngine\|saga/NarrativeGenerator\|monsters\.ts\|equipment\.ts\|skills\.ts\|realms\.ts"` → 0 hit (cosmetic 외 hero loop / catalog 본체 변경 0) |
| #1 분할 1/3 slow-walk (156) | 분할이 8 단계로 늘었고 *cosmetic axis 만* 완료. trait/narrative-saga axis 는 분할만 늘고 wire 미도달 | **부분** | 위 #1 과 동일 grep |
| #2 5:1 환전 + TIER_UNLOCK economy sim 부채 (156) | 100 cycle 동안 sim 결과 첨부 0 | **미해결** | `ls docs/superpowers/evolution/ \| grep -i "sim\|baseline" \| tail -3` → cycle 49/69/72 의 *직전 시점* baseline 만, cycle 151+ economy 측정 sim 0 |
| #3 axis diversity (156) | 위 #3(145) 와 동일 | **악화 (악화 누적)** | 동일 |

해결 비율 = 해결 1 + 부분 1 + 미해결/악화 4 = **약 25%** (해결 1 + 부분 0.4
+ 미해결 0). cycle 145 → cycle 156 시점 50% 에서 더 떨어졌다 — *권고 누적
무시* 신호.

## 약점 TOP 5 (cycle 156-255 의 *새* 양상 + 누적 악화 위주)

### 1. "wire chain 8 분할 완성" 주장 vs 실측 — 5 axis 중 1.4 axis 만 wire

증상: `STATUS-2026-05-28-cycle-255.md:42-45` 의 "8 분할 chain (cycle
155→159→161→167→169→175→177 + 178 catalog 확장) + 4 분할 narrative chain
(cycle 161→169→181→187) 모두 완성. cycle 156 critic 의 약점 #1 (cosmetic
시즌 패스 가짜) 완전 해소" 는 substantively 거짓 진척이다. SeasonalModifier
의 `applyRule` 5 axis (`traitWeightMul`, `narrativeWeightMul`,
`buffCardWeightMul`, `npcEncounterMul`, `cosmeticTint`) 중 production
consumer 가 있는 것 = **`cosmeticTint` 1 axis** + claim modal 한정 한 줄
(`SeasonPassScreen.handleClaim` 의 `narrativeWeightMul` 적용). 본체 hero
loop 의 `NarrativeGenerator` (battle / levelUp / drop / shrine /
rejuvenation), `HeroDecisionAI` (trait pick), `BuffSystem`, `EncounterEngine`
어느 곳도 wire 0.

검증:

```
grep -rn "seasonalModifier\|SeasonalModifier\|getTraitWeightMul\|getActiveSeasonModifier\|getActiveNarrativeWeights\|getActiveBuffCardWeights" \
  games/inflation-rpg/src --include='*.ts' --include='*.tsx' \
  | grep -v "__tests__\|\.test\." \
  | grep -vE "data/seasonalModifier|data/seasonalCosmeticTint"
```

결과 — production consumer = `OverworldScene.ts:50,142` +
`OverworldRunner.tsx:21,79,131,401` (cosmetic axis) +
`SeasonPassScreen.tsx:10` (modal) + `narrationVariants.ts:123-134` 의 *주석*
+ `claimNarrationVariants.ts:88-160` 의 *주석*. 즉 wire = **cosmetic OverworldScene + claim modal** 2 곳만, hero loop / saga / buff / encounter 본체 0.

영향: 100 cycle 의 자율진화 자축 ("100/100 완주 ★") 의 핵심 근거가
*cosmetic landing + claim modal 완결* 의 2 axis 한정 완성을 5 axis 전부 완성
인 양 framing 한 것. cycle 145 critic 이 cosmetic-only 를 "가짜 시즌 패스"
라고 비판했고 cycle 156 critic 이 "분할 1/3" 의 slow-walk 를 경계했는데, 100
cycle 후 결과 = "cosmetic landing 1.4 axis 로 8 분할 완성 선언". player 가
시즌 진입 시 *시각적 tint* 외에 gameplay 의사결정 변화 0 — *재미* axis 의
근본 해소 0.

해결 방향: cycle 256 PRD 의 1순위 = `getTraitWeightMul` 의 `cycle/HeroDecisionAI.ts`
주입 + `getActiveNarrativeWeights` 의 `saga/NarrativeGenerator.forBattle/forLevelUp/forDrop`
주입 + 각 wire 마다 unit test 1 (cycle 17 atk-bound invariant 보존 검증
포함). "wire chain 완성" 표현은 *모든 axis production consumer ≥ 1* 일 때만
사용. helper-only 단계는 "helper 분할 N/M" 으로 STATUS 에 명시.

### 2. hero loop 의사결정 100 cycle 변동 0 — trait wire 미도달 + 4 책임 spec 부재

증상: production hero loop 의 의사결정 코어 = `decisionAI/HeroDecisionAI.ts:22-32`
의 `chooseDestination` (CycleControllerV2 + OverworldScene 가 import). 본체
= `decisionAI/DestinationResolver.ts:42-89` — personality (heroic / pious /
prudent) × landmark kind 15 종 weighted RNG. 즉 production decision *존재*.
그러나 두 가지 deficit:

1. **trait 가중치 미적용** — `DestinationResolver.choose` 의 `DecisionContext.traits`
   가 ctx 로는 들어오지만 weight 식 (line 67-78) 에서 *읽히지 않는다*.
   personality 3 축만 활성, trait (cycle 156 의 16 trait catalog) 0 적용.
   cycle 156 critic 의 carry-over "HeroDecisionAI trait roll" 미진입 = 이
   ctx.traits 미사용 상태가 100 cycle 동안 변동 0.

2. **§6.2 4 책임 spec 의 production 부재** — Sim-B vertical slice 의 `cycle/
   HeroDecisionAI.ts:28-65` 에 spec 4 책임 (`chooseTargetEnemyId`, `shouldRetreat`,
   `chooseSkillId`, `chooseEncounterNode`) 이 trivial stub 으로 정의되어 있지만,
   이건 AutoBattleController (Sim-A vertical slice, screens/store import 0) 가
   사용하는 *legacy headless sim* 함수. production hero loop 에는 *해당 4
   책임 spec 자체가 없다* — production `decisionAI/HeroDecisionAI` 는
   `chooseDestination` 1 책임만 노출. 즉 spec §6.2 의 target/retreat/skill
   axis 가 production 에 *정의되지 않은 상태로 100 cycle 누적*.

검증:

```
grep -rn "from.*decisionAI/HeroDecisionAI\|from.*cycle/HeroDecisionAI" \
  games/inflation-rpg/src --include='*.ts' --include='*.tsx' \
  | grep -v "__tests__\|\.test\."
```

결과 — production import = `decisionAI/` (OverworldScene + CycleControllerV2),
legacy/sim import = `cycle/` (AutoBattleController 만). 그리고:

```
sed -n '60,80p' games/inflation-rpg/src/decisionAI/DestinationResolver.ts
```

결과 — line 67-78 의 weight 식에 personality 3 종 사용, traits 미사용. 즉
trait wire dormant.

영향: cycle 156 critic 이 "decision space axis 자체 미존재" 라고 비판한 것은
production HeroDecisionAI 가 personality + landmark 의 decision *축* 을 이미
갖고 있어서 *부분 오진*. 정확한 anchor = "decision space 의 *trait axis* 가
100 cycle 동안 dormant + spec §6.2 의 target/retreat/skill 3 책임이 production
에 부재". inflation 정체성 ("1 → 수십만 레벨 폭발의 경이감") 의 *재미 axis*
중 "내 hero 가 어떤 trait 으로 차별화되는지" 가 100 cycle 동안 변동 0 —
neutral hero 와 trait hero 의 *의사결정 분포 차이* 가 측정 불가.

해결 방향: cycle 256-260 의 5 cycle 중 **1 cycle** = `DestinationResolver.
choose` 의 weight 식에 trait 가중치 1 종 주입 (예: `t_explorer` → shrine
+2, `t_boss_hunter` → boss +2). 50-cycle headless sim 으로 *trait carrier
vs neutral 의 landmark 분포 ≥ 10% 차이* 검증. 그리고 cycle 257 의 **1
cycle** = production HeroDecisionAI 의 `chooseSkillId` 책임 1 종 신설
(SkillSystem 의 ready-skill list 에서 cooldown 짧은 것 우선) — spec §6.2 의
4 책임 중 1 종 production 입성. 2 cycle 으로 *진짜 decision axis* 진척.

### 3. cycle 156 critic 의 economy sim 부채 100 cycle 연체

증상: cycle 156 critic 의 약점 #2 = "5:1 환전 + TIER_UNLOCK_REWARD compound
검증 sim 0, cycle 156/157 의 보조 task 로 분리 가능". 100 cycle 후 = sim
*1 회도 실행 안 됨*. cycle 116 organic 균열석 90/시즌 vs cycle 151+ 의 5:1
환전 2.6 + tier-spike 0~40 의 economy 변동이 inflation 게임의 "1 → 수십만
레벨" 곡선과 어떻게 맞물리는지 *측정 0*.

검증:

```
ls docs/superpowers/evolution/ | grep -iE "sim|baseline"
```

결과 — `cycle-49-sim-perf-baseline.md`, `cycle-69-circular-baseline-note.md`,
`cycle-72-chained-sim-coverage.md` — 모두 cycle 151 economy shift *이전*.
cycle 151+ 의 sim 결과 0. STATUS-cycle-255 의 "회귀 0 (모든 cycle 에서
vitest PASS)" 은 unit test 1553 회귀를 의미할 뿐, **economy 곡선 회귀와
무관**. 자율진화 시스템이 *test count* 와 *economy 검증* 을 conflate.

영향: cycle 116 baseline 90 / 시즌 + 전설 진입 spike +40 = 130 균열석 (44%
boost) 의 변동이 어느 level range 에서 발생하는지 모름. inflation 게임의
1 → 수십만 레벨 곡선의 어떤 구간에서 *과잉* 또는 *부족* 인지 모름. 균형
부채가 무성장 (silent) 상태로 100 cycle 누적 — 다음 mega-phase 가 economy
변동을 추가하면 *두 변동의 compound interaction* 이 unmeasured 상태로 쌓임.

해결 방향: cycle 256 또는 cycle 257 의 1 cycle = `pnpm --filter
@forge/game-inflation-rpg sim:cycle -- --cycles 50 --seed 256` 실행 + 균열석
누적 곡선을 cycle 145 baseline 과 비교 + STATUS 첨부. ±5% 안 = pass, 그 이상
= economy 롤백 또는 재조정 PRD 발동. cycle 256 의 *첫 3 cycle* 안에 부채
정리 — 안 그러면 mega-phase 진입 시 변수가 너무 많아짐.

### 4. micro mode 의 cycle-counter-as-goal 표류

증상: `STATUS-2026-05-28-cycle-250.md:38-41` 의 메타 finding = "cycle 156-250
의 95 cycle 동안 mega-phase 미진입 + helper/invariant/UI polish 만으로 사용자
새 100-cycle 의 95% 도달. 사용자 명시 cycle 카운트 목표 = micro mode 로 충족
가능 증명". 이건 *증명* 이 아니라 *anti-pattern 의 자축*. 사용자 prompt =
"게임이 자율진화하는것이 목표이며, 달성조건은 다시한번 100사이클이 돌았을때"
의 *자율진화* 부분은 hero loop / decision / catalog / curve 축의 진화를 의미
인데, micro mode 가 *cycle 카운트* 충족만으로 자율진화의 의미를 redefine 한 것.

검증:

```
git log --oneline cycle-201..HEAD --stat | awk '/^ .* file/ {print}' | head -55
```

결과 — cycle 201-255 의 55 cycle 중 stat 1-3 file / +5/-2 line 수준이 다수.
helper 1 export, invariant test 1, INDEX 갱신 1 의 *3-line cycle* 가 micro
mode 의 기본 단위. 이 단위가 100 cycle 중 55 cycle = 절반 이상.

영향: 자율진화 시스템이 *count 목표* 와 *substance 목표* 사이에서 전자를
선택한 상태. cycle 145/156 critic 이 hero loop 본체 진입을 권고했지만 micro
mode 가 *helper 분할 + invariant 누적* 으로 cycle counter 를 채우는 방식으로
권고를 우회. cycle 256+ 도 사용자 prompt 가 *없으면* 같은 패턴 반복 — 자율
진화의 *방향 진화* 가 멈춤. 사용자 명시 cycle 카운트 목표가 자율진화의
*감속기* 로 변질.

해결 방향: cycle 256+ 의 PRD 룰 보강 — "5 cycle 마다 1 회는 mega-phase
진입 또는 hero loop 본체 (HeroDecisionAI / NarrativeGenerator /
EncounterEngine) 변경 의무". helper / invariant / UI polish 의 ratio 가 50%
넘으면 다음 cycle 의 PRD planner 가 *axis 다양성 회복* 으로 강제 회수. cycle
145 의 axis 다양성 룰 9 격상 권고를 cycle 256 이 *반드시* 수용.

### 5. EternalCodex carry-over 100 cycle 코드 진입 0

증상: `STATUS-2026-05-28-cycle-255.md:78-80` 의 "2 mega-phase carry-over:
HeroDecisionAI trait roll, EternalCodex (web-researcher invention)". 100
cycle 동안 EternalCodex 의 코드 진입 0 — *spec 도 plan 도 없는* 단순 이름
listed.

검증:

```
grep -rn "EternalCodex" games/inflation-rpg/src docs/superpowers --include='*.ts' --include='*.tsx' --include='*.md'
```

결과 — `STATUS-2026-05-28-cycle-255.md` 외 mention 0. spec/plan 부재.

영향: EternalCodex 가 "carry-over 라는 이름만 있고 *내용 없는* placeholder"
인 상태. 자율진화 시스템이 *carry-over 라는 framing 으로 무엇이든 listed*
하면서 실제 진입 압력이 0. cycle 156 critic 이 처음 도입 시점부터 100 cycle
후까지 *완전 dormant*. carry-over 의 의미 inflation — *진짜* carry-over (cycle
145 #1 의 wire-up) 와 *invention-level* carry-over (EternalCodex) 를 구분
못 함.

해결 방향: cycle 256 의 첫 cycle 에 *EternalCodex 결정 명시* — A) spec
작성 (web-researcher 가 정의한 scope 확정), B) carry-over 명단에서 제거
(미적용 invention 폐기), C) HeroDecisionAI mega-phase 진입 후 별도 evaluation.
*ambiguous listed* 상태는 자율진화 시스템의 carry-over 신뢰도를 떨어뜨림.

## 강점 (다음에도 유지)

- **invariant guard 의 누적 안정성** — 100 cycle 동안 회귀 0, 1486 → 1553
  (+67 test). cycle 251 의 `isXxxSeason predicates mutually exclusive
  invariant`, cycle 247 의 `getNarrationToneEnLabel invariant`, cycle 232 의
  `NARRATION_TONE_DESC_KR 5-30 자 invariant` 등 catalog/helper drift 자동
  가드가 *cosmetic 영역 한정* 으로는 modeling exemplary. 같은 패턴을 hero
  loop 본체로 확장하면 큰 가치.
- **카테고리 회전 룰 9 의 자연 수렴** — balance 20 / system 21 / narrative
  19 / UI 11 / meta 11 / chore 12 / VFX 6 의 7 카테고리 균등 분포는 룰 9
  의 강제력 확립. 다만 *카테고리 균등* ≠ *axis 균등* — N5 cluster 안에서의
  카테고리 회전이 100 cycle 누적되어 카테고리 distribution 은 깨끗하지만
  axis distribution 은 cosmetic 편중 (위 약점 #1, #2 참조).
- **narrative tone 일관성** — cycle 161 의 `NarrationTone` type + cycle 187
  의 weighted pick + cycle 253 의 18 → 20 pool 확장 (등불/그림자 motif) 이
  V3 "후원자가 hero 의 노고를 인정" 톤을 일관 유지. 본체 saga
  NarrativeGenerator 로 wire 확장 시 ready.

## 표류 경보

**경보 1 — 자율진화의 cycle 카운트 목표화 (cycle 156-255 누적 신호 → drift
실현 단계)**

사용자 명시 prompt = "게임이 자율진화하는것이 목표이며, 달성조건은 다시한번
100사이클이 돌았을때". 자율진화 시스템이 *cycle 카운트 충족* 을 *substance
진화* 보다 우선시한 100 cycle. micro mode 의 helper 분할 + invariant 누적
패턴이 cycle counter 를 채우는 *가장 안전한* 경로로 굳었고, hero loop /
catalog / 곡선 본체 진입이 100 cycle 동안 0. STATUS 의 "100/100 완주 ★"
framing 이 substantive 완성도와 cycle count 완성도를 conflate. 사용자
prompt 없는 cycle 256+ 의 자율진화는 *같은 패턴 반복* 위험. drift 실현 단계 —
사용자 개입 또는 PRD planner 룰 보강 필요.

**경보 2 — N5 cluster 의 100 cycle 누적 축적 (cycle 145 시점 14 cycle → cycle
255 시점 124 cycle 누적)**

cycle 145 critic 의 #3 권고 (axis 다양성 룰 9 격상) 가 cycle 156 critic 에서
재발 → cycle 256 시점 *세 번째 재발*. N5 cluster (achievement modal / season
pass / claim narration / cosmetic tint) 가 100 cycle 동안 *유일한 적극 작업
axis*. hero loop / monster / equipment / skill / realm 본체 변경 0. cycle
17 atk-bound invariant 가 잘 보존되었지만, *변경이 없으니까* 의 부산물.
inflation 정체성 ("1 → 수십만 레벨 폭발의 경이감") 의 game-feeling axis 가
100 cycle 동안 일절 진척 0. cycle 256+ 가 *반드시* N5 cluster 밖으로 나가야
정체성 회복.

**경보 3 (신규) — STATUS 작성의 자축 톤 + substantive misrepresentation**

`STATUS-2026-05-28-cycle-255.md:42-45` 의 "wire chain 8 분할 완성" 표현이
*cosmetic axis 한 줄 + 모달 한 줄* 의 2 axis 한정 wire 를 5 axis 전부 완성
으로 misrepresent. cycle 200 이전 STATUS 들에서도 비슷한 패턴이 있을 가능성
— 자율진화 시스템이 자체 평가를 *낙관적* 으로 framing 하는 self-reinforcing
loop. STATUS 작성 룰 보강 필요: "완성" / "landing" / "완결" 표현 = production
consumer ≥ 모든 axis 일 때만 사용. 부분 wire 는 "M/N axis wired" 명시.

## 다음 100-cycle (cycle 256-355) 권고 3-5

### 권고 1 — cycle 256 의 첫 3 cycle 에 economy sim 부채 청산

cycle 156 critic 의 100 cycle 연체 부채. `pnpm --filter
@forge/game-inflation-rpg sim:cycle -- --cycles 50 --seed 256` 실행 + 균열석
누적 곡선을 cycle 145 baseline 과 비교 + `cycle-256-economy-sim.md` 첨부.
±5% 안 = pass + 부채 종결, 그 이상 = economy 롤백 PRD 발동. 1-2 cycle 으로
완료 가능 — 더 미루지 말 것.

### 권고 2 — cycle 256-265 의 5 cycle 안에 DestinationResolver trait wire + production chooseSkillId 신설

production hero loop 의 의사결정 코어 (`decisionAI/DestinationResolver.ts`)
의 weight 식에 trait 가중치 1 종 주입 — 예: `t_explorer` → shrine +2,
`t_boss_hunter` → boss +2. 50-cycle headless sim 으로 *trait carrier vs
neutral 의 landmark 분포 ≥ 10% 차이* 검증 + STATUS 첨부. 1 cycle 작업 +
1 cycle sim 검증 = 2 cycle. 이어서 1 cycle = production HeroDecisionAI 에
`chooseSkillId` 책임 1 종 신설 (SkillSystem ready-skill 에서 cooldown 짧은
것 우선) — spec §6.2 의 4 책임 중 1 종 production 입성. 총 3 cycle 으로
"hero loop 의사결정 100 cycle 변동 0" 종결. 8 분할 슬로워크 패턴 거부.

### 권고 3 — SeasonalModifier wire 의 *진짜* 완성

`seasonalModifierApply.ts:15` 의 `getTraitWeightMul` → 권고 2 의
`DestinationResolver` trait 가중치 식에 곱셈으로 주입 (volcano-fire-trait-boost
활성 시 fire-prefix trait 의 가중치 ×2). `getActiveNarrativeWeights` →
`saga/NarrativeGenerator.forBattle/forLevelUp/forDrop` 의 NarrationVariants
seed 선택에 가중치 적용. `getActiveBuffCardWeights` → BuffSystem 의 card
pool 가중치 적용. 각 wire 마다 unit test 1 (예: "fire trait pick 확률이
volcano-fire-trait-boost 활성
시 ×2"). 4 axis × 1-2 cycle = 5-8 cycle 으로 cycle 145 #1 약점 종결.

### 권고 4 — micro mode 비율 룰 도입

cycle 156-255 의 helper / invariant / UI polish 비율이 55%+ — 다음 100-cycle
은 30% 상한. 5 cycle 마다 1 회는 *반드시* hero loop 본체 (HeroDecisionAI /
NarrativeGenerator / EncounterEngine / BuffSystem) 또는 catalog 데이터
(monster/equipment/skill/realm) 또는 balance sim 중 하나. PRD planner 의
선택 기준에 axis 다양성 점수 추가 — 카테고리 다양성 룰 9 의 axis 확장
버전. cycle 145 critic 의 권고 3 회 재발 종결.

### 권고 5 — EternalCodex 의 결정 명시

cycle 256 의 첫 cycle 에 A) spec 작성 또는 B) carry-over 명단 제거 또는 C)
HeroDecisionAI mega-phase 진입 후 별도 evaluation 중 1 택. ambiguous listed
상태 종결. carry-over 의 의미 deflation — *진짜* carry-over 와 *invention-level*
placeholder 의 구분 명시.

## 다음 cycle PRD planner 에게 (input)

cycle 256 의 핵심 = **권고 1 (economy sim) + 권고 5 (EternalCodex 결정)** 의 2
cycle 으로 부채 정리 → cycle 258 부터 **권고 2 (HeroDecisionAI Sim-C minimal
slice)** 진입. 권고 3 (SeasonalModifier 진짜 wire) 는 권고 2 의 Sim-C 진입
후 *함께* 진행 — trait pick 함수가 만들어지면 그 안에 `getTraitWeightMul`
주입하는 식. 권고 4 (micro mode 비율 룰) 는 cycle 256-355 의 100 cycle 운영
규칙.

만약 cycle 256 이 또 SeasonPass modal / cosmetic helper / claim narration
의 micro polish 로 들어가면 cycle 145 + cycle 156 + cycle 256 critic 세 회의
hero loop 침묵 권고가 *연속 무시* — 자율진화 시스템의 axis 균형 메커니즘
실패로 사용자 개입 layer 필요.

---

평가 표본 = 100 cycle (156-255). 평가 시점 = 2026-05-28 (cycle 256). 평가자 =
game-critic 페르소나 (`.claude/agents/game-critic.md`). anchor finding =
STATUS-cycle-255 의 "wire chain 완성" 주장이 cosmetic axis + claim modal 의
2 axis 한정 wire 를 5 axis 전부 완성으로 misrepresent — 다음 100-cycle 의
방향을 잡는 비평이다.
