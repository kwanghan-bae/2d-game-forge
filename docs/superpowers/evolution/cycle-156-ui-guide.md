# Cycle 156 UI/UX Guide — Season Pass Flow 사용성 Audit + 진입점 강화

> 평가 대상: cycle 130-155 의 UI 변경 누적 (`SeasonPassScreen` + `MainMenu`).
> 본 가이드는 **현재 흐름의 결함 식별 + cycle 156-160 의 1-2 cycle 단위
> 개선안** 둘 다 다룬다. PRD 가 채택할 단위로 쪼개진 권장이 §6 에 있다.

## 한 줄 요약

- 4-step gap (cycle 145 critic #3) 의 본질 = **진입점 (MainMenu 의 도전과제
  버튼) 이 claimable=0 일 때와 claimable>0 일 때 시각 차이가 없다**. 평문 라벨
  안 "🎁 N 수령" 텍스트만 변동 → 0.5 초 시선 검출 실패.
- claim feedback (cycle 138 pulse + cycle 154 toast suffix) 은 ***개별 claim
  의 시각 확인*에는 충분** 하지만 **평생 4 회뿐인 tier 진입 이벤트 (신참 →
  노련 → 숙련 → 마스터 → 전설)** 까지 2500ms 한 줄 토스트로 묶은 것은 강도
  부족. cycle 106 의 milestone VFX 패턴이 *이미 precedent*.
- 44px 위반 3 건 + WCAG contrast 위반 1 건 + ARIA dialog 누락 + focus
  management 부재. accessibility 합격 미달.

## 영향 화면

- **MainMenu** (`games/inflation-rpg/src/screens/MainMenu.tsx`) — `btn-season-pass`
  (line 60-65) 옆 펄스 badge 신규. `mm-claimer-tier` row (line 25-29) 에 다음
  tier progress 표시 후보.
- **SeasonPassScreen** (`games/inflation-rpg/src/screens/SeasonPassScreen.tsx`) —
  modal 자체에 `role="dialog"` + focus trap, claim button 44px 위반 픽스, feedback
  aria-live 보강. tier 진입 시 *fullscreen celebration overlay* portal 마운트.
- **App root** (cycle 106 패턴 그대로) — tier celebration overlay portal 부착
  지점. body 직접 변형 금지.

기타 (Overworld / Inventory / Shop / Pause / HallScreen) 무영향.

---

## 1. 사용성 audit — 4-step gap 의 본질

cycle 145 critic #3 의 "cycle 종료 → MainMenu → 도전과제 버튼 → modal → row
발견 → 클릭" 의 4-step 은 **단계 수가 문제가 아니라 step 1 → step 2 의 *시선
이동 hint* 가 빠져있다** 는 게 본질이다.

### 현재 흐름 (`MainMenu.tsx:64`)

```tsx
도전과제 ({tokens} 🎫{claimable > 0 ? ` · ${claimable} 🎁 수령` : ''})
```

- claimable=0 일 때: "도전과제 (12 🎫)"
- claimable=3 일 때: "도전과제 (12 🎫 · 3 🎁 수령)"

차이가 **평문 길이 9 글자 늘어남** 뿐. button background / border-color / 시각
강조 0. 신참 player 가 cycle 종료 후 MainMenu 로 돌아왔을 때 *눈에 띄는*
신호가 없다.

대비 — 다른 게임의 동일 패턴 (모바일 RPG 일반):

- 빨간 dot badge (notification count) 가 button 우상단에 absolute 배치
- claimable > 0 시 button 자체에 펄스/glow
- 미수령 누적이 일정 임계 넘으면 "!" 아이콘

본 게임은 셋 다 없다.

### 영향 — 행동 데이터 추정

- claim button 이 modal *안* 에 있고 modal 진입 자체에 신호가 없다 = "수령
  완료" 까지 도달하는 conversion 은 player 가 시즌 패스를 *자발적으로 의식*
  하는 경우만.
- cycle 138 의 pulse VFX, cycle 141 의 row sort, cycle 142 의 narration 12
  variant 모두 *modal 안에서만* 가치를 발휘 → modal 진입률이 낮으면 전부
  dead UI.

→ cycle 156 의 가장 큰 ROI 작업 = **MainMenu 진입점에 시선 hint 추가**.

---

## 2. Accessibility audit — 위반 사항

### A. 44px 터치 타겟 (CLAUDE.md Phase 4a 기준) — 3 건 위반

| 위치 | 현재 | 위반 |
|---|---|---|
| `SeasonPassScreen.tsx:122` 환전 button | `minHeight: 36` | 8px 부족 |
| `SeasonPassScreen.tsx:115` 환전 number input | 명시 없음, padding 6+6=12 + line ~16 = **~28px effective** | 16px 부족 |
| `SeasonPassScreen.tsx:171` 수령 완료 button (disabled state) | `minHeight: claimable ? 44 : 36` | disabled 도 tap surface — mis-tap 시 disabled feedback 도 못 줌 |

### B. WCAG color contrast — 1 건 위반

`SeasonPassScreen.tsx:174` "수령 완료" disabled state:
- `color: #666` on `background: #3b4252` ≈ **2.8:1**
- WCAG AA 텍스트 최소 4.5:1 미달. AAA 7:1 은 한참 멀다.
- "완료" 정보를 text 로만 전달 → 색맹은 ✅ emoji 로 redundant 확인 가능
  (cycle 131 의 emoji prefix 가 살림). 하지만 *normal vision* 도 읽기
  어렵다는 점에서 정보 손실.

### C. ARIA 의미 누락

| 항목 | 위치 | 누락 |
|---|---|---|
| modal role | `SeasonPassScreen.tsx:82-86` | `role="dialog"` + `aria-modal="true"` + `aria-labelledby` 부재 |
| modal title | line 89 의 `<strong>도전과제 + 토큰</strong>` | `id` 없음 → labelledby 가리킬 곳 없음 |
| toast feedback | line 126 `<span data-testid="sp-feedback">` | `aria-live="polite"` + `role="status"` 부재. cycle 106 의 VFX aria-live 가 *이미 패턴 확립* |
| close button | line 94 `season-pass-close` | `aria-label="닫기"` 부재 (✕ 만으로 screen reader 가 "X" 로 발화) |

### D. Focus management 부재

- modal open 시 autoFocus 안 함 → Tab 첫 누름이 modal 밖 (배경 button) 으로
  이동할 가능성.
- focus trap 없음 → Tab/Shift+Tab 으로 modal 밖 element 가 잡힘.
- close 시 focus 복귀 (`btn-season-pass`) 없음 → screen reader 사용자가
  "어디로 갔지" 가 됨.

### E. 키보드 네비게이션 — 부분 통과

- Escape close (line 58-61) — 통과.
- Tab 으로 modal 안 button 순회 — 부분 통과 (focus trap 부재로 새어나감).
- claim button 이 native `<button>` — Enter / Space 로 활성 — 통과.

### F. Safe area 준수 — 부분 통과

- `paddingBottom: 'env(safe-area-inset-bottom)'` (line 84) — 통과.
- `padding-top` 에 `safe-area-inset-top` 없음 — iPhone 14 notch 와 modal
  헤더 (line 87) 가 겹칠 위험. 단 `maxHeight: '88vh'` + flex center 로 *대체로*
  notch 회피, **borderline**. tier celebration overlay (§4) 도입 시 동일 룰
  적용.

---

## 3. claim feedback affordance — pulse + toast 강도 평가

### 일반 claim (1-5 토큰)

- pulse VFX (cycle 138) = `transform: scale(1.15)` + 16px gold glow 600ms.
- toast (cycle 142 narration + cycle 154 tier suffix) = " ★ <tier> 등급 달성!"
  2500ms.
- **결론: 적정.** 일반 claim 은 시즌당 ~5 회 발생하므로 micro feedback 으로
  충분. 추가 강조하면 *피로감*.

### tier 진입 (평생 4 회 이벤트)

- 현재: 일반 toast 의 *suffix* 로 " ★ 노련 등급 달성!" 한 줄 추가.
- 문제: 같은 UI volume 으로 평생 4 회뿐인 milestone 을 보여준다.
  - "수령 완료 (+3 🎫)" + " ★ 노련 등급 달성!" 두 정보가 **같은 글자 크기,
    같은 색 (`#aaa`, line 126), 같은 25 00ms timer** 로 송출.
  - cycle 152 의 TIER_UNLOCK_REWARD (5/15/50/200 token bonus) 도 toast 안에
    묻힘 — cycle 153 wire 가 데이터 레이어만 wire 하고 *연출* 은 0.
- **결론: 부족.** cycle 106 의 milestone VFX (radial bloom + screen shake +
  aria-live announce) 패턴을 *재사용* 해서 tier 진입에 동일 강도 부여 필요.

### 비교표

| 이벤트 | 빈도 | 현재 강도 | 권장 강도 |
|---|---|---|---|
| 일반 claim | 시즌당 ~5 회 | pulse + toast | 유지 |
| tier 진입 | **평생 4 회** | pulse + toast 의 suffix | **fullscreen celebration overlay** (cycle 106 패턴) |
| 도전과제 완료 (미수령) | 시즌당 ~5 회 | row 정렬 (cycle 141) | 유지 |

---

## 4. 진입점 강도 — MainMenu 의 "도전과제" 버튼

§1 의 audit 그대로. **claimable > 0 시 button 자체에 시각 변화 0**.

### 현재 button (`MainMenu.tsx:60-65`)

```
┌─────────────────────────────┐
│ 도전과제 (12 🎫 · 3 🎁 수령)│   ← 평문, 강조 0
└─────────────────────────────┘
```

### 권장 — pulse dot badge + button glow

```
       ┌─ 🔴 (pulse 1.6s loop) ── absolute top:-4 right:-4
       ▼
┌─────────────────────────────┐
│ 도전과제 (12 🎫)             │   ← 카운트는 dot badge 로 이전, label 깔끔
└─────────────────────────────┘   ← claimable>0 시 border gold→pulse-gold
```

- dot 색: `#ffd700` (theme-modern-dark-gold 기존 token). 빨강 회피 — 색맹
  (deuteranopia) 친화 + V3 "후원자 능동성" 의 *긍정* 톤 (빨강 = 위험/긴급).
- count 가 9 초과 시 "9+" 표기 (가독성).
- pulse animation: cycle 138 의 sp-claim-pulse 와 *분리* 키프레임 — 1.6s
  loop infinite (button 은 *대기 상태*, claim button 은 *순간 강조*).
- `prefers-reduced-motion` 시 pulse 정지, dot 정적 표시 (색만 유지).

---

## 5. 색맹 / 키보드 / safe-area / screen-reader 종합

| 축 | 현재 | 권장 |
|---|---|---|
| 색맹 (deuteranopia) | claim state 가 emoji ✅/🎁/◯ + text 로 redundant — 통과 | dot badge 노랑 유지, 빨강 금지 |
| 키보드 | Escape close 통과, focus trap 부재 | focus trap + restore (§6 cycle 156) |
| safe-area (notch) | bottom 통과, top borderline | top 도 `env(safe-area-inset-top)` |
| screen-reader | dialog role / aria-live / aria-label 누락 | §2C 4 건 모두 보강 |
| 44px touch target | 환전 button + input + disabled claim 위반 | §6 cycle 156 픽스 |
| contrast | "수령 완료" 2.8:1 위반 | `color: #888` 또는 `#9aa3b2` (≥ 4.5:1) |

---

## 6. cycle 156-160 권장 개선 — PRD 채택 단위로 분할

### 권장 A — Cycle 156 단일 (작은 UI 패치, hero loop 무영향)

**제목**: SeasonPass 진입점 + accessibility 합격 패치

**범위** (1 cycle):

1. **MainMenu `btn-season-pass` 펄스 dot badge** (§4)
   - claimable > 0 시 absolute pos dot. 1.6s pulse loop. reduced-motion 대응.
2. **44px 위반 3 건 픽스** (§2A)
   - 환전 button + input minHeight 44 로 통일.
   - 수령 완료 (disabled) button 도 44 — `claimable ? 44 : 44`.
3. **WCAG contrast 픽스** (§2B)
   - "수령 완료" `color: #666` → `#9aa3b2` (현재 sp-active-season 와 동일 token).
4. **ARIA 4 건** (§2C)
   - modal `role="dialog"` + `aria-modal="true"` + `aria-labelledby`.
   - title id 부여.
   - feedback span 에 `aria-live="polite"` + `role="status"`.
   - close button 에 `aria-label="닫기"`.
5. **focus management** (§2D)
   - modal open 시 첫 claimable button → 없으면 close button autoFocus.
   - close 시 `btn-season-pass` 로 focus 복귀.
   - Tab focus trap (modal 안 forward/backward 순환).

**wireframe — MainMenu 의 진입점**:

```
┌─ MainMenu ────────────────────────────────────┐
│         조선 인플레이션 RPG                    │
│  신이 되어 용사의 일대기를 후원하라            │
│  후원자 등급: 노련 (누적 수령 12)              │
│                                                │
│  ┌───────────────────────────────────────┐    │
│  │ 이어하기 (홍길동 · 23세)              │    │
│  └───────────────────────────────────────┘    │
│  ┌───────────────────────────────────────┐    │
│  │ 새 사이클 시작                         │    │
│  └───────────────────────────────────────┘    │
│  ┌───────────────────────────────────────┐    │
│  │ 전당 (47)                              │    │
│  └───────────────────────────────────────┘    │
│  ┌───────────────────────────────────────┐ ⊙3 │ ← dot badge (pulse)
│  │ 도전과제 (12 🎫)                       │    │   `#ffd700`
│  └───────────────────────────────────────┘    │
│  ┌───────────────────────────────────────┐    │
│  │ 용사 갤러리 (V1b)                      │    │
│  └───────────────────────────────────────┘    │
└────────────────────────────────────────────────┘
```

**non-goal** (cycle 156 에서 안 함):

- tier celebration overlay (cycle 157 으로 분리).
- progress bar (cycle 158 carry-over).
- 시즌 패스 진입을 *강제* 하는 자동 modal popup — V3 idle 죄책감 위반 위험.

**검증**:

- vitest: dot badge render claimable>0/=0 분기 2 테스트.
- Playwright: iPhone 14 viewport, `getByTestId('btn-season-pass')` 의
  bounding box ≥ 44px, dot badge `data-testid="mm-badge-claimable"` 가 3개일
  때 보임.
- screen reader manual: macOS VoiceOver 로 modal 진입 시 "도전과제 + 토큰
  dialog" 발화 확인.

**잘못된 패턴 (cycle 156 에서 피할 것)**:

- raw hex (예: `background: '#ff0000'`) → `--color-*` token 만.
- 새 forge-* component 발명 → MainMenu 의 기존 button style 만 dot 추가.
- dot badge 를 `<span>` text 가 아닌 *순수 색 도형* 만 → screen reader 정보
  손실. text+`aria-hidden` 조합 또는 `aria-label="3개 수령 가능"`.
- pulse animation 을 sp-claim-pulse 와 동일 keyframe 재사용 → 의미 충돌
  (button-mode pulse vs claim-moment pulse). 별도 keyframe.

---

### 권장 B — Cycle 157-158 분할 (tier celebration overlay)

**제목**: cycle 106 milestone VFX 패턴 재사용한 tier 진입 fullscreen celebration

**범위** (2 cycle 분할):

#### Cycle 157 — overlay portal + reduced-motion + aria-live

- `<TierCelebrationOverlay>` 신규 컴포넌트. cycle 106 의 `<InflationMilestoneVFX>`
  의 *형식* 그대로 복제 (z=9999, position:fixed, portal, pointer-events:none).
  코드 자체는 재사용 아닌 *형식 차용* — milestone 색 token (8 tier) 과 tier
  token (4 tier) 의 namespace 가 다름.
- 4 tier 별 색 token `--color-claimer-tier-노련/숙련/마스터/전설`:
  - 노련: 청동 `#cd7f32`
  - 숙련: 은 `#c0c0c0`
  - 마스터: 금 `#ffd700` (theme-modern-dark-gold 기존 token alias)
  - 전설: 무지개 conic-gradient (보라 → 금 → 청) 또는 rainbow
- aria-live announce: `role="status"` + `aria-live="polite"` + `"노련 등급
  달성, 5 토큰 보너스 획득"` (TIER_UNLOCK_REWARD bonus 포함).

**wireframe — celebration overlay**:

```
┌─ Viewport (390×844) ───────────────────────────┐
│  [SeasonPassScreen modal 그대로 뒤에]          │
│                                                │
│  ╔══════════════════════════════════════════╗  │ ← z=9999 portal
│  ║                                          ║  │   pointer-events:none
│  ║          ★ ★ ★ ★ ★                       ║  │
│  ║                                          ║  │
│  ║      ┌─ 노련 등급 달성! ─┐                ║  │
│  ║      │                    │                ║  │
│  ║      │    + 5 🎫 보너스    │                ║  │
│  ║      │                    │                ║  │
│  ║      └────────────────────┘                ║  │
│  ║                                          ║  │
│  ║   radial-gradient (tier color)           ║  │
│  ║   scale 0.5 → 1.0 → 0.9, 1.8s            ║  │
│  ╚══════════════════════════════════════════╝  │
│                                                │
└────────────────────────────────────────────────┘
```

**타이밍**:

```
   0 ms          900 ms                       1800 ms
   │              │                              │
   │  fade-in     │      hold (peak)             │  fade-out
   │  + scale     │   text fully visible         │  + scale
   │  0.5 → 1.0   │                              │   1.0 → 0.9, α→0
   │ aria-live ━━━━┛                             │
   │ 트리거 시점                                  │
```

전설 등급은 2.4s (60일 만에 1 회 가치). reduced-motion 시 scale 정지, opacity
fade in/out 600ms 만.

#### Cycle 158 — 후원자 등급 progress bar (carry-over 후보)

- `mm-claimer-tier` row 에 다음 tier 까지 progress bar 1 줄 추가.
- `nextTierThreshold(count)` 이미 존재 (`claimerTier.ts:20-26`) — wire 만.

```
┌─ MainMenu row ────────────────────────────────┐
│ 후원자 등급: 노련 (누적 수령 12)               │
│ ┌────────────────────────────────────────┐    │
│ │ ▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │    │  ← 12/20 진행
│ └────────────────────────────────────────┘    │
│ 다음: 숙련 까지 8회                            │
└────────────────────────────────────────────────┘
```

- 색: claimer tier 색 token 그대로 (노련=청동).
- 전설 도달 시 bar 숨김, "최고 등급" 텍스트.
- aria-label: `"다음 숙련 등급까지 8회 남음, 진행도 60%"`.

**잘못된 패턴 (cycle 157-158)**:

- overlay 가 modal 클릭을 막음 — pointer-events:none 필수.
- overlay 가 hero stat / SP / token 에 영향 — visual 전용.
- 전설 등급 rainbow gradient 가 epilepsy trigger — flicker 빈도 < 3Hz 유지.
- progress bar 가 새 store slice — 기존 `meta.totalClaimsCount` selector 만.
- inline raw hex — `--color-claimer-tier-*` 모두 CSS custom property wrap
  (theme-bridge 우회 금지).

**검증**:

- vitest: TierCelebrationOverlay 4 tier render snapshot, aria-live text 정합.
- Playwright: tier 진입 e2e — claim 9 개 spam → 노련 진입 → overlay 발화 →
  1800ms 후 자동 dismiss.

---

## 7. 토큰 사용

- 신규 token (cycle 157):
  - `--color-claimer-tier-신참` `#9aa3b2` (회색, 노출 안 함 / fallback)
  - `--color-claimer-tier-노련` `#cd7f32` (청동)
  - `--color-claimer-tier-숙련` `#c0c0c0` (은)
  - `--color-claimer-tier-마스터` `#ffd700` (금, theme-modern-dark-gold alias)
  - `--color-claimer-tier-전설` conic-gradient 사용 (단일 hex 아님)
- 기존 token 재사용:
  - `--color-foreground-emphasis` (claim button gold) = `#ffd700` (theme-bridge)
  - `--color-foreground-muted` = `#9aa3b2` (sp-active-season, "수령 완료" 픽스)
- raw hex 금지. SeasonPassScreen 의 inline style `#1a1d28` / `#3b4252` /
  `#444` 등은 *기존 부채* — cycle 156 범위 외 (별도 cleanup cycle 필요).

---

## 8. 자가 검증

- ASCII wireframe 80 col 이내 — 확인.
- 각 권장이 *1-2 cycle PRD-able* 단위 — 권장 A = 1 cycle (작은 UI 패치),
  권장 B = 2 cycle 분할 (overlay + progress).
- defects 모두 file:line 인용 — `SeasonPassScreen.tsx:122/171/174/82-86/126`
  + `MainMenu.tsx:64` 모두 명시.
- 44px / safe-area / forge-* 재발명 / 5+ primary action — 모두 cover.
- 색맹: dot badge 노랑 + emoji redundant — 통과.
- claim 만료 timer 추천 안 함 — V3 표류 경보 1 반영.
- 새 forge-* 컴포넌트 발명 안 함 — 기존 MainMenu button + cycle 106 VFX 패턴
  재사용.

---

## 다음 cycle PRD planner 에게 (input)

cycle 156 의 핵심 = **§6 권장 A 채택** (작은 UI 패치, hero loop 무영향).
ROI 가장 높음 + accessibility 부채 청산 + cycle 145 critic #3 의 4-step gap
중 step 1→2 transition 의 시선 hint 제공.

cycle 157-158 은 **§6 권장 B** — tier celebration overlay 의 분할 도입. cycle
106 의 milestone VFX 패턴이 이미 precedent 이므로 *형식 차용* 으로 fast track
가능. game-critic 의 약점 #2 ("claimerTier ornament — meaningful progression
0") 해소의 *연출 면* 보강 (cycle 152-153 이 *데이터 면* 보강 완료).

cycle 159-160 의 carry-over 후보:

- SeasonPassScreen 의 inline raw hex 부채 cleanup (raw hex → token).
- 시즌 변경 시 modal 의 sp-active-season chip 의 시각 강조 (cycle 149 의
  catalog 6→8 확장 후 player 의 시즌 인지가 더 중요해짐).
- claim 통계 (시즌별 / 평생) screen 분리 — 단 V3 idle 죄책감 회피 확인 필요.

---

평가 시점 = 2026-05-27. 평가자 = UI/UX 디자이너 페르소나 (12 년차 모바일 + 웹
게임). 입력 = cycle 145 critic + 코드 entry (`SeasonPassScreen.tsx` /
`MainMenu.tsx` / `claimerTier.ts` 직접 read). 출력 = 본 가이드 + cycle 156 PRD
planner 의 채택 후보 권장 A.
