# Cycle 1098 Planner Roadmap (C1099–C1104)

## 주제: 천상계 성유물 진화 & 초월 시련 정점 시스템 (Celestial Relic Transmutation & Apex Trial Summit)

신화 장비 15성 성운 각성을 달성한 영웅을 위해, 기존 4대 천상 성유물을 초월 등급으로 진화시키는 '성유물 변환(Relic Transmutation)'과, 우주적 극점에 도전하는 3단계 '초월 시련(Apex Trials)' 엔드게임 콘텐츠를 구축합니다.

---

### C1099 [system]: 4대 천상 성유물 초월 진화(Celestial Relic Transmutation) 엔진
- [`src/systems/celestialRelicTransmutation.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/systems/celestialRelicTransmutation.ts):
  - 4대 천상 성유물(북극성의 눈, 시리우스의 송곳니, 직녀성의 베일, 안타레스의 심장) 진화 초월 정의
  - 초월 성유물 고유 각성 스킬 (예: 북극성 - 약점 타격 시 30% 확률로 절대 극딜, 직녀성 - 디버프 면역 및 반사)
  - 소요 재화: 별빛 파편 + 차원 균열석 + 골드
  - 단위 테스트 작성 (`src/systems/celestialRelicTransmutation.test.ts`)

### C1100 [ui]: 성유물 초월 진화(Relic Transmutation) 모달 UI
- [`src/components/RelicTransmutationModal.tsx`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/components/RelicTransmutationModal.tsx):
  - 황금 성운 진화 이펙트, 스탯 증폭 및 초월 스킬 해금 프리뷰
  - [`ReforgeModal.tsx`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/components/ReforgeModal.tsx) 내 성유물(relic) 탭 내 진화 버튼 연동
  - 컴포넌트 테스트 작성 (`src/components/__tests__/RelicTransmutationModal.test.tsx`)

### C1101 [balance]: 성유물 진화 경제 & 심도 40 공허 지배자 격파 시뮬레이션
- [`src/systems/relicTransmutationBalance.test.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/systems/relicTransmutationBalance.test.ts):
  - 4대 성유물 진화 비용 경제성 분석
  - 심도 40 엘리트 보스(태초의 허무지배자: HP 230M+, 매턴 5% 회복) 격파 수학적 입증

### C1102 [narrative]: 고대 성좌 신들의 축복 & 초월 성유물 전승 서사
- [`src/data/relicTransmutationLore.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/data/relicTransmutationLore.ts):
  - 고대 성좌 신들의 축복 비록 및 초월 성유물 전승 설화
  - 단위 테스트 작성 (`src/data/__tests__/relicTransmutationLore.test.ts`)

### C1103 [system]: 최상위 초월 시련(Apex Trial Challenge) 3단계 엔진
- [`src/systems/apexTrialChallenge.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/systems/apexTrialChallenge.ts):
  - 1단계: 태초의 여명 (Primordial Dawn)
  - 2단계: 불멸의 황혼 (Immortal Dusk)
  - 3단계: 무극의 극점 (Apex of Zenith)
  - 단위 테스트 작성 (`src/systems/apexTrialChallenge.test.ts`)

### C1104 [critic+collab]: C1104 종합 비평 및 로드맵 갱신
- 성유물 진화 및 초월 시련 스프린트 전수 검증, 327+ 테스트 패스율 확인, 비평 보고서 발행
- `RESUME.md` v22 갱신
