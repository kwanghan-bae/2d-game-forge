# Cycle 677 협의

## 참여 에이전트
- game-critic: Fun 4/10, Code Health 5/10, Variety 3/10 — "extract→trophy" 패턴이 최대 위험
- game-planner: C678 balance(test fix) → C679 visual(hit-flash) → C680 structure(GoldCalc wiring -120줄)
- level-designer: fateRoll 실패 원인 = LEVEL_SACRIFICE_RATE 0.25 (C573), 테스트 기대값 수정 권고

## 합의 사항

### 다음 3사이클
1. **C678 [balance]**: fateRoll + sim-cycle-v2 테스트 수정 (levelSacrificeCooldown 설정으로 격리)
2. **C679 [visual]**: Hit-flash 이펙트 또는 ComboStreakBadge 강화 (visual 레이어 예산 채움)
3. **C680 [structure]**: GoldCalculator engine wiring (L1247-L1391 교체, -120줄 목표)

### 우선순위 변경
- "extract first, wire later" → **"wire before next extract"** 원칙 채택 (Critic 최대 위험 대응)
- LEVEL_SACRIFICE_RATE 0.25→0.18 조정은 C678에서 테스트 수정과 함께 적용

### 거부된 제안
- SeasonalModifier 실전 와이어링 (Critic): 범위 과다, 현 era에서 불가. 다음 era backlog으로.
- ExpCalculator 추출 (Planner backlog): side-effect 복잡도 높아 C680 이후로 연기 유지.
- Enemy HP compound scaling (Level-designer C673): GoldCalc wiring 우선. 다음 era로.

## 수치 스냅샷
- EncounterEngine.ts: 2107줄
- 추출 모듈 합계: 1837줄 (8개 파일)
- 테스트: 1963 passed / 3 failed (balance drift)
- LEVEL_SACRIFICE_RATE: 현 0.25, 권고 0.18
