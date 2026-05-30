# Cycle 808 Planner — C809-C811 방향 설정

category: meta

## 현황 요약

| 항목 | 상태 |
|------|------|
| EncounterEngine | 2,276 lines, 183 members — 여전히 God Object |
| 추출 완료 모듈 | 27개 (encounter/ 하위) |
| Events | 15종, 9 late-game (gate 200-500) |
| DeclineStack | linear gradient ×1.5-×2.5, 작동 중 |
| Density ramp | phase 1 (150-350, ×1→×2), phase 2 (350-550, ×2→×3.5) |
| Tests | 2,234 passing |
| Critic 점수 | 27/40 (C805) |

## 감지된 감쇠 수익 (Diminishing Returns)

1. **이벤트 수 추가**: 15개 이벤트가 first-match-wins 우선순위로 동작 — 새 이벤트를 추가해도 mid-game 것이 항상 먼저 발동하여 late-game 이벤트 도달률 저하. **이벤트 수 자체보다 dispatch 구조 개선이 ROI 높음.**
2. **수치 승수 누적**: C560 planner가 이미 "더 이상 mul 추가 금지" 선언. encounter 시스템의 수치 레이어는 포화.
3. **God Object 감량**: 27개 모듈을 이미 추출했으나 EncounterEngine 본체가 여전히 2,276 lines. 30줄 단위 추출은 감쇠 — **큰 덩어리 (resolveEncounter combat loop, ~400 lines)를 통째로 분리**해야 의미 있는 감량.

## 추천: 다른 게임 시스템으로 관심 이동

encounter 시스템은 이미 15 events + DeclineStack + density ramp로 late-game depth 확보. **Combat depth** (전투 자체의 전략성)와 **Progression meta** (프레스티지 이후 분기)가 상대적으로 미개발.

---

## C809-C811 Cycle Targets

### C809 [structure] — CombatLoop 추출 (EncounterEngine → CombatResolver)

**근거**: EncounterEngine의 `resolveEncounter` 내부 combat loop (~lines 581-2000, 1400+ lines)가 단일 최대 덩어리. 이걸 `CombatResolver` class로 추출하면 EncounterEngine은 ~800 lines까지 감소 가능. God Object 해소의 최대 ROI 작업.

- 추출 대상: combat round loop, damage calc 호출, death/victory branching, combo/streak state 업데이트
- EncounterEngine은 "encounter dispatch + event orchestration"만 남김
- 기존 `CombatCalculator.ts`는 단발 계산 유틸 — `CombatResolver`는 **stateful loop** 담당
- 수용 기준: EncounterEngine ≤ 1,200 lines, 기존 2,234 tests 전수 통과, CombatResolver 단위 테스트 ≥ 20개 신규

### C810 [system] — EventDispatch 가중 우선순위 (Weighted Priority Queue)

**근거**: 현재 first-match-wins 방식은 mid-game 이벤트가 항상 선점. Late-game event 도달률이 게이트 통과 후에도 낮음 (C805 Critic 지적의 확장). 가중 우선순위 시스템 도입으로 fight count, hero state, decline stack depth에 따라 이벤트 발동 확률 동적 조정.

- `EventOrchestrator`에 `WeightedEventQueue` 도입
- 각 event에 `weight(ctx: EncounterContext): number` 함수 추가
- gate 조건 통과 후 weight 기반 확률적 선택 (deterministic seed 유지)
- first-match-wins는 fallback으로 유지 (weight 미정의 이벤트용)
- 수용 기준: gate 300+ event 발동률 baseline 대비 Δ ≥ +15% (3-seed 평균, sim 50-cycle)

### C811 [balance] — Prestige Path 분기 도입 (Ascension Lite)

**근거**: C560 planner의 Ascension Path 설계가 이미 존재하나 미구현. prestige 10+ 이후 dead zone이 존재하며 (Level Designer C805), 비가역 선택을 통한 빌드 다양성이 "eternal hero idle" 컨셉의 핵심 재방문 동기. 전체 3-path 중 **1개 path만** MVP로 도입.

- Warlord Path 단독 구현: ATK 파이프라인에 `Math.pow(result, 1.1)` transform + gold -50%
- `ascensionPath` state field 추가 (prestige handler)
- AI personality 별 path 선택 확률 차등 (aggressive → warlord 80%)
- 수용 기준: prestige 10+ 구간 maxLevel baseline 대비 Δ ≥ +8% (3-seed 평균), gold 획득 baseline 대비 Δ ≤ -40% (trade-off 검증)

---

## 카테고리 연속 검증 (룰 9)

| Cycle | Category |
|-------|----------|
| C806 | system |
| C807 | structure |
| C808 | balance |
| **C809** | **structure** |
| **C810** | **system** |
| **C811** | **balance** |

3 연속 동일 카테고리 없음 — 룰 9 준수.

---

## Backlog (이번 라운드 외)

- Sage Path / Merchant Path 구현 (C811 Warlord 성공 후)
- Event narration template 자동 동기화 (constants 변경 → narration 자동 갱신)
- UI fog-of-war (Mirage Oasis, C565 설계 존재)
- EncounterEngine serialize/deserialize 분리 (save system 개선)
- Critic 점수 30/40 돌파를 위한 전략적 UI 피드백 (event 결과 시각화)

## 비고

- C809 CombatResolver 추출은 C810 WeightedEventQueue와 독립적 — 병렬 작업 가능하나 순차가 안전 (테스트 기반 확인 후 다음 진행)
- C811 Ascension은 C560 설계 문서를 그대로 참조하되, MVP 범위를 Warlord 1개로 한정 (YAGNI)
- sim-driven acceptance는 반드시 3-seed 평균 사용 (measurement noise 고려)
