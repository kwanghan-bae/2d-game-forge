# Cycle 1080 Planner Roadmap (C1081–C1086)

## 주제: 무한 혼돈의 균열 원정 UI & 심도 랭킹 챌린지 (Endless Chaos Rift Expedition UI & Depth Challenge Sprint)

C1079에서 구축한 '무한 혼돈의 균열(Endless Chaos Rift)' 절차적 엔진을 플레이어가 직접 체감할 수 있도록 시각화 UI, 10층 연속 심도 원정 기능, 인플레이션 심도 밸런스 검증, 심연 서사 및 최고 심도 기록 배지 시스템을 완성합니다.

---

### C1081 [ui]: 무한 혼돈의 균열 원정(Chaos Rift Expedition) 모달 UI
- [`src/components/ChaosRiftModal.tsx`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/components/ChaosRiftModal.tsx):
  - 무한 균열 진입 인터페이스 (현재 심도 표시, 1층 도전 및 10층 연속 원정 버튼)
  - 절차적 수호자 정보 카드 (속성, HP, 공격력, 방어력, 심도별 칭호)
  - 실시간 원정 전투 로그 및 누적 획득 보상(별빛 파편, 균열석, 골드) 실시간 결산
  - [`AscensionTrialsModal.tsx`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/components/AscensionTrialsModal.tsx) 내 균열 원정 탭/버튼 연동
  - 컴포넌트 테스트 작성 (`src/components/__tests__/ChaosRiftModal.test.tsx`)

### C1082 [balance]: 심도 무한 스케일링 & 엔드게임 돌파 한계 시뮬레이션
- [`src/systems/riftEndlessScalingBalance.test.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/systems/riftEndlessScalingBalance.test.ts):
  - 심도 1층 ~ 50층까지의 적 HP/ATK 인플레이션 곡선 수학적 검증
  - 풀세팅 엔드게임 영웅(9성 천계 경지 + 황도 12궁 + 3성유물 + 연금술 환약)의 최대 도달 심도 한계 분석 (Soft Cap & Hard Cap)
  - 10층 원정당 보상 수급 효율 및 무한 파밍 경제 밸런스 입증

### C1083 [narrative]: 무한 균열 심연 서사 & 심도 돌파 단말마
- [`src/data/chaosRiftLore.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/data/chaosRiftLore.ts):
  - 차원의 틈새와 시공간 붕괴에 관한 우주적 심연 전승록
  - 10층 단위(10층, 20층, 30층, 50층) 심도 돌파 시 출력되는 수호자의 단말마 및 사가 기록문구
  - 단위 테스트 작성 (`src/data/__tests__/chaosRiftLore.test.ts`)

### C1084 [system]: 균열 원정 최고 심도 영구 기록(Rift Record Storage) 엔진
- [`src/systems/riftRecordStorage.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/systems/riftRecordStorage.ts):
  - 영웅의 최고 도달 심도(Highest Depth Cleared), 누적 토벌 수호자 수, 총 획득 전리품 기록 엔진
  - 스토어 및 메타 영구 보존 구조 연계
  - 단위 테스트 작성 (`src/systems/riftRecordStorage.test.ts`)

### C1085 [ui]: 균열 명예의 전당 심도 칭호 배지(Rift Depth Badge) UI
- [`src/components/RiftLeaderboardBadge.tsx`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/components/RiftLeaderboardBadge.tsx):
  - 최고 심도에 따른 전용 칭호 배지 (예: [심도 10] 균열의 탐색자, [심도 30] 차원 절단자, [심도 50] 무극의 패왕)
  - 영웅 상태창 및 시련 창에 명예 훈장 렌더링
  - 컴포넌트 테스트 작성 (`src/components/__tests__/RiftLeaderboardBadge.test.tsx`)

### C1086 [critic+collab]: C1086 종합 비평 및 로드맵 갱신
- 무한 균열 원정 및 랭킹 챌린지 스프린트 전수 검증, 312+ 테스트 패스율 확인, 비평 보고서 발행
- `RESUME.md` v19 갱신
