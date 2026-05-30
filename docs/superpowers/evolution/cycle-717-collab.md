# Cycle 717 Collaboration Record

## 참여자
- **Critic** (5/5/6/5): 흥행5/재미5/몰입6/플레이타임5
- **Planner**: C718-C720 plan (system/structure/balance)
- **Level-Designer**: BET_HIGH geometric EV 검증 + pity-trap 결함 발견

## 합의 사항 (전원 동의)

### 1. 🔴 CRITICAL: Pity→Trap 강제 발동 버그
- **전원 독립 발견**: pity 시 `rngOrPity()` 가 첫 체크(Trap)를 100% 통과시킴
- 20전 무이벤트 후 "보상" = 함정 피해 → 설계 역설
- **즉시 수정**: pity 발동 시 trap 스킵, positive event pool에서만 발동

### 2. BET_HIGH 기하 EV 0.82 — 의도적 설계
- Level-Designer 확인: 산술 +44% / 기하 0.82 = "단발 흥미 / 장기 파멸"
- Gold는 중간재(ATK 전환)이므로 파산해도 레벨/경험치 보존
- **합의**: 현재 수치 유지, 의도적 gambler's ruin 설계로 인정

### 3. 초반 heal flat floor 상향
- Level-Designer: hpMax ≤ 66일 때 regen = 1 HP (사실상 무의미)
- **합의**: `max(1, ...)` → `max(3, ...)` 으로 flat floor 상향

### 4. AI BET_HIGH 조건부 추가 (nice-to-have)
- Critic: auto-play에서 BET_HIGH 영원히 선택 안 됨
- Level-Designer: `heroGold > 3×nextUpgrade` 조건으로 BET_HIGH 선택
- **합의**: C719 이후 backlog (우선도 낮음)

## 다음 3-cycle 확정

| Cycle | Layer | 내용 |
|-------|-------|------|
| C718 | system | Pity-trap hotfix + heal flat floor 3 + RelicEffectResolver 추출 시작 |
| C719 | structure | CombatLoop 추출 (다턴 전투 while 블록 → 순수 함수) |
| C720 | balance | WeatherSystem expMul 연결 + Drop diminish per 100 levels |

## 캐리오버 (이번 3-cycle 외)
- AI BET_HIGH 조건부 (Critic/Level-Designer 제안)
- 상수 740개 Phase Profile 분류 (Critic 제안)
- Area/landmark progression 추출
- BattleOutcomeBadge real data
