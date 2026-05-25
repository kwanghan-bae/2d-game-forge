# Cycle 105 비평 (Game Critic)

> v1 100 cycle 완주 + v2 cycle 101-104 narrative tone 수렴 직후 시점의 정면 평가.
> advisor 지적 "narrative tone 외 새 방향이 필요" 에 대한 비평가 응답.
> dev server 미가동 — 코드 흐름 + sim 산출 + STATUS 만으로 평가.

## 점수

| 축 | 점수 | 근거 |
|---|---|---|
| 흥행성 | **5/10** | 첫 5분 hook 은 idle hero 의 자동 이동 + level-up 폭죽 + 사가 첫 줄로 작동한다. 다만 30분 후 추천 가치는 약하다 — 사용자가 친구에게 보여줄 "한 장면" (signature moment) 이 없다. inflation 의 본질 (1 → 수십만 폭발) 이 maxLevel p50 6.98M 으로 sim 상 정량 검증됐지만, 플레이어가 이 숫자를 *체험* 할 channel = HUD 카운터 + 사가 텍스트 단 2 개. 시각 폭발/효과음/스크린 셰이크 라인업이 비어있다. |
| 재미 | **6/10** | decision space 가 게임 시스템 자체에는 풍부 — 6 realm × 6 age tier × 9 narrative channel = ~1080 permutation, SpendModal 7 buff catalog, 16 trait, 4 NPC 행동. 그러나 *플레이어 의 decision* 은 SpendModal 한 곳에 거의 응축. AutoBattleController 가 행동을 결정하고 HeroDecisionAI 가 trait 로 선택을 자동화하므로 player 의 의미 있는 선택 빈도는 cycle 당 평균 1-3 회 (sponsor gold spend). variance 는 trait + realm rotation + saga age tier 로 충분히 확보됐다. |
| 몰입성 | **6/10** | narrative cohesion 은 cycle 101-104 의 realm tone wiring 으로 +1 점 끌어올렸다 (6 realm × 6 age × 9 channel 의 거대 텍스트 망). feedback loop 즉각성은 그러나 떨어진다 — 전투 결과 → maxLevel 갱신 → saga 한 줄, 의 3-step 이 모두 *passive readout*. action ↔ progress 의 즉각 연결 (예: combo meter, kill streak, screen flash) 이 부재. |
| 플레이 타임 | **5/10** | curve gradient 는 inflation 정체성 덕에 양호 (lv 1 → 6.98M 까지 자연 감속 없음, cycle 17 polynomial degree 0 확정). content density 는 빈약 — 한 번 ~1080 permutation 이라도 *플레이어 가 인지 가능한 새 자극* 단위로 환산하면 60-90 분에 모두 노출. 시즌/이벤트/PvP 등 *외부 변동성 주입 메커니즘이 0 개*. 200 시간 idle 보장 컨셉 대비 콘텐츠 수직 깊이 부족. |

## 약점 TOP 3

### 1. Signature moment 부재 — inflation 의 정체성이 *체험* 으로 환원 안 됨

증상: 1 → 수십만 레벨 폭발이 maxLevel 텍스트 1 개 + saga 한 줄 외에 시각적/청각적 표상 없음.
근거 (확정 grep): `grep -rn "ScreenShake\|particle\|VFX\|폭발연출" games/inflation-rpg/src --include="*.ts" --include="*.tsx"` → 0 hit. SpendModal/CycleResult/OverworldRunner 어디에도 별도 폭발 연출 없음.
영향: 게임 컨셉의 *핵심 sell point* 가 sim 산출 (PRD 의 숫자) 에만 존재. 친구 어깨너머 30초 보기 가 안 됨.
해결 방향: levelUp 이벤트에 milestone (10x, 100x, 1k×, 10k×, 1M×) 시각 폭발 + sound + screen shake 트리거. inflation 정체성 시각화 컴포넌트 (`<InflationMilestoneVFX/>` 등) 추가.

### 2. Player decision frequency 의 SpendModal 단일 채널 의존

증상: cycle 17 발견 대로 atk/hp bonus 가 maxLevel 에 거의 영향이 없음 → SpendModal 의 선택이 *실효 영향이 약함*. 그럼에도 이게 유일한 player decision surface 임.
근거 (확정 grep): `grep -rn "onClick\|onSelect" games/inflation-rpg/src/screens/*.tsx` → MainMenu/SpendModal/StatusModal/SagaBookModal/CyclePrepV2/CycleResultV2/NpcEncounterModal 7 개 screen 만 hit. 그 중 *cycle 진행 중 영향* 을 주는 건 SpendModal 1 개 (NpcEncounterModal 은 NPC 등장 시만, 빈도 cyclesWithNpc 0→2).
영향: idle 게임이지만 player 가 *왜 다시 켜는지* 의 동기가 약함. 200 시간 보장하려면 매 cycle 의 mid-cycle decision 이 필요.
해결 방향: 균열석 + sponsor gold 외 *cycle 중 emergency decision* 추가 (예: 사망 위기 시 fate roll, boss 직전 buff 선택, realm 진입 시 path 분기).

### 3. Long-term retention engine 부재 — 시즌/이벤트/leaderboard 0 개

증상: 100 cycle 자율진화 가 사실상 모든 *system depth* 를 활성화했음에도 long-tail retention 메커니즘은 들어간 적이 없음.
근거 (확정 grep):
- `grep -rn "leaderboard\|ranking\|순위" games/inflation-rpg/src --include="*.ts" --include="*.tsx"` → 0 hit (test 파일 의 "통계" 텍스트는 RNG 통계 의미, 게임 통계 아님).
- `grep -rn "Replay\|recordRun\|리플레이" games/inflation-rpg/src --include="*.ts" --include="*.tsx"` → 0 hit.
- `grep -rn "Event\|이벤트\|seasonPass" games/inflation-rpg/src/season --include="*.ts"` → SeasonState.ts 의 season 은 *age 기반 환경 tint* 만, 라이브 이벤트 아님.
영향: 1 인 플레이어 가 결말까지 본 후 다시 켤 동기 = 캐릭터 별 다른 trait 조합 정도. *외부 비교* (다른 플레이어 의 사가) 가 0.
해결 방향: 본 문서 §"NEW 방향" §3, §5 참조.

## 강점 (다음에도 유지)

- **자율진화 system 자체**: 8 페르소나 + 룰 8 개 + multi-cycle fold 패턴 = 미래 phase 가 자가 진단 가능.
- **Sim-real parity**: cycle 13/16/18 의 sim driver mirror + helpers 추출 → false PASS 재발 차단 인프라.
- **Narrative coverage 6×6×9 = 1080**: cycle 101-104 의 tone wiring 으로 realm × age × channel 모두 채워짐. 더 늘리지 말 것. 1080 은 *content density 가 아니라 narrative texture* 임.
- **persist v23**: stale realm + lifecycle endCause + clearEndCause + run-resume + saga flat alias 모두 검증된 schema. 새 feature 도입 시 v24 로 이어가면 됨.

## 표류 경보

**Yellow.** Cycle 101-104 가 모두 narrative tone 작업이고, advisor 가 직접 "narrative 외" 를 지적했음에도 v2 진행 자체는 같은 카테고리 안에 머무름. 4 cycle 연속 같은 카테고리는 cycle 35-39 (D7 age tone 5 연속) 와 동형 — 그 때는 D7 자체가 cycle 1 spec 의 carry-over 였으므로 정당했지만, v2 는 *새 100 cycle* 인데 직전 v1 의 fold-up 으로 시작하는 인상. **다음 cycle 1-2 안에 narrative 외 카테고리 (UI 혁신 / meta-progression / 외부 운영 / VFX) 로 pivot 권고**.

---

## NEW 방향 제안 (3-5 개, narrative 외)

### N1. Inflation Milestone VFX + Audio 폭발 시스템 — **scope: 1 cycle, impact: HIGH**

레벨 polynomial × 10^n 돌파 시 (lv 100, 1k, 10k, 100k, 1M, 10M, 100M, 1G) 전용 시각 폭발 + screen shake + sound stinger + 사가 highlight pin. inflation 정체성 의 *체험* 환원.
- 산출: `InflationMilestoneVFX.tsx` (8 tier preset), `useMilestoneDetector.ts` (level prev/curr diff), `CycleControllerV2` 의 levelUp emit 에 milestone tier 첨부.
- 위험: HeroEntity ↔ React 의 즉시 갱신 channel 추가 필요. 기존 `cycleEvents.ts` event bus 로 흡수 가능.
- Why HIGH: 약점 TOP 3 §1 의 직접 해소 + cycle 31 의 "maxLevel design intent close" 가 *숫자만* 닫혔던 부분을 *체험* 으로 닫음.

### N2. Mid-cycle Decision Surface — Boss/Death/Realm 진입 분기 — **scope: 3-5 cycle, impact: HIGH**

cycle 진행 중 emergency / opportunity decision 3 종 추가:
- **Boss intro choice** = boss room 진입 직전 50ms freeze + 3 buff 카드 중 1 택 (Hades-like).
- **Fate roll on death** = HP 0 직전 *균열석 1 소비 → 50% HP 회복* 1 회 prompt.
- **Realm fork** = realm 진입 시 길 갈래 2 개 (위험/안전), trait 영향.
- 산출: `MidCycleDecisionModal.tsx`, `cycleEvents.ts` 의 `decision_required` 이벤트, AutoBattleController 의 pause/resume API.
- Why HIGH: 약점 TOP 3 §2 의 직접 해소. Player decision frequency 를 cycle 당 1-3 회 → 5-10 회 로 증가. idle 정체성 유지 (자동 진행 default + opt-in dialog).

### N3. Hall of Sagas + Local Leaderboard — **scope: 3-5 cycle, impact: MEDIUM**

각 cycle 종료 시 사가를 *영구 hall* 에 보관 + 가장 인상적인 cycle 의 leaderboard (maxLevel / ageEnd / cause) top-N. 단일 디바이스 local 만 (서버 도입 X — Phase 5 와 별개).
- 산출: `SagaHallScreen.tsx`, `HallStorage.ts` (top 50 + 별표 즐겨찾기), `CycleResultV2` 의 "전당 등록" 버튼.
- Why MEDIUM (HIGH 아님): 외부 비교 (다른 플레이어) 가 없으므로 retention impact 는 self-referential. 그러나 200 시간 idle 보장 의 *과거 회상* axis 를 채워줌.

### N4. Run Statistics View + Curve Visualizer — **scope: 1 cycle, impact: MEDIUM**

cycle 결과 화면에 *그래프 1 개* — 시간축 × level 축 의 inflation curve. polynomial degree (cycle 17 의 측정 인프라) 를 player 가 직접 봄.
- 산출: `<InflationCurveChart/>` (recharts 또는 inline SVG), `CycleControllerV2` 의 levelSnapshot ring buffer (60 samples/cycle).
- Why MEDIUM: 약점 §1 의 *2 차 vector*. 폭발 VFX 가 즉각이라면 이건 *회고적 만족*. headline feature 는 아니지만 streamer/screenshot 친화.
- 부가 가치: dev 자가 진단 도구 — sim 산출과 dev server curve 가 같은 차트 위에 겹쳐서 sim-real parity 시각 검증 가능.

### N5. Live Operation Layer — 시즌 + 이벤트 + 도전과제 — **scope: mega-phase, impact: HIGH**

월/주 별 modifier (예: "이번 시즌 = volcano realm 진입 시 fire trait +1") + 도전과제 (10 cycles 안에 lv 10M, NPC 4 종 모두 만남, age 70 자연사 5 회) + 시즌 token → 균열석 환전.
- 산출: `SeasonalCatalog.ts`, `SeasonalModifierEngine.ts`, `AchievementSystem.ts`, `SeasonPassScreen.tsx`, persist v25.
- Why mega + HIGH: 약점 TOP 3 §3 의 직접 해소. 200 시간 retention 의 *유일한* 진정한 답. 단 mega-phase 임 — 3-5 cycle 로 못 끝남, 자율진화 cycle 단위로는 분할 sub-spec 필요 (spec → sub-spec 5 개 → 각 sub-spec 이 cycle 1 개).
- 위험: live ops 는 *서버 없는 idle 게임* 컨셉을 깰 수도 있음. 단순한 deterministic seed (`seasonId = floor(epoch / 30days)`) 로 server-less live ops 가능 — spec 단계에서 결정.

---

## Scope × Impact 매트릭스

| | 1 cycle | 3-5 cycle | mega-phase |
|---|---|---|---|
| **HIGH impact** | N1 Inflation VFX | N2 Mid-cycle decision | N5 Live Ops |
| **MEDIUM impact** | N4 Stats view | N3 Hall + Leaderboard | — |
| **LOW impact** | — | — | — |

**추천 cycle 105 entry** = N1 (1 cycle, HIGH). 약점 §1 직접 해소 + scope 작아 narrative 외 카테고리로 빠른 pivot 시그널.
**Cycle 106-110** = N2 (3-5 cycle, HIGH). 약점 §2 해소.
**Cycle 111 이후** = N5 sub-spec 시작 (mega), N4 + N3 가 사이드 phase.

---

## 3 의 규칙 평가

**3 회 이상 반복된 v1 backlog 검사** — cycle 1-100 의 carry-over 추적:

| Backlog | 반복 횟수 | 평가 |
|---|---|---|
| Realm-specific narrative tone | 1 (cycle 52 spec, 101-104 활성) | 3 회 미만, 정상 |
| Circular HeroEntity↔JobSystem (P-1.5) | 2 (cycle 6, 69) | 3 회 미만, 정상 |
| Sim performance baseline | 2 (cycle 47, 49) | 3 회 미만, 정상 |
| README 갱신 deferred | 1 (cycle 97) | 정상 |
| **D-backlog (D1-D7)** | **7 항목 × 평균 2-3 회 = ~16 회** | **3 회 이상**, 단 cycle 26-42 (17 cycle) 에 대규모 cleanup 처리 완료. 잔여 = D3 NPC filter 만 (cycle 91+ defer). 정상 |
| **Signature moment / VFX** | **0 회** | **승격 후보 X — 3 회 안 됐으니 spec 정식화 시점 아님.** 단, cycle 105 = 4 회째 narrative pivot 시도라면, 3 의 규칙 inverse 적용 가능 — *narrative tone 4 회 반복 → 이건 saturation* 으로 해석. |

**결론**: v1 backlog 중 "3 회 이상 반복 → 승격" 트리거에 걸린 건 D-backlog 뿐 (이미 처리). VFX/leaderboard/PvP/시즌 은 *0 회 시도* — 즉 spec 정식화 시점 아님. 단 advisor 가 "narrative 외" 를 지적한 = *3 의 규칙 inverse* (narrative tone 4 회 = saturation) 신호로 해석. **카테고리 균형 (narrative ↔ VFX/decision/meta) 을 직접 enforce 할 페르소나 룰 1 개 추가 권고**:

> **룰 9 (제안)**: 같은 카테고리 (narrative / system / UI / VFX / meta / 운영) 가 **3 cycle 연속** 시 다음 cycle 의 카테고리는 *반드시* 다른 카테고리. spec 단계에서 카테고리 태그 명시.

---

## 게임의 진정한 약점 (advisor 시각, narrative 외)

### A. **체험 의 시각화** — Inflation 정체성이 sim 산출 에 갇혀 있음

cycle 1-100 동안 maxLevel p50 824k → 4.8M → 6.96M → 6.98M 까지 inflation 곡선이 안정화됐지만, *플레이어 가 이 숫자를 다른 곳에서 본 적 없음*. 게임 컨셉 의 핵심 sell point 가 PRD 문서 의 숫자에만 존재. **plotline 보다 visualization 이 시급**.

### B. **Player agency 의 surface area**

idle 게임 이지만 *왜 다시 켜는가* 의 답이 약함. NPC encounter 빈도 (cyclesWithNpc) 가 cycle 1 에서 0 → 2 로 활성화됐지만, 그 외에는 player 의 결정이 cycle 시작 의 SpendModal 1 회 + 매우 드문 NPC modal. 200 시간 idle ≠ 200 시간 *0 결정*. idle 게임 의 진짜 정체성 = *낮은 결정 빈도, 그러나 결정 의 무거움* (Cookie Clicker 의 prestige, AdventureCapitalist 의 manager 선택). 현재 inflation-rpg 는 *결정 의 무거움* 도 약함 — sponsor gold 결정 의 outcome 이 maxLevel 에 거의 영향 없음 (cycle 17 측정).

### C. **외부 비교 axis 0**

V3 "영원한 영웅" 정체성 의 깊이가 sagaHistory 안에만 존재. 같은 디바이스 내 cycle 간 비교 도 약함 (Hall of Sagas 부재). 다른 플레이어 비교 = 0. **idle 게임 의 long-tail retention 은 99% 외부 비교 (leaderboard / 친구 / 시즌) 로 유지** — 이게 0 인 inflation-rpg 의 long-tail 추정 = 30-60 시간 (헤비 유저), 평균 8-15 시간.

### D. **콘텐츠 수직 깊이 vs 수평 폭**

1080 narrative permutation 은 *수평 폭* 임 (variety). 그러나 *수직 깊이* (한 줄기 의 mastery curve) 는 trait 16 + buff 7 + skill 12 + character 16 정도 — 일반 idle 게임 의 신규 콘텐츠 주입률 (월 1-2 character / 시즌) 기준 약 3-6 개월 분량. **content factory 없이 200 시간 retention 은 수학적으로 어려움**. N5 (Live Ops) 가 이 격차 의 유일한 답.

### E. **Saga 의 readability — 텍스트만 흐름**

1080 permutation 의 narrative 가 saga 1 줄로 환원되어 책 같은 readable interface 없음. SagaBookModal 가 존재하지만 *flat list*. timeline / chapter / age tier grouping / hero 의 visual portrait / realm icon strip 같은 *book metaphor* 가 visual 로 못 펴짐.
- 우선순위: N1 (VFX) < N2 (decision) < N3 (hall + leaderboard) **< E (saga visual)** < N5.
- 실제로 E 는 N3 의 sub-feature 로 흡수 가능.

---

## 마무리 — Cycle 105 추천 한 줄

> **N1 (Inflation Milestone VFX) 를 cycle 105 단일 cycle 로 ship.** 약점 §1 + 진정한 약점 §A 의 직접 해소. scope 1 cycle, impact HIGH, narrative 외 카테고리 pivot 의 명확한 시그널. cycle 106 부터 N2 multi-cycle spec 진입.

**대안 reading**: 만약 cycle 105 를 narrative 외 *어떤* 카테고리든 시작하기만 하면 된다면, N4 (Run Statistics View) 도 1 cycle scope 으로 가능. 단 impact 가 medium 이므로 N1 우선.
