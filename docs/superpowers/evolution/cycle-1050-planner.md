# Cycle 1050 Planner Roadmap (C1051–C1056)

## 주제: 영수 & 신수 동행 시스템 (Divine Beasts & Familiar Companions)

영웅의 환생과 시련 돌파를 보조하고, 인플레이션 전투에 다채로운 전략적 시너지를 더하는 영수(Pet/Familiar) 시스템을 구축합니다.

---

### C1051 [system]: 영수 부화 및 친밀도/성장 엔진
- `src/systems/petSystem.ts`:
  - 4대 영수 정의:
    - 백호(White Tiger): 물리/치명타 특화 (ATK & Crit Damage)
    - 청룡(Azure Dragon): 번개 속성 및 행동속도 특화 (SPD & Lightning DMG)
    - 주작(Vermilion Bird): 화염 속성 및 재생 특화 (HP Regen & Fire DMG)
    - 현무(Black Tortoise): 방어 및 피해 감소 특화 (DEF & Damage Reduction)
  - 영수 알(Pet Egg) 부화, 먹이 주기(골드/강화석), 친밀도(Bond Lv 1~10) 및 패시브 오라 계산
  - 단위 테스트 작성 (`src/systems/petSystem.test.ts`)

### C1052 [ui]: 영수 성소(Pet Sanctuary) 모달 UI
- `src/components/PetSanctuaryModal.tsx`:
  - 보유 영수 목록 및 현재 동행 영수(Active Companion) 선택 슬롯
  - 영수 레벨업, 친밀도 게이지, 동행 시 활성화되는 패시브 효과 프리뷰
  - `StatusModal.tsx`에 영수 성소 진입 탭/버튼 연동
  - 컴포넌트 테스트 작성 (`src/components/__tests__/PetSanctuaryModal.test.tsx`)

### C1053 [balance]: 영수 버프 시너지 & 시련 10층 보조 시뮬레이션
- `src/systems/petBalance.test.ts`:
  - 친밀도 레벨별 비용 곡선 및 오라 스탯 상승률 검증
  - 현무의 방어 오라를 장착했을 때의 시련 8~10층 생존 턴 시뮬레이션
  - 주작/청룡/백호 동행 시 DPS 증가폭 및 클리어 시간 단축률 검증

### C1054 [narrative]: 4대 신수 전승 및 동행 대화 플레이버
- `src/data/petFlavor.ts`:
  - 4대 신수의 탄생 설화 및 도감 설명
  - 전투 승리, 위기(체력 20% 이하), 레벨업 시 영수의 반응 대사
  - 단위 테스트 작성 (`src/data/__tests__/petFlavor.test.ts`)

### C1055 [system]: 필드 탐색 영수 자동 채집(Foraging) 연동
- `src/systems/petForaging.ts`:
  - 필드 이동/전투 승리 시 영수가 일정 확률로 강화석 파편 또는 희귀 약초 채집
  - `CycleControllerV2.ts` 전투 후 보상 처리 파이프라인 연동
  - 통합 테스트 작성 (`src/systems/petForaging.test.ts`)

### C1056 [critic+collab]: C1056 종합 비평 및 로드맵 갱신
- 영수 시스템 완성도 검증, 285+ 테스트 패스율 확인, 비평 보고서 발행
- `RESUME.md` v14 갱신
