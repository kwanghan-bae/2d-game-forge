# Cycle 106 UI/UX Evaluation

## 1. Idle Musing Ticker (C104) — Layout Shift Analysis

**배치**: MainMenu subtitle 바로 아래, 버튼 그룹 상단 (`line 50-54` of MainMenu.tsx).

**판정: 안전하나 미세 개선 필요**

- `minHeight: 18` 이 설정되어 null → text 전환 시 layout shift 방지됨 ✓
- 15초 interval 로 교체 시 `transition: opacity 0.5s` 가 soft fade 를 줌 ✓
- **문제점**: fade-out 없이 즉시 텍스트 교체 (`setMusing(...)` 직접 호출). 현재는 opacity transition 이 mount 시에만 발동하고, text swap 시에는 동일 element 에서 content 만 변경되므로 **사실상 transition 무발동**. 사용자가 "깜빡" 인지할 수 있다.
- **위험도**: 낮음 (decorative element, 0.6 opacity 로 시각 우선순위 낮아 주의를 끌 빈도 적음)
- **개선안**: crossfade 방식 (key 를 toggle 해 exit/enter) 또는 opacity state 를 0→0.6 으로 직접 제어

## 2. Scaled Damage Numbers (C105) — Readability & Overlap

**구현** (`BattleScene.ts:1062-1104`):
- Base 14px (normal) / 18px (crit), digit count × 3 으로 증가, cap 32px
- x 좌표에 ±15px jitter (`270 + (Math.random() - 0.5) * 30`)
- float-up 거리: `50 + digits * 3` px

**판정: 대체로 양호, 한 가지 overlap 위험**

| 자릿수 | fontSize | 시인성 | 비고 |
|--------|----------|--------|------|
| 1-2    | 14-17px  | ✓      | 작지만 white/non-bold 로 보조적 |
| 3-4    | 20-23px  | ✓      | gold 로 눈에 띄기 시작 |
| 5-6    | 26-29px  | ✓      | bold + punchScale |
| 7+     | 32px     | ⚠️     | "💥" prefix + bold + punchScale 1.7+ = **실질 ~54px 렌더** |

**overlap 위험**: 7자리+ crit (`punchScale = 1 + 7*0.1 = 1.7`) 이면 실질 렌더 높이 54px. float 시간 800ms. 연속 crit 이 겹치면 서로 침범 가능.
- **현행 jitter ±15px** 이 부족. 동시 2개 이상 damage text 가 겹칠 구간.
- **개선안**: stagger y-offset 을 tracking 하거나, 동시 active text 수 제한 (max 3, 이전 것 즉시 fade)

**접근성**: `#ffd700` on game background `#0a0e1a` = contrast 10.2:1 (AAA) ✓. `#ff4444` on `#0a0e1a` = 5.3:1 (AA) ✓. `#ffffff` on `#0a0e1a` = 18.1:1 (AAA) ✓.

## 3. 다음 UI 우선순위 — TOP 1 추천

### 🏆 **Victory Quotes Display** (CycleResultV2 화면)

**이유**:
1. `victoryQuotes` 데이터 + 테스트 이미 존재 (`getVictoryQuote()`, 16 캐릭터 전원 커버)
2. `regionLore` 는 overworld 진입 시 표시할 위치가 이미 `realmOverlay` 로 커버됨 → 중복
3. credits 화면은 법적 의무이나 engagement 기여 없음 → 후순위
4. victoryQuotes 는 **사이클 종료 시 감정 보상(emotional payoff)** 역할 — idle game 리텐션 핵심

### Wireframe: CycleResultV2 Victory Quote 삽입

```
┌─ CycleResultV2 ───────────────────────────────┐
│                                                │
│   ⚔️ 사이클 완료!                               │
│   [hero name] · [age]세 · [level]레벨           │
│                                                │
│ ┌─ victory-quote (신규) ────────────────────┐  │
│ │  💬 "[character-specific victory quote]"   │  │
│ │        — [character name]                  │  │
│ └────────────────────────────────────────────┘  │
│                                                │
│   ✨ 빛 획득: +1,234                            │
│   📈 최고 레벨: 142                             │
│   🗡️ 처치 수: 89                               │
│                                                │
│   [ 다음 사이클 ]    [ 메인 메뉴 ]              │
│                                                │
└────────────────────────────────────────────────┘
```

**UI 함의**:
- **배치**: hero 정보 바로 아래, stats 위 (시선 흐름: 제목 → 영웅 → 감정문구 → 수치)
- **스타일**: `fontSize: 14px`, `fontStyle: italic`, `opacity: 0.85`, `color: var(--color-text-secondary)`
- **quote container**: `border-left: 3px solid var(--color-gold)`, `padding: 12px 16px`, `background: rgba(255,215,0,0.05)`
- **트리거**: CycleResultV2 mount 시 `getVictoryQuote(heroCharId)` 호출
- **null 처리**: quote 없으면 섹션 미렌더 (layout shift 없음)
- **accessibility**: quote 에 `role="figure"` + `aria-label="승리 대사"` 부여

**토큰 사용**:
- `--color-gold` border-left
- `--color-text-secondary` quote text
- `--color-surface-elevated` (05 alpha) background

## 4. Mobile Touch/Scroll Concerns (C104-C105)

| 항목 | 상태 | 비고 |
|------|------|------|
| Idle musing 12px text | ✓ | non-interactive, 터치 타겟 불필요 |
| MainMenu 버튼 영역 shift | ✓ | `minHeight: 18` 로 방지됨 |
| Damage number 32px | ✓ | Phaser canvas 내부, DOM touch 영향 없음 |
| MainMenu scroll | ⚠️ | 버튼 8개 + tier bar + musing = 작은 화면(iPhone SE, 667px height)에서 하단 2 버튼 스크롤 필요 가능. 현재 `overflow` 미설정 |

**개선안**: MainMenu 의 button container 에 `overflow-y: auto; max-height: calc(100dvh - 200px)` 추가 검토 필요 (작은 디바이스 대응).

## 잘못된 패턴 경고

- ❌ damage number `punchScale` 이 1.7 을 넘으면 가독성 역전 (too big = 인지 부하). cap 1.5 권장
- ❌ idle musing 이 길어질 경우 (40자+) 2줄 됨 → `minHeight: 18` 이 부족해져 layout shift 발생. `minHeight: 36` 또는 `max-lines: 1` + ellipsis 권장
