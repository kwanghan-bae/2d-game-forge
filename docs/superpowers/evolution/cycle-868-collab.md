# Cycle 868 Collab Record

## 점수: 28.5/40 (+0.5)

| 축 | 점수 | 변화 |
|---|---|---|
| 흥행성 | 7 | ±0 |
| 재미 | 7.5 | +0.5 |
| 몰입성 | 6 | ±0 |
| 플레이타임 | 8 | ±0 |

## 주요 발견

### 🔴 Critical Bug: Crossroads Pity Dead Code
- `CROSSROADS_PITY_THRESHOLD=40` but crossroads window = fight 95-130 (35 fights)
- `fightsInWindow >= 40` is impossible since `totalFights <= 130` guard blocks first
- C868의 핵심 의도 완전 무효화. 즉시 수정 필요.

### ⚠️ MidGameEventResolver Not Wired
- C867에서 pure function 추출했으나 EncounterEngine에서 import하지 않음
- 동일 로직이 EncounterEngine L2018-2111에 중복 존재
- "가짜 리팩터링" — 14 tests가 프로덕션 미연결 코드 검증

### ⚠️ BUFF_STACK_CAP 1.85 Unreachable
- Max practical 2-stack = storm×crossroads = 1.35×1.18 = 1.593
- Weather exclusivity → 3-stack 불가. EarlyMomentum fight 1-50, Crossroads 95-130 → 동시 불가
- Cap이 어떤 실전 시나리오에서도 트리거 안 됨

## Consensus Plan: C869-C871

| Cycle | Layer | Action |
|---|---|---|
| C869 | system | Fix crossroads pity (threshold 40→30) + EARLY_MOMENTUM_MAX_FIGHT 50→65 (ATK dead zone 축소) + PROVING_GROUNDS_REWARD 강화 (1.50→2.00, duration 3→5) |
| C870 | structure | Wire MidGameEventResolver into EncounterEngine — replace inline logic with function call (−100 LOC) |
| C871 | balance | BUFF_STACK_CAP 1.85→1.65 (예방적 ceiling) + late-game density ramp 시작점 150→120 |

## 세부 근거

### C869 [system/balance hybrid — pity fix + tuning]
- Pity fix: `CROSSROADS_PITY_THRESHOLD: 40→30` (fight 125에서 발동, window 내)
- EarlyMomentum 확장: `MAX_FIGHT: 50→65` (proving grounds overlap, dead zone 44→29 fights)
- Proving Grounds 강화: `REWARD_EXP_MUL: 1.50→2.00`, `DURATION: 3→5` (런당 +1%→+3% EXP)

### C870 [structure — real extraction]
- Import `resolveMidGameEvents` in EncounterEngine
- Replace L2018-2111 inline code with single function call + state apply
- Target: EncounterEngine 2549→2450 LOC (−100)

### C871 [balance — density + ceiling]
- `BUFF_STACK_CAP: 1.85→1.65` (10% headroom over max practical 1.593)
- Late density ramp: start at fight 120 instead of 150
- `PROVING_GROUNDS_WIN_CHANCE: 0.65→0.70` (fail 감정 비용 완화)
