# Cycle 1068 Planner Roadmap (C1069–C1074)

## 주제: 천상 성유물 소켓 장착 UI & 승천 보스 연전 시스템 (Celestial Star Relics Socketing UI & Ascendant Boss Rush)

C1067에서 구축된 천상 성유물(Celestial Star Relics) 소켓 엔진을 대장간 UI와 완전 연동하고, 최종 엔드게임 콘텐츠인 '승천 보스 연전(Ascendant Boss Rush)' 모드를 도입하여 별빛 파편과 차원 균열석의 순환 경제를 완성합니다.

---

### C1069 [ui]: 천상 성유물 소켓 각인 모달 UI
- [`src/components/CelestialRelicSocketModal.tsx`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/components/CelestialRelicSocketModal.tsx) (또는 [`ReforgeModal.tsx`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/components/ReforgeModal.tsx) 4번째 탭 'relic'):
  - 장착 장비(무기/방어구/장신구) 슬롯별 성유물 장착 상태 표시
  - 4대 천상 성유물(북극성의 눈, 시리우스의 송곳니, 직녀성의 베일, 안타레스의 심장) 선택 및 장착/해제
  - 소켓 장착 시 슬롯별 특화 스탯 프리뷰 (무기: 공격력/치명타, 방어구: 방어력/피해감소/체력, 장신구: 골드·경험치/원소공명/속도)
  - 컴포넌트 테스트 작성 (`src/components/__tests__/CelestialRelicSocketModal.test.tsx`)

### C1070 [balance]: 성유물 소켓 장비 경제 및 전투 시뮬레이션
- [`src/systems/relicSocketBalance.test.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/systems/relicSocketBalance.test.ts):
  - 풀 세트 3슬롯 소켓(90 파편, 75,000G) 투자 비용 및 회수 경제 검증
  - 3종 성유물 장착 시 종합 스탯 증폭 및 시련 10층 보스전 전투 효율 정밀 시뮬레이션

### C1071 [narrative]: 4대 천상 성좌 설화 및 장인의 소켓 각인 대사
- [`src/data/relicFlavor.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/data/relicFlavor.ts):
  - 북극성, 시리우스, 직녀성, 안타레스의 천문 설화와 장인의 망치질 각인 대사
  - 단위 테스트 작성 (`src/data/__tests__/relicFlavor.test.ts`)

### C1072 [system]: 승천 보스 연전(Ascendant Boss Rush) 엔진
- [`src/systems/ascendantBossRush.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/systems/ascendantBossRush.ts):
  - 5연속 보스 웨이브 도전 엔진
  - 웨이브별 누적 스탯 강화 및 처치 보상(별빛 파편, 균열석, 대량 골드)
  - 단위 테스트 작성 (`src/systems/ascendantBossRush.test.ts`)

### C1073 [ui]: 승천 보스 연전 모달 UI
- [`src/components/AscendantRushModal.tsx`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/components/AscendantRushModal.tsx):
  - 웨이브 단계 표시 및 실시간 보스 처치 현황
  - 즉시 보상 수령 및 패배/포기 처리
  - 컴포넌트 테스트 작성 (`src/components/__tests__/AscendantRushModal.test.tsx`)

### C1074 [critic+collab]: C1074 종합 비평 및 로드맵 갱신
- 성유물 소켓 & 보스 연전 시스템 통합 검증, 전수 테스트 패스율 확인, 비평 보고서 발행
- `RESUME.md` v17 갱신
