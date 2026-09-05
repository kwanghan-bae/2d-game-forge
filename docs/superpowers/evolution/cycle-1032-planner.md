# Cycle 1032 Planner Roadmap (C1033–C1038)

## 목표: 전설의 대장간 재연마 & 장비 분해 루프 (Blacksmith Reforge & Dismantle Loop)

### C1033 [system]: 장비 분해(Dismantle) 및 재연마/강화(Reforge) 코어 엔진
- `reforgeSystem.ts` 구현:
  - **분해(Dismantle)**: 미사용/중복 장비를 분해하여 티어 및 희귀도에 비례하는 `reforge_essence`(재연마 정수) 획득
  - **강화/재연마(Reforge)**: 골드와 정수를 소모하여 장비 강화 레벨(+1 ~ +10) 부여
  - 강화 단계별 기본 스탯 증폭 (+10% per level, 최대 +100%)
  - 파괴 없는 안전 강화 시스템 (실패 시 재료만 소모, 장비 파괴 없음)
  - `reforgeSystem.test.ts` 단위 테스트 작성

### C1034 [ui]: 대장간 재연마 및 분해 전용 모달 UI
- `ReforgeModal.tsx` 구현:
  - 장비 선택, 현재 강화 수치(+N), 강화 예상 스탯 증가량 표시
  - 분해 탭 & 강화 탭 분리
  - 성공/실패 시의 시각적 피드백
  - `ReforgeModal.test.tsx` 컴포넌트 테스트 작성

### C1035 [balance]: 대장간 경제 및 강화 확률 인밸리언트 검증
- `reforgeBalance.test.ts` 시뮬레이션:
  - 초반(+1~+3: 100%), 중반(+4~+6: 80%), 후반(+7~+9: 60%), 종결(+10: 40%) 확률 검증
  - 골드 및 정수 소모량 대비 전투력 상승 효율 시뮬레이션
  - 엔드게임 골드 싱크로서의 지속 가능성 확인

### C1036 [narrative]: 대장장이 NPC 대사 및 성공/실패 플레이버
- `blacksmithFlavor.ts` 구현:
  - 대장장이의 작업 멘트, 강화 성공/대성공/실패 시의 감정 대사
  - 6개 캐릭터 아키타입별 장비 강화 리액션
  - 단위 테스트 작성

### C1037 [system]: 강화 레벨 전투 스탯 실전 바인딩
- 강화 수치(+N)를 `HeroTurnCalc`, `DefenseCalc`, `cycleSliceV2`의 장비 계산 로직에 결선
- 장비 세트 시너지와 강화 수치의 곱연산/합연산 정합성 검증
- 단위/통합 테스트 작성

### C1038 [critic+collab]: C1038 마일스톤 비평 및 다음 메가 페이즈 기획
- C1038 비평 보고서 발행 및 C1039~C1044 로드맵 수립
- `RESUME.md` v11 업데이트
