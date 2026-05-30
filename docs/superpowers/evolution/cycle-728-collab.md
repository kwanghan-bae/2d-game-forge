# Cycle 728 Collaboration Record

## 참가자
- **Critic** (6/5/6/7 = 24/40, 변동 없음): chooseEncounterNode 421 cycle 방치 = "재미" 병목. 다음 미해결 시 4점 하락 예고.
- **Planner**: C729-C731 arc — DestinationBadge UI → phase-aware weight → chooseEncounterNode wire
- **Level-Designer**: Boss timer enrage ×2.0 = prestige 0 원샷 봉인. BET_HIGH ratio 5 여전히 trivial. Fog crit -27% DPS for crit builds.

## 상수 불일치 발견 (Level-Designer)
- BOSS_RAGE_ATK_PER_TURN: 실제 0.10 (프롬프트에서 0.15 잘못 기재)
- BOSS_ENRAGE_TIMER_MUL: 실제 2.0 (프롬프트에서 1.5 잘못 기재)

## 합의 사항

### 즉시 반영 (C729-C731) — chooseEncounterNode 해금 arc

1. **C729 [UI/UX]**: DestinationBadge + landmarkDisplay helper
   - LandmarkKind → emoji+label 매핑 (16종)
   - OverworldRunner pill badge (WeatherHud 패턴 답습)
   - 선택된 목적지 시각화 (idle = 정보 표시 only)

2. **C730 [balance]**: Boss timer enrage 완화 + BET_HIGH ratio 재상향
   - BOSS_ENRAGE_TIMER_TURN: 10 → 15 (prestige 0 first boss 생존 마진)
   - BOSS_ENRAGE_TIMER_MUL: 2.0 → 1.5 (복합 원샷 완화)
   - AI_BET_HIGH_GOLD_RATIO: 5 → 12 (run 15% 이후로 delay)

3. **C731 [system]**: CycleControllerV2 ↔ DestinationResolver wire
   - ai.chooseDestination() 실호출 삽입 (421 cycle stub 해소)
   - trait-weighted routing 활성화
   - 기존 trait 16종 × landmark 16종 가중치 코드 이미 완성 (C284-286)

### Backlog 미루기
- Fog crit penalty 0.70→0.80 추가 완화: C733+ 검토 (C726에서 이미 1회 완화)
- Phase-aware destination weight: C731 wire 이후 별도 cycle
- Gambler ALL_IN 3rd option: C734+

## 수치 변경 합의

| param | 현재 | C730 target | 근거 |
|---|---|---|---|
| BOSS_ENRAGE_TIMER_TURN | 10 | 15 | prestige 0 TTK ~12.5 turn에 안전 마진 부여 |
| BOSS_ENRAGE_TIMER_MUL | 2.0 | 1.5 | 복합 ×4.0→×3.0, 원샷→2-shot |
| AI_BET_HIGH_GOLD_RATIO | 5 | 12 | level 20에서 ~32 kills 후 trigger, surplus 의미 부여 |

## 표류 경보
- **chooseEncounterNode**: critic 최후통첩 — C731 미해결 시 "재미" 4점 하락 + 표류 경보 격상.
- **EncounterEngine size**: 1914줄 (추출 효과 미미). 지속적 extraction 필요.
