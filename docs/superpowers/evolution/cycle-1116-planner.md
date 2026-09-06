# Cycle 1116 Planner Roadmap (C1117–C1122)

## 주제: 천상 주입 UI & 성간 공명 매트릭스 시스템 (Celestial Infusion UI & Astral Resonance Matrix)

C1111~C1115에서 확립된 시공간 왜곡 및 차원 정수(Dimensional Essence) 주입 엔진을 바탕으로, 유저가 직접 장비에 4대 우주적 접사(Cosmic Affixes)를 선택 및 주입할 수 있는 모달 UI, 4종 접사 조화 시 발동되는 성간 공명 매트릭스(Astral Resonance Matrix), 밸런스 검증 및 서사 연출을 완성합니다.

---

### C1117 [ui]: 천상 주입(Celestial Infusion) 모달 UI
- [`src/components/CelestialInfusionModal.tsx`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/components/CelestialInfusionModal.tsx):
  - 장착 중인 장비 슬롯(무기, 방어구, 장신구) 선택 인터페이스
  - 4대 우주적 접사(천상의 예리함, 성간의 불굴, 특이점의 위력, 우주의 신속) 상세 스탯 프리뷰
  - 재화 소모(차원 정수 1개, 별빛 파편 20개, 50,000G) 검증 및 주입 실행
  - [`ReforgeModal.tsx`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/components/ReforgeModal.tsx) 내 주입 탭/버튼 연동
  - 컴포넌트 테스트 작성 (`src/components/__tests__/CelestialInfusionModal.test.tsx`)

### C1118 [balance]: 4대 우주적 접사 빌드 시너지 & 심도 50 혼돈패왕 격파 수학적 검증
- [`src/systems/cosmicInfusionBalance.test.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/systems/cosmicInfusionBalance.test.ts):
  - 3부위 풀 접사 빌드별 DPS/EHP 증가량 비교 분석 (공격 특화 vs 생존 특화)
  - 심도 50 무극의 혼돈패왕(HP 900M+, 10턴 도omsday 광폭화) 7턴 내 완파 수학적 증명

### C1119 [narrative]: 고대 대장장이의 천상 주입 비록 & 주입 찬가
- [`src/data/cosmicInfusionLore.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/data/cosmicInfusionLore.ts):
  - 우주적 접사별 고대 대장장이의 주입 주문, 성간 야금술 비록, 전승록 연동
  - 단위 테스트 작성 (`src/data/__tests__/cosmicInfusionLore.test.ts`)

### C1120 [system]: 성간 공명 매트릭스(Astral Resonance Matrix) 조화 엔진
- [`src/systems/astralResonanceMatrix.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/systems/astralResonanceMatrix.ts):
  - 3부위 이상의 장비에 서로 다른 우주적 접사가 주입되었을 때 발동하는 '성간 조화(Astral Harmony)' 세트 효과
  - 2접사 조화: 관통 +5%, 올스탯 +5%
  - 3접사 조화: 최종 피해 +10%, 피격 시 10% 확률로 차원 회피(완전 무효화)
  - 단위 테스트 작성 (`src/systems/astralResonanceMatrix.test.ts`)

### C1121 [ui]: 성간 공명 매트릭스 인디케이터 배너 UI
- [`src/components/AstralResonanceBanner.tsx`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/components/AstralResonanceBanner.tsx):
  - 장비 상태창 및 재련 모달 상단에 성간 조화 단계 및 활성화된 공명 효과 렌더링
  - 컴포넌트 테스트 작성 (`src/components/__tests__/AstralResonanceBanner.test.tsx`)

### C1122 [critic+collab]: C1122 종합 비평 및 로드맵 갱신
- 천상 주입 및 성간 공명 스프린트 전수 검증, 342+ 테스트 패스율 확인, 비평 보고서 발행
- `RESUME.md` v25 갱신
