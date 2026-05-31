# Cycle 844 Planner — C845-C847 3-Cycle Plan

category: meta

## 컨텍스트

- **직전 3 cycle** (C842-C844): system → structure → balance 완료
  - C842: RunStatisticsSummary — top-3 highlight 계산 로직
  - C843: tickTimeLockVault + tickPostCombatGoldBonuses 추출
  - C844: Merchant gamble choice + Sparring/Merchant 튜닝
- **Critic score trajectory**: 28 → 28.5 → 29.5 → ~30 (예상)
- **EncounterEngine**: 2378 lines (C843 추출 후에도 여전히 과대)

## 잔여 약점 (3의 규칙 적용)

| 약점 | 출현 횟수 | 우선순위 |
|------|----------|----------|
| RunStats highlights 미노출 (계산만 존재) | 3+ (C836, C842, critic) | **P1** |
| Fight 250+ 콘텐츠 공동 (Abyssal 단독) | 3+ (C789, C841 critic, level-designer) | **P1** |
| Sparring/Merchant 자동결정 (player agency 부재) | 2 (C841 critic, C844 partial fix) | P2 — backlog |
| EncounterEngine 거대화 (2378 lines) | 3+ (C834, C837, C843) | **P1 structure** |

## C845 [system] — LateGameEventScheduler 데이터 레이어

### 근거
Fight 250+ 이후 이벤트가 Abyssal Convergence 하나뿐이고, Titan Arena(300), Crimson Tithe(325) 등은 존재하나 chance가 낮아 실질 콘텐츠 밀도 ≈ 0. 이벤트 스케줄링 데이터 시스템이 필요하다.

### 목표
`LateGameEventScheduler` — fight 250+ 구간에서 이벤트 등장 보장 시스템. pity timer + density ramp를 데이터로 관리.

### 동작
1. `LateGameEventScheduler` 클래스 생성 (`encounter/LateGameEventScheduler.ts`)
2. 내부 상태: `fightsSinceLastLateEvent: number`, `pityCounter: number`
3. `shouldGuaranteeEvent(totalFights: number): boolean` — pity threshold (예: 30 fights without late event → guaranteed)
4. `recordLateEvent(): void` — pity 리셋
5. `getLateEventDensityBoost(totalFights: number): number` — fight 300+ 추가 density (1.0 → 1.8 linear)
6. PostCombatEventResolver가 이미 `pityEligible: true`를 세팅하고 있으나, 실제 pity logic은 미구현. 이 scheduler가 그 역할 수행.

### 수용 기준
- 클래스 export + unit test 3개 (pity trigger / reset / density curve)
- EncounterEngine은 import만 — wiring은 C847에서

### NOT this
- UI 변경 없음
- 기존 LATE_GAME_EVENTS 배열 구조 변경 없음
- Event 내용(효과) 추가 없음 — 그건 balance layer

---

## C846 [structure] — tickSacrificeSubsystem 추출

### 근거
EncounterEngine 2284-2332 (48 lines)의 `tickSacrificeSubsystem`은 이미 private method지만 5개의 내부 하위시스템(gold burn, combo reset, exp offering, danger bet, health tax)을 모두 포함하며 EncounterEngine의 20+ 필드를 참조한다. 별도 모듈로 추출하면 EncounterEngine이 ~2330 lines로 축소되고, sacrifice 로직의 단위 테스트가 가능해진다.

### 목표
`encounter/SacrificeSubsystem.ts` 모듈 추출. EncounterEngine의 sacrifice 관련 필드(goldBurnCooldown, sacrificeAltarCooldown, sacrificeDiminish, goldBurnTotal 등)를 캡슐화.

### 동작
1. `SacrificeSubsystem` 클래스 생성 — 내부 상태 + `tick(ctx)` 메서드
2. ctx 인터페이스: `{ heroGold, heroAtk, heroCombos, isDangerZone, rng, ... }`
3. EncounterEngine에서 sacrifice 필드 제거 → `private sacrifice: SacrificeSubsystem`
4. `tickSacrificeSubsystem` 호출부를 `this.sacrifice.tick(ctx)` 로 대체
5. 기존 동작 100% 보존 (deterministic output 비교 테스트)

### 수용 기준
- EncounterEngine line count Δ ≤ -40
- 기존 sim smoke 결과 변동 없음 (bitwise identical)
- SacrificeSubsystem unit test 2개 (gold burn trigger / cooldown reset)

### NOT this
- tickTemporalSystems, tickCombatBuffs는 이번에 추출하지 않음
- Sacrifice 밸런스 변경 없음

---

## C847 [balance] — Late-game event density 튜닝 + 신규 이벤트 1종

### 근거
C845에서 LateGameEventScheduler를 도입해도 이벤트 종류가 부족하면 반복 피로가 발생한다. Fight 250-400 구간에 1종 추가 + density constant 조정으로 체감 콘텐츠 밀도를 높인다.

### 목표
1. 신규 late-game event: `event_echo_convergence` (fight 275+) — 직전 5 fights의 EXP 합산 ×0.4를 bonus로 지급 (Echo 시스템과 시너지)
2. LateGameEventScheduler wiring — C845 scheduler를 PostCombatEventResolver에 연결
3. Density constant 조정: LATE_GAME_DENSITY_MUL 1.5 → 1.8

### 동작
1. `EventGateConfig.ts`의 LATE_GAME_EVENTS에 echo_convergence 추가 (chance 0.025, minTotalFights 275)
2. `PostCombatEventResolver`에서 C845 scheduler의 `shouldGuaranteeEvent` → 1개 이벤트 강제 선택
3. constants-events.ts: `LATE_GAME_DENSITY_MUL = 1.8`
4. RunStatistics에 `echoConvergenceTriggered` 카운터 추가

### 수용 기준
- Sim 50-cycle: fight 250-500 구간 이벤트 발생률 baseline 대비 Δ ≥ +25% (3 seeds 평균)
- echo_convergence 이벤트 sim 50-cycle 내 최소 1회 발생 (3 seeds 중 2+ seeds)
- 기존 mid-game (100-250) 이벤트 발생률 변동 Δ ≤ ±5%

### NOT this
- UI 변경 없음
- Merchant/Sparring agency 문제는 이번에 다루지 않음 (P2 backlog 유지)
- Pity timer threshold는 보수적으로 30 fights 고정 (추후 tuning)

---

## Backlog (이번 rotation 외)

- **RunStats UI 노출** — highlights 데이터는 C842에서 계산 완료, UI wire는 UI layer cycle에서 처리
- **Sparring/Merchant player agency** — C844에서 Merchant gamble 추가로 부분 해소, 추가 choice 메커니즘은 다음 rotation의 system layer에서 검토
- **tickTemporalSystems 추출** — C846에서 sacrifice 먼저, temporal은 다음 structure cycle
- **tickCombatBuffs 추출** — 30 lines로 작아서 우선순위 낮음

## 비고

- **컨셉 가드**: 모든 변경은 "자율 진화하는 idle hero sim" 범위 내. 새 이벤트(echo_convergence)는 기존 Echo 시스템의 자연 확장이며 외부 시스템 도입 아님.
- **리스크**: C847의 density 1.5→1.8 조정이 과도하면 mid-game 밀도에 역류 가능. `getAvailableLateEvents`가 totalFights 필터를 적용하므로 mid-game 영향은 구조적으로 차단됨.
- **의존성**: C847은 C845(scheduler)에 의존. C846은 독립적.
