# Cycle 1038 Planner Roadmap (C1039–C1044)

## 목표: 속성 상성(Elemental Affinities) 및 승천 시련(Ascension Trials)

### C1039 [system]: 4대 속성 상성 매트릭스 엔진
- `elementalSystem.ts` 구현:
  - 4대 속성: **화(Fire), 수(Water), 뇌(Lightning), 암(Dark)**
  - 상성 사이클: 화 > 뇌 > 수 > 화 (3원소 환상) + 암(서로에게 치명적 약점)
  - 속성 대미지 보너스 계산: 약점(1.5x), 보통(1.0x), 저항(0.7x)
  - 장비 및 스킬에 기본 속성 태그 부여
  - 단위 테스트 작성 (`elementalSystem.test.ts`)

### C1040 [ui]: 속성 약점 인디케이터 및 전투 타격 뱃지
- 몬스터/보스 체력바 옆에 속성 아이콘 표기 (🔥, 💧, ⚡, 🌑)
- 약점 타격 시 `WEAKNESS! (1.5x)` 배너 및 색상 하이라이트
- 컴포넌트 테스트 작성

### C1041 [balance]: 속성 상성 밸런스 시뮬레이션
- `elementalBalance.test.ts`:
  - 보스 속성별 카운터 장비 착용 시의 TTK(Time-To-Kill) 비교 검증
  - 비상성 및 역상성 시의 생존력과 클리어 난이도 인밸리언트 검증

### C1042 [narrative]: 속성 간 상호작용 및 마물 해설록
- `elementalFlavor.ts`:
  - 약점 타격 시 캐릭터 감탄사 ("불꽃이 놈의 번개를 집어삼켰다!", "약점을 찔렀어!")
  - 마물별 속성 약점 힌트 도감 텍스트
  - 단위 테스트 작성

### C1043 [system]: 승천 시련(Ascension Trials) 보스 러시 엔진
- `AscensionTrials.ts`:
  - 고강화 장비 영웅을 위한 10단계 연속 보스 러시 모드
  - 단계별 속성 변이 보스 출현 및 특별 유물 보상
  - `cycleSliceV2` 결선 및 통합 테스트 작성

### C1044 [critic+collab]: C1044 마일스톤 종합 비평 및 차기 Phase 기획
- C1044 비평 보고서 발행 및 C1045~C1050 로드맵 수립
- `RESUME.md` v12 업데이트
