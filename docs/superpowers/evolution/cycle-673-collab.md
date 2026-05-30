# Cycle 673 Collaboration Record

## 참여 에이전트
- game-critic
- game-planner
- level-designer

## Critic 평가

| 축 | 점수 | 핵심 |
|---|---|---|
| 흥행성 | 4/10 | 731 상수 UI 미노출, 첫 5분 hook 부재 |
| 재미 | 4/10 | PostCombatEventResolver 미연결 → 이벤트 확장 차단 |
| 몰입성 | 5/10 | 콤보 뱃지 + prestige scaling이 즉각 피드백 |
| 플레이타임 | 4/10 | P15 cap 이후 새 자극 0 |

- **#1 문제**: PostCombatEventResolver dead code (3 cycle째 미연결)
- **#1 강점**: pure function 추출 패턴 건전 (추출 후 연결까지 같은 에라 내 완료 필요)
- **표류 경보**: 없음

## Planner 에라 플랜 (C674-C679)

| Cycle | Layer | 작업 |
|---|---|---|
| C674 | structure | GoldCalculator 추출 (~177줄) |
| C675 | system | PostCombatEventResolver engine wiring |
| C676 | UI/UX | ATK breakdown tooltip (Constant Fog 해소) |
| C677 | structure | ExpCalculator 추출 (~184줄) |
| C678 | visual | BattleOutcomeBadge 실데이터 연결 |
| C679 | system | FeedbackDispatcher (crit sound/haptic) |

엔진 축소 예산: C674(-177) + C677(-184) = -361줄 → 2140→~1779 (목표 1900 초과 달성)
AtkMultiplierAccumulator는 backlog 유지 (risk 대비 이득 부족).

## Level Designer 제안

### Enemy Prestige Scaling
- HP: linear 0.15/P → **compound 1.12^P** (P15: ×3.25 → ×5.47, P20: ×9.65)
- HP cap: 15 → **20** (후반 무풍 해소)
- ATK: 0.06 → **0.07** (미세 상향)
- 근거: hero ATK는 지수 성장(×8~12 at P15), enemy HP linear는 추종 불가

### Trap / Combo
- TRAP_AVOID_COMBO: 15 → **12** (초반 체감 개선)
- COMBO_PERSIST_RATE: 0.35 유지 (적절)

### 추출 우선순위
1. GoldCalculator (★★ risk, 177줄, gold += 단방향)
2. ExpCalculator (★★★ risk, level-up cascade callback 분리 필요)
3. AtkMultiplierAccumulator (★★★★★ risk, C700+ epic)

## 합의 결정

1. **C674**: GoldCalculator 추출 (planner + level-designer 일치)
2. **C675**: PostCombatEventResolver wiring (critic #1 urgency + planner)
3. **C676**: ATK breakdown tooltip (critic constant fog)
4. **C677**: ExpCalculator 추출 (engine sub-1900 확정)
5. **C678-C679**: visual + system (BattleOutcomeBadge data, FeedbackDispatcher)
6. **Balance backlog**: enemy HP compound scaling (C675 wiring 후 balance cycle에서)
