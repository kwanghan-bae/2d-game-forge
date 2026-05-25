# Cycle 106 UI/UX Guide — Inflation Milestone VFX

> PRD: `cycle-106-prd.md` (8 tier preset 표 = PRD §F2 단일 source — 이 가이드는 복사 안 함).
> 본 가이드는 **공간 / 타이밍 / 접근성 / usability** 4 축 delta 만 다룬다.

## 영향 화면

- **OverworldScreen** (`games/inflation-rpg/src/screens/OverworldScreen.tsx`) — VFX overlay portal 신규 마운트 지점. 기존 HUD / SpendModal / Hero canvas 위에 z-stack 최상단.
- **SagaBookModal** (`games/inflation-rpg/src/screens/SagaBookModal.tsx`) — F3 옵션 시 `type: 'milestone'` record 앞 ★ + tier color pin. F3 미구현이어도 데이터는 보존.
- **App root** (`games/inflation-rpg/src/App.tsx`) — screen-shake CSS keyframe class 가 root `<div>` 에 transient 부착. body 직접 변형 금지 (Next layout 충돌 회피).

다른 화면 (Inventory / Shop / MainMenu / Pause) 은 무영향 — VFX 는 cycle 진행 중 (Overworld) 에서만 emit.

## F1 + F2 의 UI 배치

### 화면 위 좌표

VFX overlay 는 **viewport 중앙 (50% 50%)** 에 portal 마운트. HUD level counter 옆이 아닌 이유:

- HUD level counter (좌상단 `[level 142]`) 옆에 띄우면 tier 7-8 (560-640px) 시 viewport 우측 절반 까지 침범 + 시선 흐름 어색.
- Hero entity 위치 위 (Phaser canvas 내부 anchor) 는 PRD §F2 §반대 기준 ("Phaser 안에서 직접 render 금지") 위반.
- **viewport 중앙 + `position: fixed` + `pointer-events: none`** = 시선 자연 집중 + interaction 차단.

```
┌─ Viewport (390×844 iPhone 14) ────────────────┐
│ safe-top env() ~47px                          │  ← notch
│ ┌─ HUD top (z=10) ──────────────────────────┐ │
│ │ [age 23] [level 142] [light 1.2K]        │ │
│ └───────────────────────────────────────────┘ │
│                                               │
│           ╔═══════════════════╗               │  ← VFX overlay portal
│           ║                   ║               │     position: fixed
│           ║   ☀ tier-N flash  ║               │     top: 50% left: 50%
│           ║   (radial bloom)  ║               │     translate(-50%, -50%)
│           ║                   ║               │     z-index: 9999
│           ╚═══════════════════╝               │     pointer-events: none
│                                               │
│              [Hero canvas]                    │
│                                               │
│ ┌─ HUD bottom (z=10) ───────────────────────┐ │
│ │  [spend]  [saga]  [pause]                 │ │
│ └───────────────────────────────────────────┘ │
│ safe-bottom env() ~34px                       │  ← home indicator
└───────────────────────────────────────────────┘
```

### z-index 계층 (신규 + 기존)

| layer | z | 구성 |
|---:|---:|---|
| 1 | 0-9 | Phaser canvas (Hero / Overworld scene) |
| 2 | 10 | HUD top / bottom bar |
| 3 | 100 | SpendModal / StatusModal (forge-screen) |
| 4 | 500 | Toast / SagaBookModal |
| 5 | **9999** | **InflationMilestoneVFX overlay** (신규) |
| 6 | 99999 | aria-live announcement (offscreen, screen reader 전용) |

VFX 가 modal 위에 떠도 OK — `pointer-events: none` 이라 modal interaction 차단 안 됨.

## 타이밍 통합 — batch crossing 시 큐 동작

PRD §F2 는 *연속 milestone 큐잉 = FIFO sequential* 결정. 가이드는 timeline 시각화로 보강.

### Case A — 일반 (1 tier), Case B — 다단 cross (cycle 초반 ramp)

```
Case A: lv 950 → 1100      → tier 2 단발
  0 ──── 800 ms
  │← tier 2 (flash + shake 6px + sfx small) →│

Case B: lv 50 → 12000      → tier 1 + tier 2 (PRD §F1 동시 emit)
  0 ── 600 ── 1400 ms
  │← tier 1 →│← tier 2 →│   (FIFO sequential, 큐 head 끝나면 dequeue)
```

총 1.4s window. PRD R2 = cycle 시작 직후 ramp 1-2 회만 발생.

### Case C — 동시 3+ tier (rare, ≤ 1%)

큐 길이 ≥ 3 시 **screen shake amplitude 는 큐 최대값만 적용 (합산 금지)**. 합산 18px 시 카메라 멀미 risk → cap.

```ts
const shakePx = Math.max(...queue.map(m => SHAKE_BY_TIER[m.tier]));
```

## 모바일 safe area

VFX overlay 가 `inset: 0` 또는 단순 viewport center 일 때, iPhone 14 notch (47px) + home indicator (34px) 와 충돌 가능. 대응:

```css
.milestone-vfx-overlay {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  /* tier 7-8 (560-640px) 시 viewport 짧은 변 (390px) 초과 가능 */
  max-width: calc(100vw - env(safe-area-inset-left) - env(safe-area-inset-right));
  max-height: calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom));
  pointer-events: none;
  z-index: 9999;
}
```

screen shake 는 **root `<div>` 의 `transform: translate(±Npx)`** 만. body / html 직접 변형은 `viewport-fit=cover` 의 notch 영역 노출 시 검은 띠가 됨 — 회피.

## 접근성

### reduced-motion 환경

```css
@media (prefers-reduced-motion: reduce) {
  .milestone-vfx-shake { animation: none !important; }
  .milestone-vfx-flash { animation-duration: 200ms !important; } /* scale 만 짧게 */
}
```

- shake 완전 비활성 (translate 0).
- flash (radial-gradient scale) 는 200ms 로 단축 — milestone 도달 자체는 *시각 알림* 으로 필요. opacity 만 살리고 scale 폭은 50% 로 줄임.
- particle layer (선택적 PNG scatter) 도 animation 정지, 정적 표시.

### sound mute

PRD §F2 §동작 의 `playSfx` 호출은 SoundManager 의 `getVolume() === 0` 또는 `.ogg` 누락 시 silent fallback. 추가 작업 0 — cycle 4b 패턴 그대로 답습.

### screen reader

VFX 는 시각 전용 → 시각장애 사용자에게 milestone 도달 정보 손실. 보강:

```tsx
<div
  aria-live="polite"
  role="status"
  className="sr-only"  /* visually hidden */
>
  {currentMilestone && `레벨 ${currentMilestone.thresholdLv.toLocaleString()} 돌파`}
</div>
```

`role="status"` + `aria-live="polite"` = 다른 announcement 끝난 뒤 alert. tier 별 다른 텍스트 (예: tier 8 = "10억 레벨 돌파, 전설의 영웅") 도 향후 cycle 후보.

### color contrast (WCAG)

dark bg (`#1a1a1a`) 위 PRD §F2 8 tier 색 검사: tier 1-5 + 7-8 = AAA/AA 안전, **tier 6 (보라 `#aa44ff`) ≈ 4.2:1 로 AA 최저 (4.5:1) 미달**. radial-gradient 중심부 (white-ish) 가 stop 0.4-0.6 점유하여 *전면 flash* 는 안전. 단 *border outline / badge* 만으로 끝나는 UI 가 tier 6 보라 단색이면 reject — 흰색 stop 같이.

## Usability — shake 빈도 분석

PRD R2 + cycle 17 baseline 으로 산출.

- **cycle 1 회 평균 milestone count** = 4-6 (tier 1-6 도달, tier 7-8 outlier).
- **cycle 1 회 평균 시간** = idle ~수 시간 (V3 eternal hero). milestone 간 평균 간격 = 수십 분.
- **연속 (1 batch 안 다단) crossing** = cycle 시작 직후 ramp 1-2 회 (tier 1+2), 그 후 시간상 균등.
- **카메라 멀미 누적 risk** = §Case C 의 cap rule (max 만 적용) 로 차단.

→ **결론**: nuisance 가능성 낮음. 단 검증 시점에 dev server 에서 cycle 1-2 회 직접 관찰 권장. 만약 ramp 시 tier 1+2 sequential 1.4s 가 *불쾌* 느낌이면 carry-over 후보:

- option A: tier 1 (lv 100) shake 제거 (4px → 0px), flash 만.
- option B: 같은 batch 안 가장 높은 tier 만 VFX, 낮은 tier 는 saga record 만.

이 결정은 cycle 106 직후 user feedback 으로 확정. 가이드는 *carry-over* 표시만.

## 토큰 사용 — raw hex → CSS custom property wrap

페르소나 §절대 금지: "토큰 외 raw hex 추천 금지". PRD §F2 의 8 hex 는 *milestone palette content data* 이지 UI theme 색이 아님. **`theme-modern-dark-gold` 와 분리된 namespace** 로 wrap:

```css
:root {
  --color-milestone-tier-1: #88ff88; /* ... tier 2..8 동일 패턴 */
}
.milestone-vfx-flash[data-tier="3"] {
  background: radial-gradient(circle, var(--color-milestone-tier-3), transparent 70%);
}
```

- inline `style={{ background: '#ffdd44' }}` 금지 → 모두 custom property 경유.
- `--color-milestone-*` prefix 강제 (theme token namespace 충돌 회피).
- VFX overlay 자체는 신규 animation primitive — `forge-screen`/`forge-button` 재발명 아님.

## F3 옵션 — SagaBookModal milestone pin mockup

F3 미구현 상태에서도 F1 의 saga record 는 저장 (PRD §F1 §동작). F3 가 들어가면 다음 mockup:

```
┌─ SagaBookModal ───────────────────────────────┐
│  [필터: 전체 ▼]                                │
├───────────────────────────────────────────────┤
│ ★ tier-5  💥 레벨 1,000,000 돌파 (마젠타)     │  ← milestone record
│   몬스터 격파 — 황금사자 lv 543,210           │  ← battle record (기존)
│ ★ tier-3  💥 레벨 10,000 돌파 (금)            │  ← milestone record
│   레벨업 — lv 8,212 → 12,500                  │  ← levelup record (기존)
└───────────────────────────────────────────────┘
```

- ★ = unicode `★`, 색은 `--color-milestone-tier-N` content token.
- EventFilter 에 `'milestone'` 추가, dropdown 첫 옵션.
- per-tier badge 는 별도 cycle.

## 잘못된 패턴

- **VFX 가 hero stat / atk / hp 에 영향** — PRD §F2 §반대 기준 명시. visual 전용.
- **shake amplitude 합산** — §Case C 의 cap rule 깸. max 만 적용.
- **inline raw hex** — 8 색 모두 CSS custom property 경유 (§토큰 사용).
- **Phaser canvas 안 직접 render** — PRD §F2 §반대 기준. React DOM portal 만.
- **body / html 직접 transform** — notch 영역 검은 띠. root `<div>` 만 변형.
- **persist write** — PRD §R1. `recentMilestones` partialize blacklist 필수.
- **자동 dismiss 없는 timer** — `setTimeout` self-unmount 단발만. `setInterval` 금지.
- **reduced-motion 무시** — `@media` rule 필수. shake 비활성 + flash 단축.

## 자가 검증

raw hex CSS custom property wrap / safe area / reduced-motion + mute + screen reader / shake cap rule / forge-* 재발명 없음 / VFX non-interactive (pointer-events: none → 44px 무관, 5+ primary action 무관) — 모두 cover.
