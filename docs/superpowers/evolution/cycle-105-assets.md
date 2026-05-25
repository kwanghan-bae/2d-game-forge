# Cycle 105 에셋 조사 (Free Asset Investigator)

> 비평가 (cycle-105-critic.md) 가 surface 한 5 NEW 방향 (N1-N5) 에 대한 에셋 요구
> 분석. 추천 cycle 105 entry = N1 (Inflation Milestone VFX, scope 1 cycle, HIGH).
> 이 문서는 N1 만 즉시 필요 — N2-N5 는 referential roadmap.

## 기존 인벤토리 (재사용 우선)

| 카테고리 | 위치 | 현황 |
|---|---|---|
| SFX | `games/inflation-rpg/public/sounds/sfx/` | 12 파일 — click / coin / craft / crit / equip / heal / hit / levelup / skill / quest-complete / boss-victory / defeat |
| BGM | `games/inflation-rpg/public/sounds/bgm/` | 3 파일 — lobby / field / battle |
| Sprite (raster) | `games/inflation-rpg/public/assets/images/` | 25+ 파일 — joseon tileset / pixel battle bg / warrior sheet / dokkaebi / slash_effect 등 |
| UI sub-folder | `games/inflation-rpg/public/assets/images/UI/` | 별도 점검 필요 |
| Font | (별도 폴더 없음) | next 기본 system font + Tailwind 기본 stack |

**즉시 재사용 가능 후보**:
- `slash_effect.png` — N1 의 작은 tier (10×/100×) 폭발 base 로 재활용 가능, 색 tint 만 다르게.
- `levelup.ogg` — N1 의 lower tier (10×, 100×) sound stinger 로 재활용. milestone-specific 한 huge stinger 만 새로 fetch.

---

## PRD 의 에셋 요구 (N1-N5 매핑)

| 방향 | 카테고리 | 수량 | 톤 요구 | 우선순위 |
|---|---|---|---|---|
| **N1 Inflation Milestone VFX** | sprite-sheet (particle), sfx (stinger), bgm (optional sting) | 8 tier × 1 = 8 particle + 3-5 sfx | 16-bit pixel + chiptune, 기존 톤 정합 | **즉시** (cycle 105) |
| **N2 Mid-cycle Decision Surface** | UI icon (buff card frame, dice, fork arrow), sfx (card flip, choice confirm) | 6-10 icon + 2 sfx | modern dark gold UI 정합 | cycle 106-110 |
| **N3 Hall of Sagas** | background (library/shelf), book/scroll sprite, frame/badge UI, page-flip sfx | 1 bg + 3-5 ui + 1 sfx | 16-bit pixel + parchment 톤 | cycle 111+ |
| **N4 Run Statistics View** | (에셋 거의 무, recharts SVG inline) | 0-2 icon (chart legend) | CSS-only 우선 | cycle 105 alt |
| **N5 Live Op** | banner image (event splash), season icon set (12), achievement badge (20+) | 33+ asset | 16-bit pixel + tier color | mega-phase |

**총 통합 비용**: cycle 105 단독 = N1 의 8 particle + 3 sfx (~11 asset). cycle 한 번에 30 개 이상 추가 금지 룰 준수.

---

## 카테고리별 후보

### N1-particle — Milestone 폭발 스프라이트 시트 (8 tier)

| # | 출처 | 라이선스 | URL | 톤 fit | 사이즈 | 권장 |
|---|---|---|---|---|---|---|
| 1 | **Kenney Particle Pack** | CC0 1.0 | https://kenney.nl/assets/particle-pack | 9/10 (16-bit 정합) | ~4 MB zip, 200+ PNG | ★ |
| 2 | **OpenGameArt — "explosion-animations"** (StumpyStrust) | CC0 | https://opengameart.org/content/explosion-animations-pack | 8/10 | ~1 MB | backup |
| 3 | **OpenGameArt — "16x16 explosion"** (Master484) | CC0 | https://opengameart.org/content/explosion-sheet-9 | 10/10 (정확히 16-bit) | <100 KB | tier 1-3 우선 |

**권장 통합 (N1-particle)**:
- 다운로드: Kenney Particle Pack zip → `games/inflation-rpg/public/assets/images/particles/`
- 8 tier preset (10× / 100× / 1k× / 10k× / 100k× / 1M× / 10M× / 100M×) 별 1 sheet 선정:
  - tier 1-3 = Kenney `light_*.png` + Master484 16x16 explosion (소규모)
  - tier 4-6 = Kenney `magic_*.png` + `star_*.png` (중규모)
  - tier 7-8 = StumpyStrust explosion-animations 대형 frame (대규모, 풀스크린)
- 파일명 규칙: `milestone-tier-{1..8}.png` (kebab-case)
- 라이선스 명시: 모두 CC0 — attribution 의무 없으나 CREDITS.md 에는 출처 명시.

### N1-sfx — Milestone stinger (3-5 variant)

| # | 출처 | 라이선스 | URL | 톤 fit | 사이즈 | 권장 |
|---|---|---|---|---|---|---|
| 1 | **Kenney Sci-fi Sounds** (laser/stinger) | CC0 1.0 | https://kenney.nl/assets/sci-fi-sounds | 8/10 (chiptune 보강) | ~3 MB | ★ tier 1-4 |
| 2 | **Kenney Impact Sounds** | CC0 | https://kenney.nl/assets/impact-sounds | 9/10 | ~1 MB | ★ tier 5-7 (큰 충격) |
| 3 | **Freesound — "8bit fanfare"** (검색어, user 별 다양) | 대부분 CC0 또는 CC-BY 4.0 | https://freesound.org/search/?q=8bit+fanfare&f=license:%22Creative+Commons+0%22 | 10/10 (chiptune 정합) | <100 KB / variant | tier 8 (최고 milestone) |

**권장 통합 (N1-sfx)**:
- 다운로드: Kenney Sci-fi + Impact pack → `games/inflation-rpg/public/sounds/sfx/milestone/`
- 파일명: `milestone-stinger-{small,medium,large,mega}.ogg` (4 variant, tier 별 매핑)
- 변환: 원본이 .wav 면 `ffmpeg -i raw.wav -c:a libvorbis -q:a 4 milestone-stinger-large.ogg`
- Freesound CC-BY 사용 시 라이선스 명시 의무 — CREDITS.md 에 사용자명 + URL 필수.

### N2-icon — Decision Surface UI (cycle 106+, 참고용)

| # | 출처 | 라이선스 | URL | 톤 fit | 권장 |
|---|---|---|---|---|---|
| 1 | **Kenney Game Icons Pack** | CC0 | https://kenney.nl/assets/game-icons | 9/10 | ★ |
| 2 | **Kenney UI Pack RPG Expansion** | CC0 | https://kenney.nl/assets/ui-pack-rpg-expansion | 10/10 (dark gold 정합) | ★ |
| 3 | **game-icons.net** (Lorc, Delapouite) | CC-BY 3.0 | https://game-icons.net/ | 8/10 (라인 아트, recolor 필요) | backup |

### N3-background — Hall of Sagas (cycle 111+, 참고용)

| # | 출처 | 라이선스 | URL | 톤 fit | 권장 |
|---|---|---|---|---|---|
| 1 | **OpenGameArt — "ancient library"** (검색) | CC0 우선 필터 | https://opengameart.org/art-search-advanced?keys=library&field_art_licenses_tid%5B%5D=4 | 8/10 (parchment) | ★ |
| 2 | **itch.io free pixel backgrounds** (PixelHole 등 다수) | 대부분 free + CC-BY | https://itch.io/game-assets/free/tag-backgrounds/tag-pixel-art | 9/10 | backup |
| 3 | **Pixabay illustrations** (검색 "library pixel") | Pixabay Content License (free commercial, no attribution required) | https://pixabay.com/illustrations/search/library%20pixel/ | 7/10 (raster, pixel art 비율 낮음) | last resort |

### N4-chart — Statistics View (cycle 105 alt)

- **에셋 거의 무**. recharts (npm) 또는 inline SVG 로 처리. CSS-only.
- Optional icon: Lucide-react (이미 의존성 가능성 있음, MIT) 의 `TrendingUp`, `Activity`, `BarChart3`.
- 다운로드 의무 0. **이 방향은 에셋 조사관 가치 매우 낮음** — frontend 디자이너 / planner 영역.

### N5-banner — Live Op (mega-phase, 참고용)

| # | 출처 | 라이선스 | URL | 톤 fit | 권장 |
|---|---|---|---|---|---|
| 1 | **Kenney Banner Pack** | CC0 | https://kenney.nl/assets/banner-pack | 9/10 | ★ |
| 2 | **OpenGameArt — "achievement badges"** | CC0 (검색 필터) | https://opengameart.org/art-search-advanced?keys=achievement+badge | 8/10 | ★ |
| 3 | **itch.io seasonal asset packs** (다수 free + CC-BY) | varies | https://itch.io/game-assets/free/tag-seasonal | 7/10 | mega-phase 후반 |

---

## 라이선스 비교 — CC0 vs CC-BY 차이 (필수 숙지)

| 라이선스 | attribution 의무 | share-alike | 상용 사용 | 게임 출시 적합 |
|---|---|---|---|---|
| **CC0 1.0** | 없음 | 없음 | 가능 | ★ (최우선) |
| **Public Domain** | 없음 | 없음 | 가능 | ★ |
| **CC-BY 3.0/4.0** | **필수** (저자명 + URL + 라이선스 명시) | 없음 | 가능 | ★★ (CREDITS.md 의무) |
| **CC-BY-SA** | 필수 | **필수** (파생물도 동일 라이선스) | 가능 | △ (게임 코드 SA 전염 우려, 보통 회피) |
| **CC-BY-NC** | 필수 | varies | **불가** (non-commercial) | ✗ (출시 게임 부적합) |
| **OFL (Open Font License)** | 사용 시 attribution 권고, 폰트 자체 재배포 시 필수 | 폰트 self 만 | 가능 | ★ (폰트 전용) |
| **MIT** (코드) | 필수 (LICENSE 사본) | 없음 | 가능 | ★ (라이브러리 전용, 에셋 아님) |

**이 레포 정책**:
- 1순위 = CC0 (attribution 0 의무, 마찰 zero). 현재 12 SFX + 3 BGM 모두 CC0.
- 2순위 = CC-BY 4.0 (CREDITS.md 의무 명시). 단 Pixabay Content License 는 attribution-not-required 라 CC0 와 사실상 동급.
- 금지 = CC-BY-NC, CC-BY-SA (전염 우려 시), 라이선스 불명.

---

## 다운로드 자동화 — `scripts/fetch-sounds.sh` 패턴 확장 제안

현재 `scripts/fetch-sounds.sh` 는 26 줄, **mkdir + echo 안내문만**. 실제 wget/curl 자동
다운로드는 없음 — Kenney/OpenGameArt 의 zip URL 이 cloudflare cookie 등으로 hot-link
가 막혀있어 의도적으로 manual 임. 이 패턴을 N1 에 확장:

### 권장 구조 (cycle 105 신규)

```
scripts/
├── fetch-sounds.sh          # 기존 — manual instruction (cycle 1-104)
├── fetch-particles.sh       # 신규 — N1 particle sheet (cycle 105)
└── fetch-assets-all.sh      # 신규 — 모든 fetch-*.sh 를 chain 호출
```

### `fetch-particles.sh` 초안 (26 줄 패턴 답습)

```bash
#!/usr/bin/env bash
# Fetch CC0 particle sprite sheets for inflation-rpg N1 milestone VFX.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PARTICLE_DIR="$ROOT/games/inflation-rpg/public/assets/images/particles"
mkdir -p "$PARTICLE_DIR"

echo "==> 파티클 자산 디렉토리 준비 완료."
echo
echo "수동 다운로드 안내:"
echo "  1. Kenney Particle Pack:  https://kenney.nl/assets/particle-pack"
echo "     → particles/milestone-tier-{1..4}.png  (light_*, magic_*, star_* 골라 rename)"
echo "  2. OpenGameArt explosion: https://opengameart.org/content/explosion-animations-pack"
echo "     → particles/milestone-tier-{5..7}.png  (StumpyStrust CC0)"
echo "  3. Master484 16x16:        https://opengameart.org/content/explosion-sheet-9"
echo "     → particles/milestone-tier-8.png       (대형 풀스크린)"
echo
echo "변환 (필요 시): ImageMagick"
echo "  convert raw.png -filter point -resize 200% milestone-tier-N.png"
echo
echo "전체 라이선스: CC0 1.0 Universal."
echo "파일 누락 시: MilestoneVFX 가 fallback (단색 flash) — 게임 정상 작동."
```

### `fetch-assets-all.sh` 초안

```bash
#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
bash "$DIR/fetch-sounds.sh"
bash "$DIR/fetch-particles.sh"
# 추후 fetch-ui.sh, fetch-fonts.sh 추가 시 여기에 chain
echo "==> 전체 무료 에셋 fetch 안내 완료. zip 다운로드 후 수동 배치."
```

### 자동화 한계

- Kenney zip URL 은 cloudflare 보호로 `curl -L` 직접 안 됨. headless browser (playwright) 자동화 가능하나 cycle 105 의 1-cycle scope 초과.
- OpenGameArt 는 `wget` 가능한 hot-link 다수 — 일부 자산은 자동 fetch 후보:
  ```bash
  curl -L "https://opengameart.org/sites/default/files/explosion_X.png" -o "$DIR/explosion-X.png"
  ```
  단 URL 가 갱신될 수 있어 fragility 있음. **manual 안내 유지 + URL 만 정확히 적는 게 sustainable**.

---

## 권장 통합 (cycle 105 단일 cycle)

### N1 의 sprite + sfx

**1단계 (필수)**:
- 다운로드: Kenney Particle Pack (https://kenney.nl/assets/particle-pack) + Kenney Impact Sounds (https://kenney.nl/assets/impact-sounds)
- 압축 해제 → `games/inflation-rpg/public/assets/images/particles/milestone-tier-{1..4}.png` + `games/inflation-rpg/public/sounds/sfx/milestone/milestone-stinger-{small,medium,large}.ogg`

**2단계 (tier 5-8 보강)**:
- StumpyStrust explosion-animations + Master484 16x16 explosion → tier 5-8 sheet 채움.
- 부재 시 tier 1-4 의 sheet 를 색 tint + scale × 2 로 fallback. SoundManager 의 silent fallback 패턴 답습.

**3단계 (코드 wiring, 에셋 조사관 영역 외)**:
- `<InflationMilestoneVFX/>` 가 `particles/milestone-tier-N.png` 를 `<img>` 또는 Phaser Texture 로 load.
- `SoundManager.play('milestone-stinger-large')` 등 trigger.
- 누락 시 console.warn + silent fallback (게임 안 멈춤).

### 라이선스 매니페스트 (신규 `docs/CREDITS.md` 작성 권장)

```markdown
# 무료 에셋 출처 (inflation-rpg)

## Audio (CC0 1.0 Universal)
- sfx/* — Kenney UI Audio / Impact Sounds / RPG Audio (https://kenney.nl)
- sfx/milestone/* — Kenney Sci-fi Sounds + Impact Sounds (https://kenney.nl)
- bgm/* — OpenGameArt CC0 BGM 모음 (https://opengameart.org)

## Images (CC0 1.0 Universal)
- assets/images/* — itch.io / OpenGameArt CC0 packs (기존 pixel tileset)
- assets/images/particles/milestone-tier-{1..4}.png — Kenney Particle Pack (https://kenney.nl/assets/particle-pack)
- assets/images/particles/milestone-tier-{5..7}.png — StumpyStrust explosion-animations (https://opengameart.org/content/explosion-animations-pack)
- assets/images/particles/milestone-tier-8.png — Master484 explosion sheet (https://opengameart.org/content/explosion-sheet-9)

전체 라이선스: CC0 1.0 Universal (퍼블릭 도메인). attribution 의무 없음.
```

---

## 표류 경고

- **N5 Live Op 의 시즌 12 icon set + 도전과제 20+ badge** = 한 cycle 30+ asset 추가 룰
  위반 가능. mega-phase 로 sub-spec 5 개 분할 시 각 sub-cycle 당 6-10 asset 으로
  유지 필요.
- **Freesound 의 CC-BY 4.0 변종** 사용 시 CREDITS.md 항목당 1 줄 + 사용자명 + 원본 URL
  필수. 현재 레포는 attribution 인프라 (CREDITS.md) 가 *없음* — N1 에서 새로 만들면
  됨. cycle 105 sub-task.
- **톤 불일치 위험 낮음** — Kenney 시리즈가 16-bit pixel art 정합도가 높아 기존
  joseon/pixel tileset 와 함께 써도 무리 없음. 단 game-icons.net (Lorc) 은 라인
  아트 style 이라 dark gold UI 와 톤 어긋남 — 사용 시 recolor + frame wrap 필요.
- **3 의 룰 inverse** — 비평가의 룰 9 제안 (카테고리 3 cycle 연속 시 pivot) 에
  따르면, cycle 105 의 N1 = VFX 카테고리 1 회. cycle 106-107 도 VFX 로 가면 cycle 108
  은 다른 카테고리로 강제. **에셋 조사관 입장에서는 N1 → N2 (UI icon) → N3 (bg)
  순서가 카테고리 다양성에도 정합**.

---

## 한 줄 요약

> **Cycle 105 = N1 만 fetch.** Kenney Particle Pack + Impact Sounds (CC0) 이 1 순위.
> 11 asset (8 sheet + 3 stinger) 통합. `scripts/fetch-particles.sh` + `docs/CREDITS.md`
> 신규 작성. N2-N5 는 referential — cycle 106 이후 sub-spec 단계에서 다시 호출.
