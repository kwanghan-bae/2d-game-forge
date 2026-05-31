# Cycle 871 Collab Record

## 점수: 20/40 (재보정 — 플레이어 체감 기준)

| 축 | 점수 | 변화 |
|---|---|---|
| 흥행성 | 5 | −2 (재보정) |
| 재미 | 4 | −3.5 (재보정) |
| 몰입성 | 5 | −1 (재보정) |
| 플레이타임 | 6 | −2 (재보정) |

> Critic 재보정: "코드 건강도 가산 제거, 플레이어 체감만 평가"

## 핵심 발견

### 🔴 "시뮬레이터를 만들고 있는가, 게임을 만들고 있는가?"
- C869-871 모든 개선(pity fix, resolver wire, cap meaningful)이 **UI에 0px 반영**
- `grep "event_proving\|event_crossroads" *.tsx` → 0 hit
- 플레이어는 시스템 변화를 인지할 방법이 없음

### ⚠️ BUFF_STACK_CAP 1.65 여전히 Dead Code
- Storm Nexus minFights=160 > Crossroads maxFights=130 → 동시 활성 불가
- 유일한 실전 2-buff: ClearSky×Crossroads = 1.12×1.18 = 1.32 (cap 미만)
- Cap은 방어적 safety net으로만 가치 있음

### ⚠️ Density Ramp 120→ Cosmetic
- Fight 120-150 구간에 event pool = Ancient Colosseum 1개 (chance 3%)
- densityMul 1.09 곱해봐야 절대 차이 +0.003/fight → 체감 불가
- "빈 선반에 할인 붙이는" 격

## Consensus Plan: C872-C874

| Cycle | Layer | Action |
|---|---|---|
| C872 | system | Mid-game event toast pipeline — EventChoiceToastLogic에 12종 label 추가 + OverworldRunner wire |
| C873 | structure | Extract combat resolution loop (−200 LOC target) OR constants domain split |
| C874 | balance | PROVING_GROUNDS_CHANCE 4→6%, late event pool expansion, density slope 강화 |

## 핵심 메시지

> "C869-871은 시뮬레이션이 올바르게 작동하는가를 해결. 이제 플레이어가 그것을 알 수 있는가를 해결할 차례."

## Level Designer 수치 제안

| param | 현재 | 제안 | 이유 |
|---|---|---|---|
| PROVING_GROUNDS_CHANCE | 0.04 | 0.06 | 기대 2.1회/run, synergy 체감 |
| PROVING_GROUNDS_MIN_FIGHT | 55 | 50 | Overlap window 확대 |
| CROSSROADS_CHANCE | 0.03 | 0.04 | 자연 발동 70.8%, pity 의존 감소 |
| density slope (120-200) | 0.006 | 0.008 | fight 150에서 mul 1.24 체감 |
