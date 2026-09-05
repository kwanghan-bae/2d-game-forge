# Cycle 1026 Planner Roadmap (C1027–C1032)

## 목표: 장비 세트 시너지 & 보스 페이즈 마스터리

### C1027 [system]: 장비 세트 효과(Equipment Sets) 시스템 설계
- `equipmentSets.ts` 구현:
  - 4개 대표 테마 세트:
    - **화랑 세트 (Hwarang Set)**: 2세트 ATK +10%, 3세트 치명타 확률 +10%
    - **도사 세트 (Dosa Set)**: 2세트 EXP +15%, 3세트 스킬 쿨다운 감소/마력 증폭
    - **호랑이 가죽 세트 (Tiger Set)**: 2세트 HP +15%, 3세트 보스 공격력 +15%
    - **상단 황금 세트 (Merchant Set)**: 2세트 골드 획득 +20%, 3세트 드롭률 +15%
  - `getActiveSetBonuses(equippedIds: string[])` 순수 함수 및 단위 테스트 작성

### C1028 [ui]: 장비 UI 세트 인디케이터 및 툴팁 시각화
- 장비 카드에 소속 세트명 및 2P/3P 활성화 상태 뱃지 표시
- 활성 세트 보너스 요약 패널 제공
- 컴포넌트 테스트 작성

### C1029 [system]: 보스 페이즈 전환(Phase Shift) & 특수 기믹 엔진
- `EncounterEngine.ts`에 보스 체력 50% 이하 시 발동하는 페이즈 전환 기믹 추가:
  - 분노 격파(Enrage Strike): ATK 1.5배 상승
  - 실드 전개(Barrier Phase): 일시적 방어막
- 순수 함수 `computeBossPhase` 모듈화 및 단위 테스트 작성

### C1030 [ui]: 보스 페이즈 알림 배너 & 연출
- `EventSpectacleLayer.tsx`에 `boss_phase_shift` 연출 추가
- 붉은색 경고 플래시 및 페이즈 변경 토스트

### C1031 [balance]: 세트 효과 & 보스 페이즈 전투 시뮬레이션
- `equipmentSetsBalance.test.ts`: 각 세트 착용 시의 DPS / 생존력 비교 검증
- 보스 페이즈가 전투 시간에 미치는 영향 및 난이도 곡선 가드레일 검증

### C1032 [critic+collab]: C1032 마일스톤 비평 및 차기 메가 페이즈 종합 기획
- C1032 비평 리포트 발행 및 다음 메가 페이즈 준비
