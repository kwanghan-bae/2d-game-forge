# Cycle 1086 Planner Roadmap (C1087–C1092)

## 주제: 천상 보옥 제련 & 원소 격발 초월 시스템 (Celestial Gem Carving & Elemental Trigger Transcendence)

무한 혼돈의 균열 깊은 심도(Depth 25+)에서 마주하는 가혹한 소프트캡을 돌파하기 위해, 영웅의 무기와 방어구에 4대 원소 고유의 격발 효과(타격 시 연쇄 폭발, 피격 시 수막 방벽 등)를 부여하는 '천상 보옥 제련(Celestial Gem Carving)' 엔드게임 시스템을 도입합니다.

---

### C1087 [system]: 4대 원소 천상 보옥 제련(Celestial Gem Carving) 엔진
- [`src/systems/celestialGemCarving.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/systems/celestialGemCarving.ts):
  - 4대 원소 보옥 정의 (홍련의 겁화석, 창해의 빙정석, 뇌정의 벽력석, 극야의 명혼석)
  - 4등급 티어 시스템 (일반 -> 희귀 -> 전설 -> 신화)
  - 원소별 고유 전투 격발 효과 (On-Hit 연쇄 폭발, On-Hit 감전 취약화, On-Damaged 수막 흡수, 체력 흡수 등)
  - 단위 테스트 작성 (`src/systems/celestialGemCarving.test.ts`)

### C1088 [ui]: 보옥 제련소(Gem Carving Workshop) 모달 UI
- [`src/components/GemCarvingModal.tsx`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/components/GemCarvingModal.tsx):
  - 보옥 가공, 티어 합성 승급, 장비 슬롯 각인 인터페이스
  - 원소별 격발 효과 시각화 및 프리뷰
  - [`ReforgeModal.tsx`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/components/ReforgeModal.tsx) 내 5번째 탭(gem) 연동
  - 컴포넌트 테스트 작성 (`src/components/__tests__/GemCarvingModal.test.tsx`)

### C1089 [balance]: 보옥 발동 확률 및 DPS 35% 도약 시뮬레이션
- [`src/systems/gemCarvingBalance.test.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/systems/gemCarvingBalance.test.ts):
  - 보옥 제련 비용 경제 (별빛 파편 + 균열석 + 골드)
  - 보옥 격발 효과 발동 시 DPS +35% 도약 및 심도 25+ 소프트캡 극복 수학적 증명

### C1090 [narrative]: 4대 원소 천상 보옥 신화 & 장인의 비록
- [`src/data/gemLore.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/data/gemLore.ts):
  - 4대 보옥의 기원 신화 및 보옥 가공 장인의 연마 비록
  - 단위 테스트 작성 (`src/data/__tests__/gemLore.test.ts`)

### C1091 [system]: 무한 균열 심도별 보옥 원석 드랍 연계
- [`src/systems/riftGemDropIntegration.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/systems/riftGemDropIntegration.ts):
  - 무한 혼돈의 균열 심도 10층 이상에서 보옥 원석 및 파편 드랍 로직 통합
  - 단위 테스트 작성 (`src/systems/riftGemDropIntegration.test.ts`)

### C1092 [critic+collab]: C1092 종합 비평 및 로드맵 갱신
- 천상 보옥 제련 스프린트 전수 검증, 317+ 테스트 패스율 확인, 비평 보고서 발행
- `RESUME.md` v20 갱신
