# Cycle 713 Collaboration Record

## 참여자
- **Critic** (6/5/4/5): 흥행5/재미4/몰입6/플레이타임5
- **Planner**: C714-C716 3-cycle plan
- **Level-Designer**: 힐 시스템 + BET_HIGH + drop 분석

## 합의 사항

### 1. BET_HIGH 리워크 (C714 balance)
- **모든 에이전트 동의**: 현재 BET_HIGH는 "절대 안 누르는 버튼"
- Critic: 기하 EV < 0 (산술 +1%지만 compound 파산)
- Level-Designer: BET_LOW EV +20% vs BET_HIGH +1% → 20배 차이
- **합의안**: `WIN_RATE: 0.45→0.40`, `reward: 2x→3x`, `lose: 0.80→0.60`
  - 새 EV: 0.40×3 - 0.60×0.60 = +0.84G (BET_LOW +0.20G 대비 4.2배)
  - 고위험 고수익 정체성 확립

### 2. Event Pity Timer (C714 balance)
- Critic: 20전투 연속 이벤트 0회 확률 ≈ 17% → 치명적 이탈
- Planner: `EVENT_PITY_THRESHOLD = 25` 제안
- Level-Designer: 이벤트 빈도 자체는 적절, pity만 필요
- **합의안**: `fightsSinceEvent` 카운터, 20회 무이벤트 시 강제 spawn
  - Planner 25 vs Critic 15 → 중간값 20 채택

### 3. Survival Heal Threshold 비율 전환 (C715 system)
- Level-Designer 강력 주장: HP ≤ 10 고정값은 inflation 곡선에서 사장
  - hpMax 50000일 때 threshold 10 = 0.02% → 사실상 미발동
- **합의안**: `SURVIVAL_HEAL_THRESHOLD: 10 → 0.05 × hpMax` (비율)
  - `SURVIVAL_HEAL_RATE: 0.03 → 0.025` (발동 빈도 증가 보정)
  - PostCombatHealCalc에 heroHpCurrent context 추가 필요

### 4. 후반 힐 과잉 방지 (C715 system)
- Level-Designer: REGEN_SCALE_CAP 0.05 + BUFF_MUL 2.0 = 12%/fight 불사
- **합의안**: `REGEN_SCALE_CAP: 0.05→0.03`, `REGEN_BUFF_MUL: 2.0→1.5`
  - 초반 보완: `WIN_HP_REGEN_RATE: 0.01→0.015`

### 5. HealBreakdownBadge 조건부 표시 (C716 UI 개선)
- Critic: 매 전투 4색 pill = banner blindness 5분 후
- **합의안**: heal < 5% maxHP시 숨김, dominant source(>50%) 하이라이트

## 다음 3-cycle 확정

| Cycle | Layer | 내용 |
|-------|-------|------|
| C714 | balance | BET_HIGH 리워크(3x/0.40/0.60) + Event Pity Timer(20) |
| C715 | system | Survival threshold 비율 전환 + 힐 과잉 방지 상수 조정 |
| C716 | UI/UX | HealBreakdownBadge 조건부 표시 + dominant highlight |

## 캐리오버 (이후 사이클)
- RelicEffectResolver 추출 (Planner C715 → 연기, survival 우선)
- constants 파일 분할 (Planner C716 → 연기)
- Drop diminish per 100 drops (Level-Designer 제안, 검증 필요)
- Altar + Gambler 시너지 (altar 중 BET_HIGH 4x)
