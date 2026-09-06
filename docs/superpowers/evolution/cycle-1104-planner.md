# Cycle 1104 Planner Roadmap (C1105–C1110)

## 주제: 초월 시련 정점 UI & 전승 성소 시스템 (Apex Trial Summit UI & Hall of Sagas Sanctuary)

C1099~C1103에서 완성된 4대 초월 성유물과 3단계 초월 시련(태초의 여명, 불멸의 황혼, 무극의 극점) 엔진을 유저가 직접 마주하고 정복할 수 있도록 모달 UI, 밸런스 검증, 서사 연출, 전승 성소(Apex Sanctuary) 시스템을 구축합니다.

---

### C1105 [ui]: 초월 시련(Apex Trial) 도전 모달 UI
- [`src/components/ApexTrialModal.tsx`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/components/ApexTrialModal.tsx):
  - 3대 시련(Tier 1 태초의 여명, Tier 2 불멸의 황혼, Tier 3 무극의 극점) 카드 UI
  - 해금 조건(심도 20 돌파, 1단계 격파+초월 성유물 1개, 2단계 격파+4대 초월 성유물/신화 15성) 실시간 잠금/해제 상태 표시
  - 보스 기믹(여명의 폭염, 황혼의 일식, 무극의 특이점) 및 보상(별빛 파편, 균열석, 칭호) 프리뷰
  - [`AscensionTrialsModal.tsx`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/components/AscensionTrialsModal.tsx) 내 `open-apex-trial-btn` 연동
  - 컴포넌트 테스트 작성 (`src/components/__tests__/ApexTrialModal.test.tsx`)

### C1106 [balance]: 초월 시련 3단계 극점(무극의 창조주 10억 HP) 수학적 격파 검증
- [`src/systems/apexTrialBalance.test.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/systems/apexTrialBalance.test.ts):
  - 1단계(1.2억 HP) / 2단계(3.8억 HP) / 3단계(10억 HP, 12.5M ATK) TTK(Time-to-Kill) 시뮬레이션
  - 4대 초월 성유물 + 15성 신화 장비 각성 유무에 따른 승률 및 생존성 비교 분석
  - 5턴 무극의 특이점 이전 격파 또는 부활 후 극딜 수학적 증명

### C1107 [narrative]: 초월 시련 보스 전승 대화 & 극점 정복 서사
- [`src/data/apexTrialLore.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/data/apexTrialLore.ts):
  - 각 시련 보스 조우 대사, 광폭화/특이점 포효, 패배 단말마
  - 전승의 전당(Hall of Sagas) 정복 기록 서사
  - 단위 테스트 작성 (`src/data/__tests__/apexTrialLore.test.ts`)

### C1108 [system]: 정점 전승 성소(Apex Zenith Sanctuary) 영구 축복 엔진
- [`src/systems/apexZenithSanctuary.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/systems/apexZenithSanctuary.ts):
  - 초월 시련 정복자 영구 패시브: 시련 단계별 +5% 전 능력치 축복
  - 칭호(여명의 개척자, 황혼의 정복자, 무극의 초월자) 장착 및 보너스 적용
  - 단위 테스트 작성 (`src/systems/apexZenithSanctuary.test.ts`)

### C1109 [ui]: 정점 전승 성소 뱃지(Zenith Sanctuary Badge) UI
- [`src/components/ZenithSanctuaryBadge.tsx`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/components/ZenithSanctuaryBadge.tsx):
  - 오버월드 헤더 및 상태창에 정점 달성 위업 뱃지 표시
  - 호버 시 영구 축복 배율 및 정복 칭호 툴팁 제공
  - 컴포넌트 테스트 작성 (`src/components/__tests__/ZenithSanctuaryBadge.test.tsx`)

### C1110 [critic+collab]: C1110 종합 비평 및 로드맵 갱신
- 초월 시련 및 성소 스프린트 전수 검증, 332+ 테스트 패스율 확인, 비평 보고서 발행
- `RESUME.md` v23 갱신
