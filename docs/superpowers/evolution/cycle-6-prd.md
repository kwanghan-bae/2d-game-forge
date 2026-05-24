# Cycle 6 PRD — Run Resume + Saga Snapshot

## 한 줄

Cycle 5 가 stale realm bug 를 해소한 후 드러난 두 새 약점 — (P0) reload 시 활성 cycle 증발, (P1) sagaHistory 4건 빈 카드 — 묶어서 fix. 둘 다 store↔UI 동기화 부재가 root.

정찰 보고: agent `a4c195a517cc880de` (`/Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/screen-01..08-*.png`).

## P0 — Reload 시 활성 cycle 증발

### 정찰 finding

- 4분 게임 진행 (LV 813006) 후 page reload → 메인 메뉴가 "사이클 이어가기" 안 보여줌, "새 사이클 시작" 만.
- store 에는 `runActive: true` (또는 동등 flag) + run state 가 persist 되어 있음에도 UI 가 이 flag 를 안 읽음.
- 모바일 idle 게임에서 앱 전환 빈도 높아 결정적 약점.

### Root cause 추정 (implementer 가 분석)

- MainMenu / AppRouter 의 boot 분기에서 `runActive` flag 미체크
- 또는 cycle 5 의 v23 migration 이 `runActive` 까지 초기화시켰을 가능성 (`run.currentRealmId` reset 만 의도였는데 over-reset)
- 또는 OverworldRunner 의 mount 가 `startCycle()` 을 호출해야 하는데, MainMenu 에서 진입 안 하면 영영 mount 안 됨

implementer 가 grep + cycle 4-5 commit history 분석 후 1-line / N-files fix 결정.

### 수용 기준

- (a) 4분 진행 → reload → MainMenu 가 "사이클 이어가기" 버튼 (또는 자동 재진입) 노출
- (b) "사이클 이어가기" 클릭 → 직전 LV/age/realm/HP/idle progress 로 복귀 (LV 1 reset 아님)
- (c) Playwright e2e: localStorage 에 `runActive: true` + 임의 LV 1000 hero state → reload → 메뉴 "이어가기" visible → 클릭 → hero LV 1000 시작
- (d) Unit: store 의 `runActive: true` 일 때 MainMenu selector 가 "이어가기" 분기 반환

## P1 — sagaHistory 빈 카드

### 정찰 finding

- 누적 사가 4건 (cycle 4 finisher 가 본 5세 자연사 3 + cycle 5 정상 진행 1)
- 각 sagaHistory[] item 의 finalLevel/finalAge/finalRealm/deathCause/finishedAt 가 **전부 undefined**
- "누적 사가: 4" 라벨은 보이지만 saga book 진입 시 빈 4 카드

### Root cause 추정

- `endCycle()` 의 saga snapshot builder 가 누락 field 채우지 못함
- 또는 sagaHistory append 시 hero state 가 이미 cleared 되어 finalLevel 등 못 읽음 (race condition)
- 또는 v23 migration 이 sagaHistory[] item 의 기존 field 까지 초기화

### 수용 기준

- (a) 새 cycle 종료 → sagaHistory 의 새 item 에 finalLevel/finalAge/finalRealm/deathCause/finishedAt **모두 정의됨**
- (b) Saga book UI 가 카드에 LV/age/realm/cause 표시
- (c) Unit: `endCycle('자연사')` → 마지막 sagaHistory[] item 의 finalLevel === store.hero.level, finalAge === store.hero.age, finalRealm === 'base' (cycle 5 fix 적용 전 currentRealmId), deathCause === '자연사', finishedAt === Date.now() ± 1s
- (d) 기존 4 stale item 은 그대로 (retroactive migration 안 함 — scope 외)

## F4 (deferred to cycle 7) — Pathfinder fallback retry

cycle 5 가 root 해소했고, fallback 은 사후 안전망이라 우선순위 낮음. cycle 7 carry-over.

## Prod runtime 정찰 (carry-over c)

Cycle 6 의 fix 후 finisher 가 Playwright 로 prod 빌드 1 회 정찰. console error 0 + reload resume 동작 확인.

## 머지 가드

- typecheck/lint: PASS
- vitest: 1138 baseline + 신규 (P0 2+ + P1 2+ = 4+)
- circular: baseline 1 (회귀 0)
- Playwright reload 시나리오 + prod 빌드 정찰
- 사용자 보고 회귀 0 (cycle 5 fix 의 stale realm 재현 X — F1 회귀 가드)

## Phase G self-check 예상

- 약점 고갈: ✗ (cycle 7 carry-over F4 + a 잔존 + D1-D7)
- 3 연속 같은 1순위: cycle 0 saturation → 1 variance → 2 process → 3 prefix bug → 4 polish → 5 game-breaking bug → **6 store↔UI 동기화**. 모두 다른 카테고리.
- 자원 추정: cycle 5 보다 살짝 큼 (P0 의 root cause 가 implementer 분석 필요). 한 implementer + finisher 로 가능.

## Cycle 7+ carry-over

- F4 pathfinder fallback (사후 안전망)
- sagaHistory 기존 4 stale item retroactive cleanup (UI 또는 migration)
- realm 정체 (10× 4분에 `🌍 폭풍의 바다 (3/6)` stuck) — Stage progression 의 rate 문제? Cycle 8+
- 학습 스킬 1개 / 신의 가호 0 / 장비 0/1 의 surface 빈약 — V3 정체성 vs 실제 cycle 진행 mismatch (Cycle 8+ content/balance)
- D1-D7 backlog (priest saturator 등)
- run.* field 의 stale cleanup 전수 검토
