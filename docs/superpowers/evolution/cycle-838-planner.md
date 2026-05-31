# Cycle 838 Planner — C839-C841 Proposals

## Layer rotation
- C839 = **system** (새로운 데이터/로직 레이어)
- C840 = **structure** (기존 코드 추출/정리)
- C841 = **balance** (수치 튜닝 + 새 콘텐츠)

---

## C839 [system]: GambitFeedbackAccumulator — gambit 성과를 플레이어에 노출

### 무엇을 하는가
RunStatistics 에 이미 `gambitsWon/Lost/AutoResolved` 3개 필드가 있지만, **단일 런 내 gambit 누적 수익(goldNet)과 HP 총 비용(hpTotalCost)** 을 추적하는 필드가 없다. 현재 플레이어는 gambit 을 켜도 그것이 이득인지 손해인지 확인할 방법이 없다 (C835 collab carry-over: "Gambit policy feedback — player can't see gambit impact").

이 cycle 에서:
1. `RunStatisticsData` 에 `gambitGoldNet: number` + `gambitHpCost: number` 2 필드 추가.
2. `recordGambit()` 호출 시 goldReward, hpCost 파라미터를 받아 누적.
3. `EncounterEngine` 의 `event_risk_gambit` emit 지점에서 값 전달.
4. (UI 는 C840+ 에서 소비 — 이 cycle 은 system layer only.)

### 어떤 파일을 건드리는가
| File | Change |
|------|--------|
| `encounter/RunStatistics.ts` | +2 fields, recordGambit signature 확장 |
| `EncounterEngine.ts` | recordGambit 호출부 인자 추가 (~2 lines) |
| `EncounterEngine.test.ts` or `RunStatistics` test | +3-5 assertions |

### 왜 최고 임팩트인가
- Carry-over backlog 에 "Gambit policy feedback" 로 **3+ cycle** 등장 (C830, C835, C838). 3의 규칙 발동.
- 이미 infrastructure (RunStatistics) 가 있으므로 최소 LOC (< 30 lines prod) 로 해결 가능.
- EventMilestone tracker 는 UI consumer 없이 의미 없고, DeadZoneEvent 는 balance layer 작업.

### 리스크: **Low**
- 기존 `recordGambit(won, autoResolved)` → `recordGambit(won, autoResolved, goldReward, hpCost)` 시그니처 변경은 caller 가 EE 1곳뿐.
- 테스트 2224개 중 gambit 관련은 ~6개, 전부 `recordGambit` mock/call 확인만 → 파라미터 추가로 fix trivial.

---

## C840 [structure]: tickWeatherHazards() — weather HP drain 추출

### 무엇을 하는가
`resolveEncounter()` 내 fight 750-770 line 부근에 Storm Nexus HP drain (3 lines) + Abyssal Convergence HP drain (3 lines) + Temporal Fissure payback (5 lines) + Gold Crucible expiry (자체 블록) 이 인라인으로 배치되어 있다. 이들은 "매 fight 시작에 weather/temporal 효과를 tick 하는" 동일 패턴.

`tickSimpleDurations()` (C837) 가 단순 decrement 만 처리하고, **side-effect 있는 weather tick** 은 제외된 상태. 이를 `tickWeatherHazards(hero)` private method 로 추출:
- stormNexus HP drain + decrement
- abyssalConvergence HP drain + decrement
- temporalFissure decrement + payback
- goldCrucible decrement + atkFlat reset

### 어떤 파일을 건드리는가
| File | Change |
|------|--------|
| `EncounterEngine.ts` | −25 lines inline → +1 call site + 1 new private method (~30 lines) = net −10 LOC |

### 왜 최고 임팩트인가
- EE 2356 lines 감소 목표 (carry-over: "CombatResolver further extraction, EE → ~2200 goal").
- Gold computation 은 이미 `GoldCalculator.ts` 로 추출 완료 (C834 era). Weather hazard 가 남은 가장 응집도 높은 인라인 블록.
- `tickSimpleDurations` 패턴과 자매 관계 → 코드 읽기 명확.
- `tickCombatBuffs` typed return interface 는 caller 영향 범위가 넓어 medium risk. Weather hazard 는 self-contained.

### 리스크: **Low**
- 순수 Extract Method refactoring. 로직 변경 0.
- hero.hp mutation 순서가 동일하면 기존 테스트 전부 통과.
- stormNexus/abyssal 통합 테스트가 HP drain 순서를 명시적으로 검증하므로 regression catch 확실.

---

## C841 [balance]: Dead Zone Event — "Sparring Grounds" (fight 80-119)

### 무엇을 하는가
Fight 80-119 구간은 Mentor (25-130), Fairy (120+), Wandering Merchant (100-250) 사이 이벤트 밀도가 낮다. Mentor 가 cap 130으로 줄면서 80-99 구간이 진정한 dead zone 이 되었다 (C838). 새 이벤트 "Sparring Grounds" 추가:

- **발동 조건**: fight 80-119, 3% 확률 (SPARRING_GROUNDS_CHANCE)
- **효과**: 현재 ATK 기준 "mock battle" → 승리 시 소량 EXP burst (level×2), 패배 시 HP 10% 감소 (최소 1)
- **승패 판정**: hero.atk > enemyAtkAtLevel(hero.level × 0.8) → 승리 (약 70% win rate at normal progression)
- **목적**: dead zone 에 risk/reward micro-decision 삽입. Gambit 과 다른 flavour (skill check vs HP gamble).

### 어떤 파일을 건드리는가
| File | Change |
|------|--------|
| `encounter/constants.ts` | +3 constants (CHANCE, EXP_BURST, HP_PENALTY) |
| `encounter/EventOrchestrator.ts` | +1 event registration (fight range, weight) |
| `EncounterEngine.ts` | +15 lines (sparring resolution logic in event handler section) |
| `EncounterEngine.test.ts` | +1 test block (~20 lines) |

### 왜 최고 임팩트인가
- "Fight 80-119 dead zone event" 은 carry-over 에 **4+ cycle** 등장 (C832, C835, C838). 3의 규칙 초과.
- 플레이어 체감: 80-119 구간 ~40 fights 동안 아무 이벤트 없이 단조 전투만 반복. 이는 critic score 중 "재미" 축 정체 원인.
- Late-game event (fight 300+) 는 소수 고레벨 플레이어만 도달. Dead zone 은 100% 플레이어가 경험.

### 리스크: **Medium-Low**
- 새 이벤트이므로 balance 검증 필요하지만, 3% 확률 + fight window 40 = 기대값 1.2회/run → 밸런스 파괴 가능성 극저.
- EXP burst 가 level×2 → fight 80-119 시점 level ~50-100 → 100-200 EXP. 이 시점 kill EXP ~300-500이므로 < 50% 비중.
- EventOrchestrator 에 event 추가는 잘 정형화된 패턴 (C832 Merchant, C826 Gambit 참조).

---

## 요약

| Cycle | Layer | Feature | Files touched | Net LOC | Risk |
|-------|-------|---------|---------------|---------|------|
| C839 | system | GambitFeedbackAccumulator | RunStatistics + EE (2곳) | +20 | Low |
| C840 | structure | tickWeatherHazards() | EE only | −10 | Low |
| C841 | balance | Sparring Grounds event | constants + EventOrch + EE + test | +45 | Med-Low |

## Carry-over (deferred to C842+)
- Merchant 3rd choice (risk/reward ATK double-or-nothing)
- Run Summary UI (consume RunStatisticsData in OverworldRunner)
- Storm/Snow VFX indicators
- Late-game event fight 300+ (Void Beacon)
- EventMilestone tracker (first-time markers)
