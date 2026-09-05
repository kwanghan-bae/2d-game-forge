# Cycle 1056 Planner Roadmap (C1057–C1062)

## 주제: 십이지신 성좌 공명 & 천상 각성 시스템 (Zodiac Constellations & Celestial Resonance)

승천(Ascension) 및 영수(Pet) 시스템과 유기적으로 결합하여, 동양 십이지신(12지)의 별자리 공명 효과를 통해 엔드게임 인플레이션 스탯을 한 단계 더 도약시키는 성좌 시스템을 구축합니다.

---

### C1057 [system]: 십이지신 성좌 공명 엔진
- `src/systems/zodiacSystem.ts`:
  - 12지(자·축·인·묘·진·사·오·미·신·유·술·해) 수호 성좌 정의
  - 성좌 노드 해금: 차원 균열석(crackStones) 및 JP를 소모하여 단계별 해금
  - 각 성좌별 고유 스탯 보너스 (치명타, 피해 경감, 행동속도, 골드 획득 등)
  - 단위 테스트 작성 (`src/systems/zodiacSystem.test.ts`)

### C1058 [ui]: 십이지신 천상 성좌도 모달 UI
- `src/components/ZodiacConstellationModal.tsx`:
  - 12지 성좌도 원형 성도(Celestial Chart) 시각화
  - 해금된 별자리 발광 이펙트 및 별빛 연결선 표현
  - 성좌 클릭 시 상세 스탯 보너스 및 해금 버튼
  - 컴포넌트 테스트 작성 (`src/components/__tests__/ZodiacConstellationModal.test.tsx`)

### C1059 [balance]: 성좌 스탯 인플레이션 & 엔드게임 DPS 시뮬레이션
- `src/systems/zodiacBalance.test.ts`:
  - 12 성좌 누적 시 총 스탯 증가율 및 균열석 소비 경제 검증
  - 풀 성좌 해금 상태에서 시련 10층 '종언의 패왕' 15턴 이내 초고속 토벌 시뮬레이션

### C1060 [narrative]: 십이지신 수호성 설화 및 성좌 각성 대사
- `src/data/zodiacFlavor.ts`:
  - 12지 수호성들의 전승 및 한국 전통 천문도(천상열차분야지도) 모티브 설명문
  - 성좌 각성 시 용사 각성 대사 및 단위 테스트

### C1061 [system]: 십이지신 + 4대 영수 융합 공명(Zodiac-Pet Resonance) 엔진
- `src/systems/zodiacPetResonance.ts`:
  - 인(호랑이) 성좌 + 백호 동행 시: 호랑이의 포효 (물리 피해 +10%)
  - 진(용) 성좌 + 청룡 동행 시: 용의 천벌 (번개 피해 +10%)
  - 사(뱀) 성좌 + 현무 동행 시: 현무의 영겁 (피해 감소 +3%)
  - 오(말/새) 성좌 + 주작 동행 시: 주작의 비상 (행동속도 +10%)
  - 통합 테스트 작성 (`src/systems/zodiacPetResonance.test.ts`)

### C1062 [critic+collab]: C1062 종합 비평 및 마일스톤 결산
- 12지 성좌 및 영수 융합 공명 검증, 290+ 테스트 패스율 확인, 비평 보고서 발행
- `RESUME.md` v15 갱신
