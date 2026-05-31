# Cycle 841 Planner — C842-C844 Proposals

## Layer rotation
- C842 = **system** (새로운 데이터/로직 레이어)
- C843 = **structure** (기존 코드 추출/정리)
- C844 = **balance** + collab record

---

## C842 [system]: RunStatisticsSummary — 17 metrics 에서 top-3 하이라이트 자동 추출

### 무엇을 하는가
RunStatistics 에 17개 누적 메트릭이 있지만, end-of-run 시점에 플레이어에게 "이번 런 하이라이트" 를 보여줄 방법이 없다. 데이터는 있으나 소비자(UI)가 없다. 이번 cycle 에서 **RunStatisticsSummary** computation layer 를 추가한다:

1. `RunStatistics.ts` 에 `computeSummary(): RunSummaryHighlight[]` 메서드 추가.
2. `RunSummaryHighlight` type: `{ metricKey: string; value: number; rank: 'gold' | 'silver' | 'bronze'; label: string }`.
3. 선정 로직: 17 metrics 중 **비율 기준 상위 3개** 를 선정. 비율 = `value / expectedBaseline[metricKey]`. baseline 은 상수 테이블 (fight 200 기준 정규화).
4. `gambitsWon` 이 0이면 gambit 관련 metrics 제외 (미사용 feature highlight 방지).
5. UI wire 는 C844+ 에서 소비 — 이 cycle 은 system layer only.

### 어떤 파일을 건드리는가
| File | Change |
|------|--------|
| `encounter/RunStatistics.ts` | +`RunSummaryHighlight` type, +`computeSummary()` method, +`METRIC_BASELINES` const |
| `encounter/RunStatistics.test.ts` | +1 test block: given 17 metrics → top 3 선정 검증 (~15 assertions) |

### 왜 최고 임팩트인가
- "RunStatistics UI" 가 carry-over backlog 에 **HIGH PRIORITY** 로 4+ cycle 등장 (C835, C838, C841). 3의 규칙 초과.
- UI 를 바로 만들기엔 structure 정리가 먼저 필요하지만, **computation layer 는 UI 와 독립**. 이 cycle 에서 계산만 확정하면 UI 연결이 trivial 해진다.
- EventMilestone tracker 는 소비자가 아직 없고, Void Beacon 은 balance layer 작업.

### 리스크: **Low**
- 기존 RunStatistics 인터페이스 변경 없음 (메서드 추가만).
- `computeSummary()` 는 pure function (this.fields 읽기 전용) → side-effect 0.
- Baseline 상수 값이 부정확해도 UI 에서 사후 조정 가능 (presentation layer).

---

## C843 [structure]: buildAtkContext() — combat multiplier 60-field 빌드를 추출

### 무엇을 하는가
`resolveEncounter()` 의 combat 판정 직전에 ~60줄에 걸쳐 ATK multiplier context 를 조립한다:
- base ATK (hero.atk + atkFlat)
- buff multipliers (mentor, fairy, echo, colosseum, sparring, weather 계열)
- debuff multipliers (storm drain, abyssal penalty)
- special conditions (gambit active, prestige bonus)

이 블록은 reading complexity 의 주원인 (reviewer 가 "어디서 atk 가 결정되는지" 파악에 300ms+ 소요). `buildAtkContext(hero): AtkContext` private method 로 추출:

```ts
interface AtkContext {
  baseAtk: number;
  buffMultiplier: number;
  debuffMultiplier: number;
  finalAtk: number;
  activeBuffSources: string[];
}
```

### 어떤 파일을 건드리는가
| File | Change |
|------|--------|
| `EncounterEngine.ts` | −60 lines inline → +1 call site + 1 private method (~65 lines) + AtkContext interface = net −5 LOC, readability ++ |

### 왜 최고 임팩트인가
- EE 2360 lines → 목표 ~2200. `tickWeatherHazards` (C840) 이후 가장 응집도 높은 추출 대상.
- `computeGoldReward()` 추출도 후보였으나 이미 GoldCalculator 분리 (C834 era). ATK context 가 남은 가장 큰 인라인 블록.
- `Set<string>` 으로 pending flags 통합은 caller 가 12곳 이상 → 영향 범위가 넓고 medium-high risk. ATK context 는 consumer 1곳 (resolve combat) → 안전.

### 리스크: **Low**
- 순수 Extract Method. 로직 변경 0.
- `finalAtk` 결과값이 동일하면 모든 기존 combat 테스트 통과.
- `activeBuffSources` 는 디버그/로깅 용도로만 사용 (선택적 반환).

---

## C844 [balance+collab]: Merchant 3rd Choice — ATK Double-or-Nothing Gamble

### 무엇을 하는가
Wandering Merchant (fight 100-250) 는 현재 2 choices: gold→HP heal, gold→ATK buff. 3rd choice 추가: **risky ATK gamble**.

- **선택지 텍스트**: "위험한 거래: ATK 버프 2배 연장… 또는 소멸" (flavor: merchant 의 수상한 주사위)
- **동작**:
  - 50% 확률: 현재 ATK buff duration × 2 (최대 cap = 현재 fight + 80)
  - 50% 확률: ATK buff 즉시 소멸 (atkFlat = 0, atkBuffRemaining = 0)
  - ATK buff 가 없는 상태에서 선택 시: 아무 일도 없고 gold 소모 안 함 (dead choice → 자연스러운 trap)
- **비용**: gold × 0.4 (heal 이나 ATK 보다 저렴 → risk 대비 discount)
- **목적**: Merchant 이벤트에 gambit 풍미의 micro-decision 추가. 기존 2 choice 가 항상 "optimal answer" 가 명확해 선택 의미가 퇴색된 문제 해결.

### 어떤 파일을 건드리는가
| File | Change |
|------|--------|
| `encounter/constants.ts` | +2 constants (MERCHANT_GAMBLE_CHANCE = 0.5, MERCHANT_GAMBLE_COST_RATIO = 0.4) |
| `EncounterEngine.ts` | merchant event handler 에 +20 lines (3rd choice branch) |
| `EncounterEngine.test.ts` | +1 test block: gamble win → duration×2, gamble lose → buff gone (~15 assertions) |

### 왜 최고 임팩트인가
- "Merchant 3rd choice" 는 carry-over backlog 에 **MEDIUM** 으로 3+ cycle 등장 (C838, C841). 3의 규칙 발동.
- Sparring Grounds (C841) 가 fight 80-119, Merchant gamble 이 fight 100-250 → 중반부 이벤트 다양성 2단계 강화.
- Void Beacon (fight 350+) 은 도달 인구 < 5% → Merchant gamble 은 100% 도달 구간에 위치, 체감 우선.
- Echo/Fairy synergy 는 아직 두 시스템 간 coupling 이 없어 balance 검증 어려움 → 후순위.

### 리스크: **Medium-Low**
- 50%/50% binary outcome 이므로 극단값 없음.
- ATK buff 소멸 최악 케이스: 다음 merchant/echo/fairy 에서 재획득 가능 (회복 경로 존재).
- Duration cap (fight + 80) 으로 무한 연장 방지.
- RunStatistics 에 `gambitGoldNet` (C839) 와 별개이므로 merchant 전용 tracking 은 추후.

---

## 요약

| Cycle | Layer | Feature | Files touched | Net LOC | Risk |
|-------|-------|---------|---------------|---------|------|
| C842 | system | RunStatisticsSummary (top-3 highlight) | RunStatistics (2곳) | +45 | Low |
| C843 | structure | buildAtkContext() extraction | EE only | −5 | Low |
| C844 | balance+collab | Merchant 3rd choice (ATK gamble) | constants + EE + test | +40 | Med-Low |

---

## Carry-over (deferred to C845+)
- RunStatistics UI wire (C842 computation → UI render) — next system cycle 후보
- Void Beacon event (fight 350+, prestige-scaled) — balance cycle 후보
- EventMilestone tracker (first-time flags) — system 후보, UI consumer 확보 후
- Echo/Fairy synergy at fight 200+ — balance 후보, coupling analysis 필요
- Storm/Snow VFX indicators — VFX cycle 할당 시
- Gambit policy feedback UI — C842 summary 와 함께 UI cycle 에서 소비
- Pending flags → Set<string> consolidation — structure 후보 (high-touch, 12 callers)
