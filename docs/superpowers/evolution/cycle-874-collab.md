# Cycle 874 Collab Record

## 참가자
- **Critic**: 20/40 (변동 없음)
- **Level Designer**: 밀도 곡선 분석 + 전환기 진공 발견
- **Planner**: C875-877 제안 (player agency 중심)

## Critic 점수 (20/40)
| 축 | 점수 |
|---|---|
| 흥행성 | 5/10 |
| 재미 | 4/10 |
| 몰입성 | 5/10 |
| 플레이타임 | 6/10 |

**핵심 메시지**: "토스트는 통보이지 선택이 아니다." Mid-game event에
플레이어 agency가 0이다. proving/crossroads/mercenary에 선택 모달을 붙여야
한다. C872 토스트로 서사 맥락은 부여되었으나, decision space = 0은 그대로.

## Level Designer 분석

### 이벤트 밀도 curve (요약)
- Fight 0-20: 0 events (awakening hints로 커버)
- Fight 55-65: 피크 6.95/10fight (proving + early momentum 중첩)
- Fight 80-110: 건강 5.35-6.15/10fight (proving + sparring + crossroads)
- **Fight 130-170: 밀도 절벽** — sparring/crossroads/mentor 동시 퇴장, pool weight −12%
- Weather-gated events 유효 발동률 ~0.42%/fight (유령 콘텐츠)

### Dead code 확인
- `getLateGameDensityMul`: LATE_GAME_EVENTS에만 적용됨, mid-game weather에 미적용
- BUFF_STACK_CAP 1.65: 실현 최대 ~1.39, unreachable safety net

### 수치 제안
- MERCENARY_OFFER_MAX_FIGHTS: 145→175 (전환기 채움)
- SPARRING_GROUNDS_MIN_FIGHTS: 80→70 (fight 66-79 gap 축소)
- EARLY_MOMENTUM_MAX_FIGHT: 65→70 (sparring과 중첩)
- Weather chance: 0.04→0.08 (유령화 해소)

## Planner 합의안 (C875-877)

### C875 [system]: Proving Grounds 선택 게이트
- fight/flee 2지선다, 2초 선택 윈도우 + timeout fallback
- idle 본질 보존: timeout 시 기존 AI heuristic 발동
- 처음으로 터치 가능한 선택지 등장

### C876 [structure]: EventChoiceOverlay + FSM 분리
- 순수 컴포넌트 + 3-state FSM (idle/presenting/resolved)
- OverworldScene inline 코드 제거 (−30~50 LOC)
- 향후 crossroads/merchant 선택 확장 기반

### C877 [balance]: 수동 선택 보상 +25% + 전환기 밀도 보정
- PROVING_GROUNDS_MANUAL_BONUS: 수동 accept 시 EXP×2.5 (기존 2.0)
- 거절 시 소량 gold (위험 회피 보상)
- SPARRING_GROUNDS_MIN_FIGHTS: 80→70
- EARLY_MOMENTUM_MAX_FIGHT: 65→70

## 합의 요약

3인 공통 인식:
1. **Player agency = 0 이 핵심 병목** (critic + planner 동의)
2. **Fight 130-170 전환기 밀도 절벽** (level designer 발견, balance에서 수정)
3. **Weather-gated events 유령화** (level designer, 향후 cycle에서 대응)

C875-877 합의안 채택. 핵심 전환: "보여주기" → "선택하기" 패러다임.
