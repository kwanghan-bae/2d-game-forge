# Cycle 156 에셋 조사 (Free Asset Investigator)

> Cycle 155 의 N5 시즌 패스 (SeasonPassScreen, MainMenu 진입점) 까지 진행 완료.
> 시각 자산 0 — emoji (🎫, 🎁, ★, ✨) 와 text 만으로 buy-time. 이 cycle 은
> **discovery 만** — 실제 다운로드/통합은 cycle 158+ 별도 cycle.

---

## 1. 라이선스 매니페스트 현황

| 항목 | 위치 | 상태 |
|---|---|---|
| Audio (sounds/sfx, sounds/bgm) | `games/inflation-rpg/public/sounds/README.md` | ★ 존재. CC0 1.0 + iwenzhou/kenney mirror 출처 명시 |
| 기존 sprite (`assets/images/*.png`) | (없음) | **누락**. 25+ tileset / sheet 의 라이선스 한 줄도 없음 |
| 신규 UI emoji 대체 시 | (없음) | 신규 추가 시 manifest 도 함께 만들어야 함 |

### 권장 — 통합 manifest 신설

신규 file = `docs/CREDITS.md` (레포 root docs). 이유:
1. cycle 105 가 이미 동일 권장 (`cycle-105-assets.md` §라이선스 매니페스트).
2. 게임 내 settings 화면이 아직 attribution 표시 panel 없음 — file 1 개로 통합 관리.
3. 새 게임 (게임 #2) 도착 시 게임별 sub-section 으로 확장 가능.

### `docs/CREDITS.md` 초안 (cycle 156 시점 갱신)

```markdown
# 무료 에셋 출처 (2d-game-forge monorepo)

## inflation-rpg

### Audio — CC0 1.0 Universal
- `public/sounds/sfx/*.ogg` — Kenney Audio Pack 1 (UI / RPG / Digital / Jingle / Impact)
  - 미러: https://github.com/iwenzhou/kenney
  - 원본: https://kenney.nl/assets/
- `public/sounds/bgm/*.ogg` — Kenney NES Jingles (loop=true 처리)
- `public/assets/sounds/*.ogg` — Kenney impact/step 변종 (cycle 1-100 legacy)

### Images — CC0 1.0 Universal (출처 추적 필요)
- `public/assets/images/joseon_*` — itch.io "Pixel Art Joseon Korea" pack (CC0 추정)
  TODO: 정확한 pack URL 회복 (cycle 1 phase-2 시점 누락).
- `public/assets/images/tiny_*_sheet.png` — Kenney Tiny Town/Dungeon/Battle (CC0)
  https://kenney.nl/assets/tiny-town
- `public/assets/images/UI/*.png` — Kenney UI Pack (CC0)
  https://kenney.nl/assets/ui-pack
- `public/assets/images/UI/icons/*` — Kenney Game Icons (CC0)

전체 라이선스: CC0 1.0 Universal (퍼블릭 도메인). attribution 의무 없음.
```

**즉시 액션 (cycle 156, scope 적음)**: 위 file 신설 + 기존 25 file 출처 best-effort
recovery. cycle 158+ 신규 추가 시 같은 file 에 sub-section 추가.

---

## 2. Cycle 156+ 가 *필요할 가능성 높은* asset 카테고리

cycle 155 까지의 N5 시즌 패스 시각화 현황 = 0. critic / story-critic 이
cycle 156+ 에서 "톤 보강" 권고 가능성 높음. 우선순위 = **emoji → SVG/PNG
icon 전환** (text-only 게임은 unprofessional).

| # | 카테고리 | 수량 | 톤 요구 | 우선순위 |
|---|---|---|---|---|
| **A** | Season token icon (현재 🎫 대체) | 1 base + 1 hover | modern dark gold UI 정합, 16×16 또는 24×24 SVG | **★ 최우선** (단일 file 로 영향 큼) |
| **B** | ClaimerTier badge 5 종 (신참/노련/숙련/마스터/전설) | 5 PNG 또는 SVG | tier 톤 차별화 (bronze→silver→gold→platinum→rainbow), 32×32 | ★ 우선 |
| **C** | SeasonalModifier axis icon 3 종 (trait/narrative/cosmetic) | 3 SVG | UI 정합, 16×16 | △ (axis 3 종 정도면 매핑 단순) |
| **D** | Claim VFX (cycle 138 의 pulse 외) | 1 sprite-sheet 또는 CSS keyframe | 16-bit pixel 정합, 64×64 4 frame | △ (CSS only 도 가능, 자산 의무 0) |
| **E** | 도전과제 lock/unlock badge | 2 SVG (lock / unlock) | UI 정합, 24×24 | △ (Lucide-react 의 `Lock`/`Unlock` 으로 충분) |

**통합 비용 견적 (cycle 156 단독)**:
- A + B 만 = 1 + 5 = 6 asset. 30 개 limit 룰 여유 충분.
- C 추가 시 = 9 asset.
- D + E 까지 = 11-12 asset. 한 cycle 한계 미달.

**권장 cycle 156 entry** = **A + B 만** (6 asset). C/D/E 는 cycle 158/160 분할.

---

## 3. 카테고리별 후보 풀

### A — Season Token Icon (🎫 → vector/raster)

| # | 출처 | 라이선스 | URL | 톤 fit | 사이즈 | 권장 |
|---|---|---|---|---|---|---|
| 1 | **Lucide Icons — `Ticket`** | ISC (MIT 호환) | https://lucide.dev/icons/ticket | 9/10 (modern, dark gold tint 가능) | <1 KB SVG | ★★ (이미 React 인프라 정합) |
| 2 | **game-icons.net — `Ticket` (Delapouite)** | CC-BY 3.0 | https://game-icons.net/1x1/delapouite/ticket.html | 8/10 (라인아트 → recolor 필요) | <2 KB SVG | backup |
| 3 | **Kenney Game Icons — `ticket.png`** | CC0 | https://kenney.nl/assets/game-icons | 7/10 (raster only, scale 시 blur) | ~2 KB PNG | backup |
| 4 | **Tabler Icons — `ticket`** | MIT | https://tabler.io/icons/icon/ticket | 9/10 (Lucide 와 유사 vector) | <1 KB SVG | ★ alternative |
| 5 | **Heroicons — `ticket`** | MIT | https://heroicons.com/ | 8/10 (solid/outline 2 variant) | <1 KB SVG | backup |

**권장**: Lucide `Ticket` (#1). 이유 = (1) inflation-rpg 의 React 의존성 정합,
(2) `<Ticket size={16} color="#ffd700"/>` 으로 inline tint, (3) MIT 라
attribution 의무 0 (코드에 LICENSE 사본만 충분, 게임 내 표기 의무 없음).

`pnpm add lucide-react` 또는 `pnpm add @tabler/icons-react` 1 회로 끝.

### B — ClaimerTier Badge 5 종

| # | 출처 | 라이선스 | URL | 톤 fit | 사이즈 | 권장 |
|---|---|---|---|---|---|---|
| 1 | **Kenney Medal Pack** | CC0 | https://kenney.nl/assets/medal-pack | 10/10 (bronze/silver/gold 3 종 + ribbon variant) | ~1 MB zip | ★★ (5 tier 직접 매핑) |
| 2 | **OpenGameArt — "Achievement Badges"** (Sharm) | CC0 | https://opengameart.org/content/achievements-set | 9/10 (8 종 색 variant, tier 매핑 가능) | ~200 KB | ★ |
| 3 | **game-icons.net — `laurels` / `crown` / `star`** | CC-BY 3.0 | https://game-icons.net/tags/achievement | 7/10 (라인아트, attribution 필요) | <2 KB SVG / 종 | backup |
| 4 | **itch.io — "Pixel Achievement Pack"** (다수) | varies (CC0/CC-BY 혼재) | https://itch.io/game-assets/free/tag-badges | 8/10 | varies | last resort |
| 5 | **Lucide — `Award` / `Trophy` / `Medal` / `Crown` / `Sparkles`** | ISC/MIT | https://lucide.dev/icons/award | 9/10 (5 종 직접 매핑 가능, color prop 으로 tier 색 분리) | <1 KB SVG / 종 | ★★ (#1 보완) |

**권장 매핑** (Kenney Medal Pack #1 우선):
- 신참 = `medal_bronze_simple.png`
- 노련 = `medal_silver_simple.png`
- 숙련 = `medal_gold_simple.png`
- 마스터 = `medal_gold_ribbon.png`
- 전설 = `medal_rainbow_ribbon.png` (또는 Lucide `Crown` + CSS rainbow gradient)

또는 **all-Lucide** (라이선스 simplicity):
- 신참 = `<Sparkles color="#888"/>` (회색)
- 노련 = `<Medal color="#cd7f32"/>` (bronze)
- 숙련 = `<Award color="#c0c0c0"/>` (silver)
- 마스터 = `<Trophy color="#ffd700"/>` (gold)
- 전설 = `<Crown color="#ff00ff"/>` + CSS animate (rainbow)

### C — SeasonalModifier Axis Icon 3 종 (trait/narrative/cosmetic)

| # | 출처 | 라이선스 | URL | 톤 fit | 권장 |
|---|---|---|---|---|---|
| 1 | **Lucide** — `Swords` (trait) / `BookOpen` (narrative) / `Palette` (cosmetic) | ISC/MIT | https://lucide.dev/icons | 9/10 | ★ |
| 2 | **game-icons.net** — `swords-emblem` / `scroll-quill` / `paint-brush` | CC-BY 3.0 | https://game-icons.net/ | 8/10 (라인아트, attribution 필수) | backup |
| 3 | **Kenney Game Icons** — `swords.png` / `book.png` (palette 없음) | CC0 | https://kenney.nl/assets/game-icons | 7/10 (cosmetic axis fit 약함) | backup |

**권장**: Lucide #1 (`Swords` / `BookOpen` / `Palette`). 라이선스 simplicity
+ axis 3 종이라 라이브러리 1 개로 충분.

### D — Claim VFX (cycle 138 pulse 외 추가 — optional)

| # | 출처 | 라이선스 | URL | 톤 fit | 권장 |
|---|---|---|---|---|---|
| 1 | **Kenney Particle Pack** (cycle 105 이미 검토) | CC0 | https://kenney.nl/assets/particle-pack | 9/10 | ★ (재활용) |
| 2 | **CSS-only `@keyframes` pulse + radial gradient** | N/A | (자체 작성) | 8/10 | ★★ (자산 0, 즉시) |
| 3 | **OpenGameArt — "RPG Pickup Effects"** (검색) | CC0 우선 | https://opengameart.org/art-search-advanced?keys=pickup | 7/10 | backup |

**권장**: CSS-only #2. 이유 = cycle 138 의 pulse 가 이미 CSS 라면 동일 패턴으로
"sparkle scatter" 1 종 추가하면 됨. 자산 다운로드 0. 톤 정합도 modern dark gold
UI 의 색 token 직접 재사용.

### E — 도전과제 lock/unlock badge

| # | 출처 | 라이선스 | URL | 톤 fit | 권장 |
|---|---|---|---|---|---|
| 1 | **Lucide** — `Lock` / `LockOpen` | ISC/MIT | https://lucide.dev/icons/lock | 10/10 | ★★ |
| 2 | **Tabler Icons** — `lock` / `lock-open` | MIT | https://tabler.io/icons/icon/lock | 9/10 | backup |
| 3 | **Kenney Game Icons** — `lock.png` / `lock_open.png` | CC0 | https://kenney.nl/assets/game-icons | 7/10 (raster) | backup |

**권장**: Lucide #1. A/C 와 동일 라이브러리 묶음.

---

## 4. 라이선스 매니페스트 갱신 권장 — `docs/CREDITS.md`

### Cycle 156 entry 가 A + B 만이라고 가정한 추가 라인

```markdown
### Icons (vector) — ISC / MIT
- `lucide-react@<version>` — Lucide Contributors — ISC License
  https://github.com/lucide-icons/lucide
  사용처: SeasonPassScreen `<Ticket/>` (token icon), MainMenu `<Ticket/>`
  attribution 의무: 라이브러리 코드 LICENSE 파일에 자동 포함 — 게임 내 명시
  의무 없음.

### Badges (raster) — CC0 1.0 Universal
- `public/assets/images/UI/badges/medal-bronze.png` — Kenney Medal Pack
  https://kenney.nl/assets/medal-pack (rename: medal_bronze_simple → medal-bronze)
- `public/assets/images/UI/badges/medal-silver.png` — 동일
- `public/assets/images/UI/badges/medal-gold.png` — 동일
- `public/assets/images/UI/badges/medal-gold-ribbon.png` — 동일
- `public/assets/images/UI/badges/medal-rainbow.png` — 동일 또는 CSS gradient
  fallback

전체 라이선스: ISC + CC0 — attribution 의무 0 (라이브러리 LICENSE 자동 포함).
```

### `package.json` 의 attribution 의무 (Lucide ISC)

- ISC 라이선스는 MIT 와 유사 — 코드 재배포 시 LICENSE 사본 동봉 의무.
  `pnpm add lucide-react` 자동 처리 (`node_modules/lucide-react/LICENSE`).
- **게임 UI 내 별도 명시 의무 없음** — settings 화면의 credits panel 에
  optional 로만 표시.

---

## 5. 재사용 가능 기존 에셋

cycle 155 시즌 패스 시각화에 즉시 재활용 가능한 기존 자산:

| 기존 file | 재활용 위치 |
|---|---|
| `public/assets/images/UI/icons/check.png` (CC0) | "수령 완료" 상태 (현재 ✅ emoji) |
| `public/assets/images/UI/icons/cross.png` (CC0) | "lock" 상태 fallback |
| `public/assets/images/UI/icons/circle.png` (CC0) | "미달성" 상태 (현재 ◯ emoji) — **즉시 1:1 대체 가능** |
| `public/sounds/sfx/coin.ogg` (CC0) | claim 시 sound (이미 wire 됐을 가능성 — 확인 필요) |
| `public/sounds/sfx/levelup.ogg` (CC0) | tier 진입 시 jingle |
| `public/sounds/sfx/quest-complete.ogg` (CC0) | tier 진입 시 alt |

**가장 ROI 높은 cycle 156 sub-action**:
1. SeasonPassScreen 의 ◯/🎁/✅ emoji 3 종 → 기존 `UI/icons/{circle,present-not-yet,check}.png` 매핑
   (present 는 미존재 — Kenney Game Icons 에서 1 개만 추가 fetch)
2. 추가 fetch = 1 PNG only — 통합 비용 극소.

---

## 6. 표류 경고

- **emoji → asset 전환 비용 vs 가치**: emoji 는 cross-platform 렌더 일관성 약함
  (iOS vs Android vs web 다 다름). asset 으로 전환 시 톤 통제 가능 — 가치 큼.
  단 한 cycle 에 6 개 이상 추가 시 통합 비용 vs 시각 점진 개선 ROI 가 떨어짐.
  **cycle 156 = A + B (6 asset) 만 권장.**
- **Lucide-react bundle size**: `lucide-react` 는 tree-shakable — import 한
  아이콘만 번들됨. 5 종만 쓰면 ~10 KB. 우려 없음.
- **Kenney Medal Pack 자동 fetch 불가**: cloudflare 보호. 기존 `scripts/fetch-sounds.sh`
  패턴 (manual 안내) 답습 — `scripts/fetch-badges.sh` 신규 권장.
- **game-icons.net (CC-BY 3.0) 사용 시 attribution 의무**: 게임 내 credits
  panel 신설 의무. Lucide / Kenney 만 쓰면 의무 0 → **CC-BY 3.0 회피 우선**.
- **`public/assets/images/joseon_*` 출처 미상**: cycle 156 sub-task 로
  best-effort 출처 회복 권장. itch.io 검색 ("joseon pixel art free") 으로
  pack 식별 가능성 높음. 회복 실패 시 game-critic / planner 에 "라이선스
  리스크 잔존" flag.
- **D (claim VFX) 는 CSS-only 가 가성비 최고**. 자산 다운로드 회피.
- **cycle 156 entry = A+B 만 권장**. C/D/E 는 cycle 158/160 분할로 budget 보호.

---

## 한 줄 요약

> **Cycle 156 = `docs/CREDITS.md` 신설 + A (Lucide `Ticket`) + B (Kenney Medal Pack
> 5 종 또는 Lucide all-vector) 만 fetch.** 6 asset 통합. Lucide ISC + Kenney
> CC0 = attribution 의무 0. C/D/E 는 cycle 158/160 분할. 기존 `UI/icons/circle.png`
> + `check.png` 즉시 emoji 대체 가능 — 우선 sub-task.
