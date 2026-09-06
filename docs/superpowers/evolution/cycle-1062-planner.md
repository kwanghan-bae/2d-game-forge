# Cycle 1062 Planner Roadmap (C1063–C1068)

## 주제: 성광 연금술 & 천상 보구 시스템 (Celestial Astral Alchemy & Star Relics)

잉여 보스 전리품과 장비를 별빛 파편(Starlight Shards)으로 분해·정제하고, 전통 도가 단학(丹學)에 기반한 4대 천상 영약을 연성하여 용사의 근원 스탯을 한계 돌파하는 연금술 및 소켓 보구 시스템을 구축합니다.

---

### C1063 [system]: 천상 성광 연금술 & 별빛 파편 합성 엔진
- `src/systems/astralAlchemy.ts`:
  - 장비 및 보스 전리품 분해를 통한 '별빛 파편(starlightShards)' 추출
  - 4대 천상 영약 정의:
    - 태양의 환약(Solar Pill): 영구 공격력 +2% (최대 10회 복용)
    - 월광의 영액(Lunar Elixir): 영구 최대 체력 +2% & 방어력 +2% (최대 10회 복용)
    - 뇌전의 결정(Lightning Crystal): 영구 행동속도 +1 & 치명타율 +1% (최대 10회 복용)
    - 심연의 정수(Abyssal Essence): 영구 속성 공명 피해 +2% & 받는 피해 감소 +0.5% (최대 10회 복용)
  - 단위 테스트 작성 (`src/systems/astralAlchemy.test.ts`)

### C1064 [ui]: 성광 연금술 가마(Astral Alchemy) 모달 UI
- `src/components/AstralAlchemyModal.tsx`:
  - 연금술 화로 및 가마 인터페이스
  - 파편 추출(분해) 탭 및 영약 연성(Crafting) 탭
  - 현재 복용 횟수 게이지 및 영구 스탯 누적치 프리뷰
  - 컴포넌트 테스트 작성 (`src/components/__tests__/AstralAlchemyModal.test.tsx`)

### C1065 [balance]: 연금술 경제 & 영약 스탯 한계 돌파 시뮬레이션
- `src/systems/alchemyBalance.test.ts`:
  - 파편 수급 곡선 및 40회 만복용(Soft Cap) 달성 소요 사이클 시뮬레이션
  - 풀 복용 시 시련 10층 클리어 안정성 및 TTK 턴수 비교 검증

### C1066 [narrative]: 전통 도가 연단술 비전서 및 제조 플레이버
- `src/data/alchemyFlavor.ts`:
  - 삼선(도사·선인·무당) 비전 연단술 고서 설화
  - 영약 복용 시 용사의 신체 변화 묘사 대사 및 단위 테스트

### C1067 [system]: 천상 보구(Celestial Star Relics) 무구 소켓 각인 엔진
- `src/systems/celestialRelics.ts`:
  - 무기/방어구에 별빛 소켓(Socket) 천공 및 성광 보석 장착
  - 단위 및 통합 테스트 작성 (`src/systems/celestialRelics.test.ts`)

### C1068 [critic+collab]: C1068 종합 비평 및 로드맵 갱신
- 연금술 & 보구 시스템 완성도 검증, 298+ 테스트 패스율 확인, 비평 보고서 발행
- `RESUME.md` v16 갱신
