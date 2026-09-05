# Cycle 1020 Planner Roadmap (C1021–C1026)

## 목표: 퍽 트리 2티어 확장 및 장비-퍽 시너지 구축

### C1021 [system]: 2티어 심화 퍽 4종 설계
- `crit_cascade` → `crit_mastery`: 크리티컬 발생 시 치명타 피해 +50%
- `boss_bounty` → `boss_slayer`: 보스 상대 공격력 +25%
- `gold_interest` → `wealth_barrier`: 보유 골드 비례 방어막 (골드 1만당 받는 피해 1% 감소, 최대 30%)
- `drop_luck` → `relic_affinity`: 레릭 획득 확률 +20% 및 드롭 업그레이드 가속
- `jpPerks.ts` 정의 및 `canPurchasePerk` 선행 조건 체인 검증 테스트

### C1022 [ui]: PerkShop 화면 2티어 트리 UI 고도화
- `PerkShopScreen.tsx`에 Tier 1(기초 퍽)과 Tier 2(심화 퍽) 섹션 분리
- 선행 조건 미충족 퍽에 잠금 아이콘(`🔒`) 및 "필요: [선행 퍽 이름]" 툴팁/안내 표기

### C1023 [system]: 2티어 퍽 효과 전투 엔진 실전 바인딩
- `EncounterEngine.ts`에 `crit_mastery` 치명타 피해 배율, `boss_slayer` 대 보스 공격력, `wealth_barrier` 골드 비례 대미지 감쇄 연동
- 전투 단위 테스트 작성

### C1024 [balance]: 시뮬레이션 기반 JP 경제 밸런스 검증
- `sim-cycle-v2.smoke.test.ts` 및 headless simulation을 통해 10사이클, 50사이클 기준 JP 획득 곡선 검증
- Tier 2 퍽의 가격 대비 효율 인밸리언트 가드레일 작성

### C1025 [narrative]: 퍽 해금 및 특수 상황 캐릭터 리액션
- `characterReactions.ts`: 퍽 해금 시 캐릭터들의 감탄 대사 및 1회 부활 시 캐릭터별 투혼 대사 추가

### C1026 [critic+collab]: C1026 마일스톤 비평 및 다음 Phase 확정
- C1026 비평 리포트 발행 및 다음 메가 페이즈 준비
