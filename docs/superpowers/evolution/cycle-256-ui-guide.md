# Cycle 256 UI/UX Guide — `forNpcDeath` kind 분기 의 표시 경로 trace + chain 258 carry-over 권장

> 평가 대상: cycle 256 의 F1 = `forNpcDeath` kind-aware 분기. **UI 변경 0 cycle**.
> 본 guide 의 톤 = *advisory* — cycle 256 자체에 UI 작업을 끼우지 않는다 (PRD §F1.5
> "sim parity 미적용 사유" + 변경 surface 추정의 UI 파일 0 준수). 본 guide 의 권장은
> **chain 258 (NATURAL_DEATH_VARIANTS + composition) 의 분할 carry-over** 와
> **cycle 261+ visual hierarchy 부채 cleanup** 후보로 분리.

## 한 줄 요약

- F1 fix 는 데이터 분기 (Record by 6 kind). 시각 표시 변경 0. 단, fix 후
  narration text 가 *어디로 흐르는지* 의 표시 경로 3 곳은 추적 의무 — 본 guide §1.
- **발견 1 (asymmetry, V3 정체성 직접 손상)**: 영웅 사망 `death` = `#f87171` (살구
  빨강), NPC 사망 `npcDeath` = `eventColor` default `#cbd5e1` (회색). V3 의
  *eternal hero × 인간 NPC 시간 비대칭* narrative 가 *시각 위계 부재* 로 평탄화.
  cycle 256 본인 scope 밖, **chain 258 묶음 후보** (NATURAL_DEATH 와 같은 carry-over).
- **권장 (carry-over)**: NPC kind 6 종 시각 위계 = **emoji prefix (kind 정체성) +
  색 그룹 4 종** (rival / mentor / friend / family-{parent,spouse,child} 묶음).
  Hick's Law 6→4 그룹화. emoji 가 deuteranopia/protanopia colorblind-safe 채널.

## 영향 화면

- **OverworldRunner** (`games/inflation-rpg/src/screens/OverworldRunner.tsx:714-726`) —
  실시간 event-log panel. `logRowStyle(eventColor(ev.type))` 로 color 분기. **현재
  npcDeath default 회색 처리** (line 762).
- **CycleResultV2** (`games/inflation-rpg/src/screens/CycleResultV2.tsx:46-58`) —
  사이클 종료 후 chapter 별 narrative list. 색 분기 없음 (모두 평문 13px lineHeight 1.7).
- **SagaBookModal** (`games/inflation-rpg/src/screens/SagaBookModal.tsx:112-117`) —
  EternalSaga 영구 기록. era 별 묶음, filter 칩 12 종. **`npc` filter 가 이미
  npcDeath cover** (line 35-39) — F1 fix 후에도 누락 없음 (사전 grep 확정).

기타 (MainMenu / SeasonPassScreen / Battle / Inventory / Shop / HallScreen) 무영향.

---

## 1. F1 fix 의 UI 영향 분석 — emit 경로 trace

### 1.1 emit 3 곳 (`CycleControllerV2.ts`)

| line | 호출 컨텍스트 | F1 fix 후 추가 인자 |
|---|---|---|
| **550** | NPC tick 루프 — `wasAlive && !npc.isAlive` 자연사 검출 | `kind: npc.kind` |
| **831** | season change 루프 — 같은 자연사 검출 (다른 trigger path) | `kind: npc.kind` |
| **1334** | (carry-over path, 같은 패턴) | `kind: npc.kind` |

세 emit 모두 `recordToStore({ type: 'npcDeath', narrativeText, payload: { npcInstanceId, kind } })` 형식.
payload 에 `kind` 가 **이미 전달**되고 있다 (line 554 사전 검증). 하지만 narrativeText
생성 시점의 `forNpcDeath(opts, seed)` 는 `kind` 를 받지 않아 *데이터는 흘러가지만
text 가 무작위* 인 split — 본 F1 의 핵심 bug.

### 1.2 표시 3 곳

#### (a) OverworldRunner event-log — 실시간 표시

```
┌─ event-log panel (line 714) ─────────────────────┐
│ 최근 일대기                                       │  ← logHeaderStyle (11px, opacity 0.5)
│ ┃ 47세 ───강자 검사가 강한 일격에 패배           │  ← battle: #fca5a5
│ ┃ 47세 ───드롭: 빛의 가호                        │  ← drop: #a7f3d0
│ ┃ 48세 ───??? 침대에서 일어나지 못했다           │  ← npcDeath: default #cbd5e1
│ ┃ 48세 ───레벨 142,000 돌파                      │  ← levelUp: #fde68a
│ ┃ 49세 ───빛의 다리 너머로 사라졌다              │  ← death: #f87171
└──────────────────────────────────────────────────┘   maxHeight 220, autoScroll bottom
```

- 색 분기: `eventColor(ev.type)` switch (line 752-764). npcDeath → `default: #cbd5e1`.
- 행 구조: `logRowStyle(color)` = `borderLeft: 2px solid ${color}55` + `paddingLeft: 8`.
- F1 fix 후: rival 사망 시 행 안의 *어휘* 가 정합 (`라이벌의 마지막 칼은 자신의
  것이었다`). 색은 여전히 회색 — 발견 1 의 asymmetry.

#### (b) CycleResultV2 result-narrative-list — 사이클 종료 직후

```
┌─ result-narrative-list (line 47) ────────────────┐
│ — 어린시절 —                                      │  ← italic, opacity 0.7
│   12세에 처음으로 빛을 보았다                     │
│   14세에 멘토를 만났다                            │
│   18세에 멘토가 침대에서 일어나지 못했다          │  ← 색 분기 0, 모두 평문
│ — 청년기 —                                        │
│   23세에 라이벌이 등장했다                        │
│   34세에 라이벌의 마지막 칼은 자신의 것이었다     │
│   ...                                             │
└──────────────────────────────────────────────────┘   maxHeight 320, overflowY auto
```

- F1 fix 의 *경제 효과*: chapter 별 narrative 의 *키워드 정합* — `멘토` 챕터
  키워드와 mentor 사망 어휘가 같은 era 안에서 conflict 없이 흐름. legacy 의 *3개
  중 1개 랜덤* 으로 인한 키워드 mismatch (예: rival era 에 "멘토가 침대에서") 가
  해소.

#### (c) SagaBookModal saga-event — EternalSaga 영구 기록

```
┌─ saga-modal (560×88vh) ──────────────────────────┐
│ 인생의 기록            재생 #3              ✕    │
│ [전체][전투][획득][성장][★폭발][영지][인연]...   │  ← filter 칩 12 (44px height)
│ ┌────────────────────────────────────────────┐   │
│ │ 어린시절-1 ────────────────────────────    │   │  ← 14px bold, borderBottom 1px
│ │ │ 12세  처음으로 빛을 보았다               │   │  ← 12px #ccc, borderLeft 2px #444
│ │ │ 14세  멘토를 만났다                      │   │
│ │ │ 18세  멘토가 침대에서 일어나지 못했다    │   │
│ │ 청년기-1 ──────────────────────────────    │   │
│ │ │ 23세  라이벌의 마지막 칼은...            │   │
│ └────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

- `npc` filter (line 35-39) = moralChoice + shrine + npcEncounter + npcDeath +
  familyEvent. **F1 fix 의 신규 npcDeath kind 분기 어휘는 이 filter 에서 그대로
  surface** — 누락 없음.
- 색 분기 없음 (모두 `#ccc` 12px borderLeft `#444`). race-condition free.

### 1.3 결론

F1 fix 후의 narrativeText 흐름:

```
forNpcDeath({age, kind, realm}, seed)        ← F1 fix 진입점
  → NarrationVariants.npcDeath(ctx)          ← 신규 method 위임
    → pick(NPC_DEATH_VARIANTS_BY_KIND[kind]) ← Record by 6 kind
    → ageTone → realmTone composition        ← cycle 258 chain stage 의 일부
  ↓ string 반환
recordToStore({type:'npcDeath', narrativeText, payload:{kind,npcInstanceId}})
  ↓ saga store 에 적재
┌──────────┴──────────┬─────────────────┐
↓                     ↓                 ↓
OverworldRunner     CycleResultV2     SagaBookModal
event-log           result-narrative   saga-event
실시간 (220px)      세션 종료 (320px)  영구 (88vh)
색 분기 ✓           색 분기 ✗          색 분기 ✗
                                       filter 'npc' ✓
```

**UI 작업 0** — F1 fix 의 모든 변경이 데이터 레이어. 본 guide 의 §2-3 권장은 **chain
258 또는 cycle 261+ carry-over** 후보.

---

## 2. NATURAL_DEATH_VARIANTS 1 → 5 (chain 258) 의 표시 wireframe

PRD chain 258 stage = `forDeath` cause='natural' 의 NATURAL_DEATH_VARIANTS 풀
1 → 5 확장 + composition pipeline 적용. **본 guide 의 wireframe 권장 = "행 자체의
시각 강조"** — V3 idle 죄책감 룰 (interaction blocking 금지) 준수.

### 2.1 자연사 모먼트의 visual emphasis (행 단위)

```
┌─ event-log (현재 chain 258 적용 후) ─────────────┐
│ ┃ 97세 ───강자 검사가 강한 일격에 패배           │  battle: #fca5a5
│ ┃ 98세 ───레벨 145,000 돌파                      │  levelUp: #fde68a
│ ┃ 99세 ───드롭: 영원의 빛                        │  drop: #a7f3d0
│ ╔═══════════════════════════════════════════════╗ │
│ ║ ★ 102세 ─ 마지막 호흡으로 빛의 다리를 건넜다  ║ │  ← death: emphasis row
│ ╚═══════════════════════════════════════════════╝ │
└──────────────────────────────────────────────────┘
```

- 강조 형식 = `borderLeft: 3px solid #f87171` (현재 2px) + `paddingTop: 6px` +
  `paddingBottom: 6px` + `fontStyle: italic` + `★` prefix.
- emotional pause = *interaction* 차단 (modal/freeze) 아님. *행 자체의 호흡감* —
  주변 행 12px line 대비 사망 행은 ~24px 영역.
- 자연사 5 variant 가 각각 다른 어휘 = "마지막 호흡으로 빛의 다리를 건넜다"
  / "잠든 채로 새벽을 만나지 못했다" / "가장 깊은 미소를 끝으로 눈을 감았다" 등.
  composition: `pick(NATURAL_DEATH_VARIANTS_5) → ageTone(70+) → realmTone`.

### 2.2 *modal 형 emotional pause overlay 권장하지 않음*

자연사 = 사이클 종료 trigger 직전 (`CycleControllerV2:723` 의 `forDeath` 호출
직후). modal overlay 띄우면:

- V3 idle hero 의 *플레이어 개입 0* 원칙 위배.
- 곧이어 `<CycleResultV2>` (chapter 별 narrative + 인플레이션 곡선) 전체 화면 전환
  발생 — *2 modal back-to-back* 의 cognitive 부담.

대신 event-log 의 *행 단위 강조* 로 honor. CycleResultV2 의 chapter 별 list 에서도
death 행 1 줄을 같은 italic + `★` prefix + `color: #f87171` 로 통일 권장 (cycle 261+).

---

## 3. NPC death narration 의 visual hierarchy — 6 kind 시각 위계 권장

발견 1 의 asymmetry (영웅 사망 #f87171 vs NPC 사망 회색) 해소 + 6 kind 정체성을
*colorblind-safe* 채널로 구별. **cycle 256 본인 scope 밖, chain 258 묶음 또는
cycle 261+ carry-over.**

### 3.1 emoji prefix + 색 그룹 4 (Hick's Law 6→4)

```
┌─ event-log row 변형 (권장, chain 258 또는 261+) ─┐
│ ┃ 47세 🗡 ─ 라이벌의 마지막 칼은 자신의 것이었다 │  rival:  #fdba74 (호박)
│ ┃ 52세 📜 ─ 멘토가 침대에서 일어나지 못했다     │  mentor: #c4b5fd (보라)
│ ┃ 58세 🤝 ─ 친구의 부고를 멀리서 들었다         │  friend: #a7f3d0 (민트)
│ ┃ 64세 🏠 ─ 부모님이 마지막 미소로 떠났다       │  family: #fbcfe8 (분홍)
│ ┃ 71세 🏠 ─ 반려가 ... 영웅의 회춘이 죄스러웠다  │  family: #fbcfe8 (분홍)
│ ┃ 78세 🏠 ─ 자식이 늙어 떠났다 ...              │  family: #fbcfe8 (분홍)
└──────────────────────────────────────────────────┘
```

- **emoji = kind 정체성** (deuteranopia/protanopia colorblind-safe). NpcEntity 의
  `emoji: string` field (types.ts:198 이미 존재) 가 *그대로* 채널.
- **색 4 그룹** (Hick's Law) — Visual hierarchy 의 동시 식별 한계 5 ± 2 의 안전치:
  | 그룹 | kind | 색 token (제안) | 어휘 톤 |
  |---|---|---|---|
  | 적대 | rival | `#fdba74` 호박 | 칼 / 검 / 대결 |
  | 사제 | mentor | `#c4b5fd` 보라 | 가르침 / 침대 / 마지막 강의 |
  | 우애 | friend | `#a7f3d0` 민트 | 부고 / 거리감 / 이름 모름 |
  | 가족 | family_parent + family_spouse + family_child | `#fbcfe8` 분홍 | 회춘 비대칭 / 죄스러움 / 시간의 잔혹 |
- **family 3 종 묶음 이유**: V3 "eternal hero × 인간 NPC" 비대칭의 *narrative 임팩트*
  가 가족 3 종 공유 (회춘하는 영웅 vs 늙는 가족). 그룹화로 player 가 "가족 죽음"
  카테고리를 한 눈에 묶어서 인식.

### 3.2 색 token 의 theme-modern-dark-gold 정합

위 4 색은 *제안 색*. 실제 도입 시 `packages/registry/themes/theme-modern-dark-gold/`
의 token namespace 확장 — `--color-saga-npc-rival`, `--color-saga-npc-mentor`,
`--color-saga-npc-friend`, `--color-saga-npc-family`. raw hex 금지.

### 3.3 OverworldRunner.tsx eventColor 확장 (chain 258 또는 cycle 261+)

```ts
// 현재 (line 752-764)
function eventColor(type: SagaEvent['type']): string {
  switch (type) {
    case 'battle':       return '#fca5a5';
    // ...
    case 'death':        return '#f87171';
    default:             return '#cbd5e1';   // ← npcDeath 가 여기 빠짐
  }
}

// 권장 — kind 추가 인자 또는 별도 함수
function eventColor(ev: SagaEvent): string {
  if (ev.type === 'npcDeath') {
    const kind = ev.payload?.kind as NpcEntity['kind'] | undefined;
    if (kind === 'rival')  return 'var(--color-saga-npc-rival)';
    if (kind === 'mentor') return 'var(--color-saga-npc-mentor)';
    if (kind === 'friend') return 'var(--color-saga-npc-friend)';
    if (kind && kind.startsWith('family_')) return 'var(--color-saga-npc-family)';
  }
  // ... 기존 switch
}
```

**중요**: payload.kind 는 *F1 fix 이전에도 이미 전달* (CycleControllerV2:554
사전 확인). 즉 이 §3.3 권장은 F1 fix 와 *독립* — F1 와 같이 묶지 않아도 OK.
chain 258 의 `pickClaimNarration` composition stage 와 묶거나, cycle 261+ 별도
cleanup cycle 로 가져가는 게 PRD 의 *scope discipline* (메타-rule 3 = M===N
표현 정확성) 에 정합.

---

## 4. Accessibility 체크

### 4.1 알림 줄 fade-out timing

- event-log = `maxHeight: 220` overflow auto. 새 행 추가 시 *fade* 없이 즉시 append.
  현재: OK (motion-safe = scroll snap 자연스러움).
- **권장 0** — fade animation 추가는 *reduced-motion* 토글과 양쪽 keyframe 필요.
  비용 대비 효과 낮음. 행 단위 시각 강조 (§2.1 의 `★` prefix + italic) 로 대체.

### 4.2 자연사 모먼트의 emotional pause

- §2.2 명시: modal overlay 권장하지 않음. 행 단위 *호흡감* 으로 honor.
- aria-live: event-log panel 전체에 `aria-live="polite"` + `role="log"` 권장 (cycle
  261+). 현재 부재 — screen reader 가 새 narrative 를 실시간 감지하지 못함.
- 자연사 행에 `role="status"` + `aria-label="${age}세 자연사. ${narrative}"` —
  screen reader 가 *정상 흐름과 구별* 발화. cycle 261+ carry-over.

### 4.3 NPC kind 의 색맹 친화

- **emoji prefix (🗡 / 📜 / 🤝 / 🏠) = 1차 채널**. deuteranopia / protanopia /
  tritanopia 모두 emoji glyph 의 윤곽으로 kind 인지 가능.
- **색 4 그룹 = 2차 redundant 채널**. emoji + 색 = WCAG 2.1 SC 1.4.1 (Use of
  Color) 통과. 색 단독으로 정보 전달 금지 원칙 준수.
- **family 3 종 동일 색 + 동일 emoji 의 구별** = *어휘* 로만 (parent: "부모님이",
  spouse: "반려가", child: "자식이"). screen reader 와 색맹 모두 어휘 의존 — F1
  fix 의 kind 별 어휘 정합이 *accessibility 기반*.

### 4.4 44px 터치 타겟

- event-log = 표시 전용 (tap 없음). 44px 무영향.
- saga-modal filter 칩 12 종 (line 76-87) = padding 4+4=8 + line ~12 = ~20px
  effective. **이미 cycle 156 ui-guide 의 부채 명단에 있는 항목** (saga-modal 의
  filter 칩 contrast/44px). 본 guide §3 의 색 토큰 도입과 *동시 cleanup* 후보.
- 단 cycle 256 PRD 의 scope discipline 준수 — chain 258 또는 cycle 261+ 분리.

### 4.5 contrast (WCAG AA)

| 위치 | 현재 | 평가 |
|---|---|---|
| event-log npcDeath `#cbd5e1` on `#0f172a` | 11.8:1 | AAA pass (단, 의미 없음 — 회색 = 정체성 부재) |
| saga-event `#ccc` on `#1a1d28` | 10.5:1 | AAA pass |
| §3.1 권장 4 색 on `#0f172a` | 6.5-9.2:1 | AA pass (모두 충분) |

contrast 자체는 문제 없음. **문제는 *의미 위계의 정보 손실*** — npcDeath 가 회색
default 에 빠져 6 kind 모두 같은 시각으로 보이는 것.

---

## 5. 토큰 사용 (chain 258 또는 cycle 261+ 도입 시)

- 신규 token (chain 258 또는 cycle 261+):
  - `--color-saga-npc-rival` `#fdba74` (호박)
  - `--color-saga-npc-mentor` `#c4b5fd` (보라)
  - `--color-saga-npc-friend` `#a7f3d0` (민트, drop 의 `#a7f3d0` 와 alias — drop
    과 friend 둘 다 *비공격 긍정* 톤이라 token 통합 후보)
  - `--color-saga-npc-family` `#fbcfe8` (분홍)
- 기존 token 재사용:
  - `--color-foreground-emphasis` (death `#f87171` 와 alias 후보)
  - `--color-foreground-muted` `#cbd5e1` (default event)
- raw hex 금지. OverworldRunner.tsx 의 inline style `#1f2937` / `#3b4252` /
  `#0f172a` 등은 *기존 부채* — 본 guide scope 외 (cycle 156 ui-guide §7 의 부채
  명단과 동일).

---

## 6. 잘못된 패턴 (본 guide 의 권장이 빠질 함정)

- **F1 fix 와 §3 색 분기를 같이 묶기** — cycle 256 PRD 의 scope discipline 위반
  (메타-rule 3 = M===N 만 "완성" 표현). F1 은 *narrative 데이터*, §3 은 *visual
  hierarchy* — 직교 axis. chain 258 또는 cycle 261+ 분리 의무.
- **자연사 modal overlay** — V3 idle 죄책감 위반 (§2.2). 행 단위 강조로 대체.
- **6 kind 6 색 동시 채택** — Hick's Law 위반. 4 그룹화 + emoji redundant 권장.
- **빨강 색을 NPC 사망에 사용** — death (영웅 사망 `#f87171`) 와 색 충돌. NPC
  asymmetry 가 시각으로도 보존되어야 V3 narrative 정합.
- **raw hex inline** — `--color-saga-npc-*` token wrap 의무. theme-bridge 우회
  금지.
- **filter 칩에 `npc-rival` / `npc-mentor` 등 6 종 추가** — Hick's Law 위반 (현
  12 칩 → 18 칩). `npc` 단일 filter 유지 (이미 npcDeath cover, sub-필터 0).
- **emoji 단독 + 색 없음** — colorblind-safe 는 되지만 *정상 시야의 빠른 분류*
  손실. emoji + 4 그룹 색 = redundant 채널.
- **familyEvent (결혼/출산/성장) 의 색을 family death 와 같이 묶기** — narrative
  톤이 *생성 vs 소멸* 로 정반대. 본 guide 의 §3 은 *death* 한정.

---

## 7. 자가 검증

- ASCII wireframe 80 col 이내 — 확인.
- 권장이 *carry-over* 단위로 분할 — chain 258 묶음 후보 + cycle 261+ 후보. cycle
  256 PRD scope 외 — 메타-rule 3 준수.
- 44px / safe-area / forge-* 재발명 / 5+ primary action — 모두 cover (event-log
  표시 전용으로 44px 무영향, saga-modal filter 칩의 부채는 기존 명단).
- 색맹: emoji prefix + 4 그룹 색 redundant — WCAG 2.1 SC 1.4.1 통과.
- F1 fix 의 표시 경로 3 곳 (file:line 인용) — `OverworldRunner.tsx:714-726` +
  `CycleResultV2.tsx:46-58` + `SagaBookModal.tsx:112-117` 모두 명시.
- emit 경로 3 곳 (file:line 인용) — `CycleControllerV2.ts:550,831,1334` 모두
  명시.
- 발견 1 (asymmetry) 가 *file:line cite* + *V3 narrative 정합 사유* 동반 — 의미
  있는 surface.
- *modal/freeze emotional pause* 권장하지 않음 — V3 idle 죄책감 룰 (§2.2).

---

## 다음 cycle PRD planner 에게 (input)

cycle 256 의 핵심 = **F1 fix 자체는 UI 0** — 본 guide 의 §1 trace 결과를 STATUS
에 *narrative-text-가-3-screen-에-도달-검증* 형식으로 인용 가능. cycle 260 STATUS
의 Chain accountability table 에 cycle 256 entry = "kind axis wired, 3 emit + 3
display path verified, 1 known visual-hierarchy debt (asymmetry, deferred to chain
258 or cycle 261+)".

chain 258 (NATURAL_DEATH + composition) 의 PRD 작성 시 **§2.1 의 자연사 행 강조 +
§3 의 NPC kind 색 분기를 *옵션 sub-task* 로 포함**. PRD planner 가 chain 258 의
scope 가 너무 부풀면 §3 만 cycle 261+ 로 분리.

cycle 261+ carry-over 후보 (본 guide 발생):

- §3.3 `eventColor(ev: SagaEvent)` refactor + payload.kind 분기 + 4 색 token 신규.
- §4.2 event-log `aria-live="polite"` + `role="log"` + 자연사 행 `role="status"`.
- §4.4 saga-modal filter 칩 12 종 44px contrast cleanup (cycle 156 ui-guide 부채
  명단과 묶음).
- §2.1 CycleResultV2 의 chapter 별 list 에서 death 행 italic + `★` prefix 통일.

cycle 280 deadline (mega-phase carry-over) 시점에 **Lifebook (life-cycle axis)**
도입이 본 guide §3 의 NPC kind 색 분기를 *재정의* 할 가능성 — Lifebook 의 (c)
EternalSaga 영구 narrative entry 가 npcDeath narrative slot 의 superset. cycle
261+ 의 §3 권장은 *Lifebook 진입 시 reuse* 가능한 형식 (token namespace `saga-npc-*`
유지) 으로 권장.

---

평가 시점 = 2026-05-28. 평가자 = UI/UX 디자이너 페르소나 (12 년차 모바일 + 웹
게임). 입력 = cycle 256 PRD + 코드 entry (`CycleControllerV2.ts` emit 3 곳 +
`OverworldRunner.tsx` event-log + `CycleResultV2.tsx` chapter list +
`SagaBookModal.tsx` filter + `types.ts:198` NpcEntity['kind'] union). 출력 = 본
guide + chain 258 / cycle 261+ carry-over 후보.
