# Phase V3-H — Depth + Polish (Sub-spec)

V3 (Eternal Hero, Idle Sponsor) 의 V3-DEF 직후 phase. user 가 V3-DEF 머지 직후 6건 피드백 + V3-DEF 머지 시점에 발견되지 않은 base 락 3-bug compound 해소.

V3-G (1만 시간 균형 패치) **이전에** V3-H 가 먼저 — gameplay 가 실제로 동작하지 않으면 (base 탈출 불가) 균형 측정 자체가 무의미.

## §1 Why — 사용자 피드백 6건 + 디버그 결과

### §1.1 사용자 피드백 (V3-DEF 머지 직후 실행 화면 검증)

1. **상태창 부재** — 현재 장비/스킬 상태 볼 수 없음. HUD = 이름/나이/직업/LV/HP/빛/재생/realm 만.
2. **시작의 들판 못 벗어남** — 한 cycle 동안 base 에서 sea 로 진행 안 됨.
3. **저장 후 이어하기 부재** — `포기 (cycle 종료)` 누르면 그냥 종료. 다시 시작 시 새 cycle. 영원 hero 모델에 맞지 않음.
4. **이벤트 단조로움** — 일대기 narration 이 "처치/성장" 위주. 10배속에서 숫자만 쭉쭉 늘어남.
5. **패배 시 레벨 다운 부재** — V3-B 회춘 디버프는 stat 만. 레벨 그대로.
6. **빛 HUD 조잡** — floating "+N" 들이 누적되며 텍스트 겹침. HUD layout 정리 필요.

### §1.2 디버그 결과 (50-cycle headless sim, V3-H pre-spec debug task)

`tsx scripts/sim-cycle-v2.ts --count 50 --max-arrivals 500` 결과:

- **base_boss kill rate**: 0/50 (sim 미와이어 — Bug C 의 증상)
- **base → sea unlock rate**: 0/50 (Bug A+B compound — live 게임도 동일)
- **`realm_unlocked` event**: 0개

**Root cause 3-bug compound:**

| Bug | 위치 | 증상 |
|---|---|---|
| **A** | `OverworldScene.unlockedRealms` | scene init 시 once read. boss kill 후 `ctrl.unlockedRealms` 가 'sea' 추가하지만 scene's copy stale → `DestinationResolver` 가 exit 영구 필터링 |
| **B** | `mapLayout.ts` T6 loop | `if (realm.id === 'base') continue` 로 base 의 exit landmark 가 안 깔림. base hero 는 갈 exit 자체가 없음. 더 일반화: 각 realm 의 exit 가 colEnd-1 (= 다음 realm 의 colStart-1) 에만 있어, 다음 realm 의 columnBounds 안에서만 reachable. base→sea exit 은 col 39 (sea 안). base columnBounds [0, 20) 로는 도달 불가 |
| **C** | `scripts/sim-cycle-v2.ts` | onBossKill 미와이어 + setCurrentRealmId 미호출. realm 진행 측정 불가. V3-G balance sweep 도 영향 |

V3-DEF 가 머지된 시점부터 base lock 이 존재. V3-DEF 의 E2E (`v3-def-multi-zone-npc-saga.spec.ts`) 는 'sea' unlock 까지는 검증 안 함 — 10s 가속 + 40s wait 만으로 NPC 모달 + saga viewer 까지만. 그래서 미발견.

## §2 Scope — 6 그룹 mega-phase

### Group A — Critical bug fixes (#2)

- **A1**: `OverworldScene.setUnlockedRealms(realms)` setter 추가. `OverworldRunner` 가 `realm_unlocked` event 발화 시 호출
- **A2**: 경계 col 양쪽 exit landmark (Bug B fix). col 19 = base→sea exit on base side, col 20 = base→sea exit on sea side. 같은 패턴으로 sea/volcano/underworld/heaven 의 모든 경계
- **A3**: `scripts/sim-cycle-v2.ts` — onBossKill + setCurrentRealmId 와이어 (Bug C). V3-G 의 sim 측정 가능

### Group B — Save model rework (#3)

- **B1**: `포기 (cycle 종료)` 버튼 제거. 그 자리에 `메인 메뉴로` 또는 `홈으로` 버튼 (자동 저장 후 메인 메뉴)
- **B2**: `OverworldRunner` mount 시 `meta.activeRunState` 가 있으면 자동 resume. 기존 V3-B/V3-C 의 run.* 필드는 이미 persist v21 에 저장됨 — 추가 schema 필요 없음
- **B3**: Cycle 자연 종료 (hero 의 isAlive=false 이면서 회춘 cooldown 없는 상태) 시 자동 회춘 prompt 또는 자동 회춘. 영원 hero 의미 강화

### Group C — Status panel (#1)

- **C1**: `StatusModal.tsx` — 현재 장비 (`meta.inventory`) + 학습 스킬 (`meta.skillsLearned`) + 스탯 (HP/atk/etc.) + 현재 buff 효과 (cap 적용 후) + 직업 + 캐릭터 정보
- **C2**: HUD 에 `상태 (📊)` 버튼 + StatusModal mount

### Group D — HUD polish (#6)

- **D1**: Floating "+N" animation cleanup — max 3 concurrent, position offset, fade-out 명확, HUD 텍스트 위로 겹치지 않게 z-index/position 분리
- **D2**: HUD layout 재배치 — 1줄 → 2줄 또는 정렬 정리. 빛/재생/realm/메뉴 button들 의 hierarchy

### Group E — Death penalty (#5)

- **E1**: `HeroEntity.die()` 또는 동등 위치에서 `level = max(1, Math.floor(level * 0.90))`. -10% 다운
- **E2**: `hero_died` saga event 의 narrative text 에 "[X→Y] 레벨이 떨어졌다" 명시 + SagaBookModal 의 표시

### Group F — Content variety (#4)

- **F1**: Narration variety — 기존 event narration text 를 각 event 마다 5-10개 변형 + RNG 선택. battle/levelUp/drop/shrine/moralChoice 모두
- **F2**: Non-combat event 빈도 — shrine + drop rate 조정 (V3-DEF placeholder 에서 살짝 ↑). NPC encounter는 V3-DEF 의 20% 유지
- **F3**: 새 event type `sightseeing` (관광) — 특정 landmark (절경/historical site) 도달 시 발화. personality dim +1 (랜덤) + 소액 XP. cycle 당 1-2회 트리거
- **F4**: 새 event type `meditation` (명상) — Shrine 의 상위 변형. pious +3, HP 완전 회복, age +0.5. shrine 의 20% 확률로 meditation 형태
- **F5**: 새 event type `trial` (시련) — special encounter. field level × 2 인 적. 승리 시 LV +3 + special drop. 패배 시 더 큰 penalty (-15%). cycle 당 1회 (장년기 이후)
- **F6**: 새 event type `season` (계절변화) — hero age 기반 배경 변화. spring/summer/fall/winter cycle. 보너스 효과: spring=light_rate +10%, summer=atk +5%, fall=drop +10%, winter=damping -5%. UI 표시 HUD 또는 OverworldScene 배경 tint

## §3 Architecture

### §3.1 새 파일

- `games/inflation-rpg/src/screens/StatusModal.tsx` — C1
- `games/inflation-rpg/src/data/landmarks-sightseeing.ts` — F3 의 절경 landmark types
- `games/inflation-rpg/src/season/SeasonState.ts` — F6
- `games/inflation-rpg/src/data/narrationVariants.ts` — F1 의 text variants

### §3.2 수정 파일

- `games/inflation-rpg/src/overworld/OverworldScene.ts` — A1 (setUnlockedRealms), F6 (season bg tint)
- `games/inflation-rpg/src/screens/OverworldRunner.tsx` — A1 (event listener), B1 (button rename), C2 (status button), D1+D2 (HUD redesign)
- `games/inflation-rpg/src/overworld/mapLayout.ts` — A2 (양쪽 경계 exit), F3 (sightseeing landmark 배치)
- `games/inflation-rpg/src/data/landmarks.ts` — F3 의 새 landmark types
- `games/inflation-rpg/src/overworld/CycleControllerV2.ts` — F3 (sightseeing event emit), F5 (trial event), F6 (season tick)
- `games/inflation-rpg/src/hero/HeroEntity.ts` — E1 (die level decrement)
- `games/inflation-rpg/src/saga/SagaRecorder.ts` 또는 `SagaTypes.ts` — F1 (narration variant lookup), F3-F6 (새 SagaEventType union 추가)
- `games/inflation-rpg/src/store/gameStore.ts` — B2 (resume detection), F6 (season state), persist v21→v22
- `games/inflation-rpg/src/overworld/cycleSliceV2.ts` — B3 (auto rejuv on cycle end)
- `games/inflation-rpg/src/screens/SagaBookModal.tsx` — F3-F6 (새 event filter 칸)
- `scripts/sim-cycle-v2.ts` — A3

### §3.3 Persist v21 → v22

`migrateV21ToV22(persisted)` 가 주입:
- `meta.season = { current: 'spring', startedAtAge: 0 }` (F6 의 초기 시즌)
- 기타 schema 추가 없음 (F1-F5 는 schema 안 바꿈)

V3-H 의 v22 migration 도 idempotent.

### §3.4 새 SagaEventType

`'sightseeing' | 'meditation' | 'trial' | 'season_change'` 4종 추가. 기존 SagaEventType union 에 append.

### §3.5 Save model 변경 (B 그룹)

**Before (V3-DEF):**
- `포기` 버튼 = cycle 명시 종료. run state reset.
- 새 cycle 시작 = 새 run.

**After (V3-H):**
- `포기` 버튼 = 폐지. 그 자리에 `메인 메뉴 (자동 저장)` 버튼.
- 앱 닫기 / 메뉴로 이동 = persist v22 의 run.* 가 그대로 보존.
- 메인 메뉴에서 "이어하기" 선택 → `OverworldRunner` mount → 기존 cycle 자동 resume.
- Hero 사망 = 자동 회춘 prompt (또는 자동 회춘 5년).

이 모델은 V3-B 의 "영원 hero" 컨셉을 완성하는 형태. cycle 자체가 "끊임없이 이어지는 인생" 이라는 정체성 강화.

## §4 결정 사항 요약 (user-confirmed)

1. **V3-H = single mega-phase** — 6건 모두 다룸. ~17-20 task.
2. **Save model = 자동 이어하기** (B 그룹). 포기 버튼 폐기.
3. **Bug B fix = 경계 col 양쪽 exit** (A2). col 19 + col 20 양쪽에 exit landmark 배치. 같은 패턴으로 모든 realm 경계.
4. **Death penalty = -10% level** (E1). `level = max(1, floor(level * 0.90))`.
5. **새 event types = 4종 모두** (F3-F6). 관광 + 명상 + 시련 + 계절변화.

## §5 Testing

- TDD for pure helpers: `computeFieldDamping` (V3-DEF) 패턴 재사용. F5 trial encounter 의 risk/reward 수식, F6 season 의 cycle 주기 helper 등.
- E2E: `v3-h-depth-polish.spec.ts` — base→sea 전환 검증 (Bug A+B fix 의 핵심), 상태창 open/close, 시즌 표시.
- Sim regression: V3-H 후 50-cycle sim 에서 base → sea unlock rate > 70% 목표 (Bug C 와이어 후 측정 가능).

## §6 위험

- **R1**: Bug B 의 양쪽 경계 exit 가 hero AI 의 destination scoring 에 영향. 양쪽 다 후보로 들어가면 어느 쪽 선택할지 — 가까운 쪽 prefer 가 자연스러움 (현재 distance-based heuristic 이미 있음).
- **R2**: F1 narration variants 가 너무 많아지면 i18n / 유지비. 5-10개 / event 가 합리적 상한.
- **R3**: F5 trial 의 difficulty (field level × 2) 가 V3-DEF 의 damping 와 곱해지면 매우 어려움. floor(1) 가드 (T11) 가 무한루프 방어하지만 게임적으로는 패배 가능성 매우 ↑. **의도된 어려움** — 시련은 risk-reward.
- **R4**: F6 season 의 보너스 효과 (atk +5% 등) 가 buff catalog 와 multiplicative — 균형 V3-G 에서 재검토.
- **R5**: B 의 save model 변경이 기존 E2E (full-game-flow, v3-c-spend-modal, v3-def-multi-zone-npc-saga) 에서 `포기` 버튼 의존 시 깨짐. E2E 갱신 필요. `v9-migration` 의 v22 bump 도 필요.

## §7 다음 = V3-G

V3-H 완료 후 V3-G (1만 시간 균형 패치) 진행. V3-G 에서 sim sweep 으로 buff catalog magnitude / realm level range / death penalty 등 모든 magnitude 재측정.
