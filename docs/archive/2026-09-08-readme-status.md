# README 이전 현황 — 역사 자료

상대 링크는 저장소 루트 기준이다. 현재 실행 지시가 아니다.

## 현재 상태

### V4 현재 baseline (2026-09-08)

- **기본 제품**: `신의 마을: 영원의 후원자` — `inflation-rpg` 경로에서 V4가
  실행된다. 로컬 우선 저장, 7개 시설, 3명 지원 에이전트, 3개 Realm,
  최대 8시간 offline progress를 포함한다.
- **보존 경로**: 기존 V3 `조선 인플레이션 RPG`는
  `inflation-rpg-legacy`와 `StartLegacyGame()`으로 분리되어 기존 저장 키를
  유지한다.
- **현재 검증**: game Vitest 400개 파일·3,638개 테스트, V4 E2E 32/32, game E2E 46/46
  (Chromium 23/23·iPhone14 23/23), dev-shell portal E2E 5/5, root test/typecheck/lint/circular/build 통과.

아래 Phase 및 자율진화 항목은 V4 이전에 누적된 V3 개발 이력이다.

- **Phase 0~1.5a** 완료. 모노레포 골격, `@forge/core` contract, dev-shell 포털.
- **Phase 2** 완료 (`phase-2-complete`). inflation-rpg 충실 클론 — React Shell +
  Phaser 전투, 16 캐릭터, BP 시스템, 장비 인벤토리, 14 월드맵 구역, 하드모드,
  Zustand store, 103 Vitest 테스트.
- **Phase 2.5** 완료 (`phase-2.5-complete`). 런 퍼시스트 + 레벨 게이팅.
- **Phase 3** 완료 (`phase-3-complete`). 메타 진행 — 캐릭터 레벨, 장비 슬롯
  확장(goldThisRun 소비), 장비 계승(런 간 유지), 상점·인벤토리 재설계.
- **Phase 4a** 완료. MobileUX Layer — safe area CSS, 44px 터치 타겟, overscroll
  잠금, Phaser Scale.FIT 반응형 캔버스, Playwright iPhone 14 E2E 테스트.
- **Phase 4b/4c, content-expansion, forge-ui-opus** 완료. SoundManager + 튜토리얼
  + 콘텐츠 5 Layer 확장 (몬스터 61 / 장비 41 / 보스 109 / 던전 / 스킬 32 / 퀘스트
  28 / 스토리 26) + Forge-UI shadcn registry.
- **Phase B-3/F-1/F-2-3/Balance/D/G/E/Compass/Realms** 완료. 던전 floor 진행 +
  Ascension + Enhance + skill progression + 균형 패치 + 수식어/effect-pipeline +
  성좌 (10 노드) + 유물/Mythic + 차원 나침반 + 5 던전 확장 + Phase E 부채 청산.
- **Phase 5** 완료 (`phase-5-complete`). Monetization 원스토어 single-market shell:
  AdMob (rewarded + banner), 원스토어 IAP 4 품목 (TS contract + web stub),
  MonetizationService facade, persist v14, 개인정보처리방침 GitHub Pages, AdFreeIndicator.
  원스토어 V21 Kotlin native wire와 compile 검증까지 반영했으며, 실기기 sandbox 결제·복원·환불 QA는 별도 세션이 필요하다.
- **자율진화 v1** (cycle-100-complete). 8 페르소나 (게임기획자 / 스토리작가 / QA /
  UI·UX / 게임비평가 / 레벨디자이너 / 웹리서처 / 무료에셋 조사관) + 룰 8 종 +
  100 cycle. narrative tone (age 6 tier × realm × 9 channel = ~1080) + lifecycle
  drama (자연사 + auto-rejuv) + run-resume + V3 정체성 (eternal hero idle sponsor).
- **자율진화 v2** 진행 중 (cycle-120-complete = 20/100). v1 의 4 페르소나 추가
  surface 후 N1 (Inflation Milestone VFX 8 tier) + N2 (Fate Roll + Boss Intro +
  Realm Fork mid-cycle decision) + N3 (Hall of Sagas + 즐겨찾기 + filter) + N4
  (Inflation Curve Chart SVG) 완성. N5 (Live Ops) carry-over. 룰 9 (카테고리
  균형) 도입.
- **자율진화 v2 cycle 101-200 완료** (`phase-cycle-200-complete` 후보, 2026-05-28).
  N1 VFX / N2 mid-cycle decision / N3 Hall / N4 SVG / N5 Live Ops 5 mega-phase
  + 룰 9 + 2 페르소나 surface fan-out + SeasonalModifier wire chain 8 분할 완성.
- 다음: **Phase 5a-1 실기기 QA** (원스토어 sandbox 결제·복원·환불), Phase 5b (Google Play),
  5c (App Store), 또는 v3 자율진화 (mega-phase HeroDecisionAI / EternalCodex 등).
- **사용자 prompted 100-cycle 진행 중** (cycle 156-255, 2026-05-27 시작). 8 페르소나
  fan-out (game-critic / story-writer / level-designer / web-researcher /
  asset-investigator / ui-ux-designer / game-planner / qa-engineer) 으로 매
  20 cycle 주기 surface. SeasonalModifier wire chain 8 분할 완성 (cycle 177
  player-felt landing). 진척 = `docs/superpowers/evolution/INDEX.md` + 매 10
  cycle `STATUS-YYYY-MM-DD-cycle-N.md`.
