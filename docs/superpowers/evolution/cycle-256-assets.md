# Cycle 256 에셋 조사 (Free Asset Investigator)

> Cycle 156 (직전 자율진화 asset 사이클) 의 톤·구조 답습. discovery 만,
> 통합은 cycle 258+ 별도. V3-DEF + V3-H 까지 합쳐진 현재 게임 컨텐츠
> (eternal hero idle sponsor / 6 realm / NPC 4 / EternalSaga / age cycle)
> 의 시각·청각 자산 공백을 5 카테고리로 매핑한다.

---

## 0. PRD 의 에셋 요구 (cycle 256 시점 V3 컨텐츠)

| Feature | 카테고리 | 수량 | 톤 요구 |
|---|---|---|---|
| Age Cycle (회춘 / 자연사) | VFX (sprite-sheet or CSS) | 2 moment | dark gold UI + soft glow, 비폭력적 (회춘=따뜻함 / 사망=정적 fade) |
| 6 Realm Ambient | BGM 또는 ambient SFX loop | 6 loop | base=평온 / sea=물결 / volcano=용암 깊은 울림 / underworld=낮은 합창 / heaven=고음 합창 / chaos=불협 글리치 |
| NPC 4 종 (sponsor/companion/rival/mentor) | portrait (UI dialog) | 4 base + 가능 시 expression variant | 16-bit pixel 또는 modern dark gold UI 정합. 시각적 차별화 (의상/색) |
| EternalCodex iconography | UI icon (Saga 통계용) | 6-10 | Lucide-tier vector. modern dark gold UI 정합 |
| Age tone Hero portrait variation | sprite or portrait variation | 5 age band (5/13/30/50/70) | 1 hero 의 5 stage. 16-bit pixel + 동일 base color, age 별 hair/posture 변화 |

**총 통합 예상량 (cycle 258+ 분할 후)**: VFX 2 + BGM/ambient 6 + portrait 4 +
icon 6-10 + age sprite 5 = **23-27 asset**. 30 개 limit 안에 들어옴.

---

## 1. 카테고리별 후보 풀

### A — Age Cycle VFX (회춘 / 자연사)

| # | 출처 | 라이선스 | URL | 톤 fit | 사이즈 | 권장 |
|---|---|---|---|---|---|---|
| 1 | **CSS-only `@keyframes` (radial gradient + scale)** | N/A | (자체 작성) | 9/10 (modern dark gold UI 의 color token 직접 재사용) | 0 byte | ★★ (자산 0, V3-C 의 spend modal 패턴 답습) |
| 2 | **Kenney Particle Pack** — `light_*.png` / `circle_*.png` | CC0 | https://kenney.nl/assets/particle-pack | 9/10 | ~1 MB zip | ★ (Phaser ParticleEmitter wire 가능) |
| 3 | **OpenGameArt — "Magical Glow" (Various authors)** | CC0 우선 | https://opengameart.org/art-search-advanced?keys=glow&field_art_licenses_tid%5B%5D=2 | 8/10 (제목/색 변종 다수) | varies | backup |
| 4 | **OpenGameArt — "Pixel Death Particle"** (Sharm 등) | CC0 | https://opengameart.org/content/pixel-death-effect | 8/10 (자연사 fit) | <100 KB | backup |
| 5 | **itch.io — "Free VFX Pack" (Pimen)** | CC0/CC-BY 혼재 | https://pimen.itch.io/ | 9/10 (anime 톤 풍부) | varies | last resort (라이선스 case-by-case) |

**권장**: **#1 (CSS-only) + #2 (Kenney Particle Pack) 병행**.
- 회춘 = CSS keyframe (gold ring expand → fade). 0 asset.
- 자연사 = Kenney Particle Pack 의 `light_*.png` 4 frame fade-out. 라이선스 CC0
  attribution 0.
- 통합 비용 = 1 PNG strip (Kenney) + CSS 약 30 line.

### B — 6 Realm 별 Ambient BGM / SFX Loop

| # | 출처 | 라이선스 | URL | 톤 fit | 비고 |
|---|---|---|---|---|---|
| 1 | **OpenGameArt — Phyrnna "Eden" (peaceful)** | CC-BY 3.0 | https://opengameart.org/content/eden | base 9/10 | attribution 필요 (회피 권장) |
| 2 | **OpenGameArt — alexandr-zhelanov 다수 ambient** | CC-BY 3.0 | https://opengameart.org/users/alexandr-zhelanov | 6 realm 톤 mix 8/10 | attribution |
| 3 | **OpenGameArt — Kenney "Music Loops"** (Kenney) | CC0 | https://kenney.nl/assets/music-loops | 8/10 | attribution 0 ★ |
| 4 | **OpenGameArt — "Cave Ambience" / "Volcano Rumble" / "Underwater"** (각 검색) | CC0 우선 | https://opengameart.org/art-search-advanced?keys=ambient&field_art_licenses_tid%5B%5D=2 | 9/10 (realm 별 매칭 가능) | ★ realm 별 1:1 매칭 |
| 5 | **Pixabay — Music & SFX (free)** | Pixabay License (royalty-free, attribution 불필요) | https://pixabay.com/music/search/ambient/ | 8/10 | ★ 대체 음원 풀로 양호 |
| 6 | **Freesound — `kangaroovindaloo` ambient pack** | CC0 우선 (필터 가능) | https://freesound.org/search/?q=ambient&f=license:%22Creative+Commons+0%22 | 8/10 | ★ realm 별 1:1 매핑 |

**권장 realm 별 매핑** (CC0 우선, 출처 mix):
| Realm | 후보 file | 출처 | 라이선스 |
|---|---|---|---|
| base | Kenney Music Loops "Calm" 또는 OpenGameArt "Forest Ambience" | Kenney | CC0 |
| sea | OpenGameArt / Freesound "Underwater Loop" CC0 검색 | Freesound | CC0 |
| volcano | OpenGameArt "Volcano Rumble" CC0 / Freesound "Fire Crackle Loop" | OpenGameArt | CC0 |
| underworld | Freesound "Low Drone CC0" 또는 OpenGameArt "Dungeon Ambience" | Freesound | CC0 |
| heaven | Freesound "Choir CC0" 또는 Pixabay "Ethereal Pad" | Freesound | CC0 |
| chaos | Freesound "Glitch Loop CC0" 또는 OpenGameArt "Distortion Drone" | Freesound | CC0 |

**fetch 자동화**: 기존 `scripts/fetch-sounds.sh` 패턴 확장 — `scripts/fetch-ambient.sh`
신설. iwenzhou/kenney mirror 에는 없는 음원이라 **각 realm 별 source URL
manifest + manual fetch** 가 현실적 (OpenGameArt 는 zip 인증 redirect, Freesound
는 OAuth 필요).

### C — NPC 4 종 Portrait (sponsor/companion/rival/mentor)

| # | 출처 | 라이선스 | URL | 톤 fit | 비고 |
|---|---|---|---|---|---|
| 1 | **OpenGameArt — "JRPG Portraits" (Antifarea)** | CC-BY 3.0 | https://opengameart.org/content/24-jrpg-portraits-and-some-other-clothes | 9/10 (4 종 매칭 충분) | attribution 필요 |
| 2 | **OpenGameArt — "Pixel Art Character Portraits"** (Sharm) | CC0 | https://opengameart.org/content/40-character-portraits | 9/10 | ★★ attribution 0 |
| 3 | **itch.io — "Free Portrait Pack"** (다수, 검색) | varies (CC0/CC-BY) | https://itch.io/game-assets/free/tag-portrait | 9/10 | case-by-case |
| 4 | **Kenney — "Toon Characters 1"** (도트 portrait 부재) | CC0 | https://kenney.nl/assets/toon-characters-1 | 6/10 (full-body 위주, portrait 부족) | backup |
| 5 | **OpenGameArt — "RPG Character Set"** (Reemax) | OGA-BY 3.0 / CC-BY 3.0 | https://opengameart.org/content/rpg-character-set | 8/10 | attribution |

**권장**: **#2 (OpenGameArt Sharm "40 character portraits", CC0)** 우선.
- sponsor = 부유한 노인 portrait (sheet 의 robed elder 변종)
- companion = 친근한 동료 portrait (sheet 의 cheerful youth 변종)
- rival = 거만한 라이벌 portrait (sheet 의 smirking warrior 변종)
- mentor = 현자 portrait (sheet 의 hooded sage 변종)
- 라이선스 CC0 — attribution 의무 0. 단일 PNG sheet → Phaser sprite-cropping
  또는 `Image` component 의 `object-position` slice.

### D — EternalCodex UI Iconography (saga 통계 6-10 종)

| # | 출처 | 라이선스 | URL | 톤 fit | 비고 |
|---|---|---|---|---|---|
| 1 | **Lucide Icons** — `Book` / `Scroll` / `Sword` / `Shield` / `Heart` / `Skull` / `Sparkles` / `Crown` / `Hourglass` / `Star` | ISC | https://lucide.dev/icons | 10/10 | ★★ cycle 156 의 A/C 와 동일 라이브러리 묶음 |
| 2 | **Tabler Icons** — 동일 어휘 (sword/shield/heart 등) | MIT | https://tabler.io/icons | 9/10 | backup |
| 3 | **Heroicons** — solid/outline 2 variant | MIT | https://heroicons.com/ | 8/10 | backup |
| 4 | **game-icons.net — Delapouite 다수** | CC-BY 3.0 | https://game-icons.net/ | 9/10 (게임 어휘 풍부) | attribution 필수 — 회피 권장 |
| 5 | **Kenney Game Icons** | CC0 | https://kenney.nl/assets/game-icons | 7/10 (raster only) | backup |

**권장**: **Lucide #1** (cycle 156 권장과 동일 라이브러리 — 의존성 단일화).
EternalCodex 통계 6-10 종 매핑:
| 통계 | Lucide icon |
|---|---|
| 총 영웅 수 | `Users` |
| 평균 수명 | `Hourglass` |
| 최고 레벨 | `TrendingUp` |
| 클리어 던전 | `Castle` |
| 누적 황금 | `Coins` |
| 회춘 횟수 | `Sparkles` |
| 자연사 횟수 | `Skull` |
| 라이벌 격파 | `Swords` |
| 동료 동행 | `Heart` |
| 멘토 가르침 | `BookOpen` |

**라이선스 의무 0** (ISC 자동 LICENSE 동봉). `pnpm add lucide-react` 단일 추가.

### E — Age Tone 별 Hero Portrait Variation (5/13/30/50/70)

| # | 출처 | 라이선스 | URL | 톤 fit | 비고 |
|---|---|---|---|---|---|
| 1 | **OpenGameArt — "LPC Aged Characters"** | CC-BY-SA 3.0 + GPL | https://opengameart.org/content/lpc-aged-characters | 9/10 (다양 age 직접 매칭) | share-alike + GPL — **회피** (전염성 라이선스, 모노레포 정책 충돌) |
| 2 | **OpenGameArt — "Pixel Character Aging Stages"** (검색) | CC0 우선 | https://opengameart.org/art-search-advanced?keys=aged | 8/10 | search-and-select |
| 3 | **Kenney — "Tiny Characters" (age variation 부재)** | CC0 | https://kenney.nl/assets/tiny-characters | 5/10 | backup (age 변화 표현 약함) |
| 4 | **자체 그리기 (PixilArt / Aseprite tool)** + Lucide overlay | N/A | (자체) | 10/10 (톤 100% 통제) | ★ 대규모, 다음 cycle 의 별도 task |
| 5 | **itch.io — Pimen "Character Aging Pack"** (가설, 검증 필요) | varies | https://pimen.itch.io/ | 9/10 | last resort, 라이선스 case-by-case |

**권장**: **#2 (OpenGameArt CC0 filter 검색) 우선, 실패 시 #4 (자체)**.
- 5 stage hero 는 cycle 256 시점에 sprite-level asset 신규 부담 큼.
- 단기 대안 = **single hero sprite + tint / hue-rotate / scale CSS filter**
  (age 별로 다른 톤 — V3-B 의 회춘/노화 visual cue 만 갖춤). 자산 0.
- 장기 = 5 stage 별도 sprite. **이 cycle 의 D + 다음 cycle 의 별도 task 로 분리.**

---

## 2. 권장 통합 (cycle 258+ 분할 plan)

| Cycle | 묶음 | 추가 자산 수 | 통합 비용 |
|---|---|---|---|
| **258** | **D (Lucide icon 10 종) + A (CSS-only 회춘 + Kenney particle 자연사)** | 1 lib + 1 PNG | 낮음 (`pnpm add lucide-react` + 1 fetch) |
| **260** | **C (Sharm 40 character portraits CC0)** | 1 PNG sheet → 4 crop | 중 (PNG fetch + crop slice 설정) |
| **262** | **B (6 realm ambient — CC0 우선)** | 6 OGG | 중 (각 realm 별 manual fetch + SoundManager 매핑) |
| **264** | **E (자체 그리기 또는 CC0 sprite 검색)** | 1-5 PNG | 높음 (별도 task) |

**총 4 cycle 분할**. 한 cycle 당 30 asset limit 안전 마진 충분.

### Cycle 258 entry (D + A) 의 상세 통합 명령

#### D — Lucide icon

```bash
cd /Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg
pnpm add lucide-react
# import 예: src/screens/EternalCodexScreen.tsx
# import { Users, Hourglass, TrendingUp, Castle, Coins, Sparkles, Skull, Swords, Heart, BookOpen } from 'lucide-react';
# <Users size={16} color="var(--forge-gold)"/>
```

#### A — Age cycle VFX

```bash
# 회춘 (CSS only)
# src/styles/age-cycle.css 신설
# @keyframes rejuv-pulse {
#   0% { transform: scale(0); opacity: 0.8; background: radial-gradient(circle, gold, transparent); }
#   100% { transform: scale(3); opacity: 0; }
# }

# 자연사 (Kenney Particle Pack 의 light_01.png)
# 다운로드: https://kenney.nl/assets/particle-pack (manual zip)
# → games/inflation-rpg/public/assets/images/vfx/light-fade.png
# Phaser ParticleEmitter 또는 React img + @keyframes fade
```

---

## 3. 라이선스 매니페스트 갱신 — `docs/CREDITS.md`

### Cycle 258 entry (D + A) 가 통합되면 추가될 라인

```markdown
### Icons (vector) — ISC
- `lucide-react@<version>` — Lucide Contributors — ISC License
  https://github.com/lucide-icons/lucide
  사용처: EternalCodexScreen (10 stat icon), 추가 UI screen
  attribution 의무: 라이브러리 LICENSE 자동 포함 — 게임 내 명시 의무 없음.

### VFX (raster) — CC0 1.0 Universal
- `public/assets/images/vfx/light-fade.png` — Kenney Particle Pack
  https://kenney.nl/assets/particle-pack (rename: light_01 → light-fade)
  사용처: AgeCycleScene 자연사 fade-out 파티클
- `public/styles/age-cycle.css @keyframes rejuv-pulse` — 자체 작성 (라이선스 N/A)
  사용처: AgeCycleScene 회춘 ring expand
```

### Cycle 260+ (C + B + E) 이 통합되면 추가될 라인

```markdown
### Portraits (raster) — CC0 1.0 Universal
- `public/assets/images/portraits/npc-{sponsor,companion,rival,mentor}.png`
  — Sharm "40 character portraits" — CC0
  https://opengameart.org/content/40-character-portraits
  사용처: DialogModal NPC 4 종

### Ambient (audio) — CC0 1.0 Universal (realm 별 출처 mix)
- `public/sounds/ambient/realm-base.ogg`     — Kenney Music Loops "Calm" — CC0
- `public/sounds/ambient/realm-sea.ogg`      — Freesound CC0 underwater loop (작가/URL 회복 필요)
- `public/sounds/ambient/realm-volcano.ogg`  — OpenGameArt CC0 volcano rumble (동상)
- `public/sounds/ambient/realm-underworld.ogg` — Freesound CC0 low drone (동상)
- `public/sounds/ambient/realm-heaven.ogg`   — Freesound CC0 choir (동상)
- `public/sounds/ambient/realm-chaos.ogg`    — Freesound CC0 glitch loop (동상)
  fetch 자동화: `scripts/fetch-ambient.sh` (수동 안내 형식, fetch-sounds.sh 패턴 답습)
```

---

## 4. 재사용 가능 기존 에셋

cycle 256 시점 V3 컨텐츠에 즉시 재활용 가능한 기존 자산:

| 기존 file | 재활용 위치 |
|---|---|
| `public/sounds/sfx/levelup.ogg` (CC0) | 회춘 moment SFX (rejuvenation = "level reset" 은유) |
| `public/sounds/sfx/defeat.ogg` (CC0) | 자연사 moment SFX (현재 BGM stop 만 — 추가 SFX 로 emotional cue 강화) |
| `public/sounds/bgm/lobby.ogg` (CC0) | base realm 의 임시 ambient (B 통합 전까지 fallback) |
| `public/sounds/bgm/field.ogg` (CC0) | sea/heaven realm 의 임시 ambient |
| `public/sounds/bgm/battle.ogg` (CC0) | volcano/chaos realm 의 임시 ambient |
| `public/assets/images/joseon_warrior_sheet.png` (출처 미상, best-effort CC0 추정) | hero sprite age variation 의 base (E 의 short-term fallback) |
| `public/assets/images/UI/icons/*` (CC0) | EternalCodex 통계 icon 의 short-term fallback (D 의 Lucide 통합 전까지) |
| `public/assets/images/monster_dokkaebi.png` (CC0 추정) | rival NPC portrait 의 임시 (C 의 Sharm 통합 전까지) |

**가장 ROI 높은 cycle 256 sub-action**:
1. 기존 BGM 3 개를 V3 의 6 realm 에 임시 매핑 (rotation logic 만, 자산 0 추가).
2. cycle 258 = D + A 우선 (Lucide ISC 의 가장 큰 시각 효과 / Kenney CC0 1 PNG).
3. cycle 260 + 262 + 264 분할 통합.

---

## 5. 표류 경고

- **age sprite (E) 의 함정**: 5 stage hero sprite 는 일관 톤·자세·proportion 필수.
  CC0 풀에서 5 stage 동일 캐릭터 찾기는 거의 불가능 — **자체 작성 또는 CSS
  filter (hue-rotate/scale) 임시 대응** 둘 중 택일. **E 는 cycle 264 까지 미루고,
  단기는 CSS filter** 권장.
- **realm ambient (B) 의 fetch 자동화 한계**: Freesound 는 OAuth 인증, OpenGameArt
  는 zip redirect — **iwenzhou/kenney mirror 같은 단일 GitHub mirror 부재**. 
  manual 안내 스크립트 (`scripts/fetch-ambient.sh`) 가 현실적. fetch-sounds.sh
  패턴 답습.
- **CC-BY 3.0 회피 원칙 유지** (cycle 156 과 동일): JRPG portraits (Antifarea),
  game-icons.net 등 게임 어휘 풍부하지만 attribution 의무 발생 — **CC0 풀로
  충분히 대체 가능**. 회피 권장.
- **LPC Aged Characters 의 CC-BY-SA + GPL trap**: share-alike + GPL 은 전염성.
  모노레포 정책 (MIT 또는 별도 명시) 과 충돌 — **절대 도입 금지**. E 의 #1 후보
  영구 제외.
- **장기 추세 (Lucide 의 의존성 비대화)**: cycle 156 의 A/C, cycle 256 의 D 모두
  Lucide 권장. 좋은 단일화이나 cycle 270+ 까지 Lucide 가 50+ icon 사용처를 갖게
  되면 tree-shake bundle size 확인 필요 (현재는 import 별 ~2 KB 로 안전).
- **30 asset/cycle limit**: cycle 258-264 분할로 cycle 당 1-6 asset → 안전. 한
  cycle 에 묶어 통합 시 limit 초과 위험.
- **`joseon_*` 출처 미상 (cycle 156 의 잔존 finding)**: cycle 256 도 미해결.
  V3 의 age portrait (E) 와 NPC portrait (C) 통합 시 **신규 자산은 출처 명확
  CC0 만 도입** — 기존 미상 자산 풀을 더 키우지 않기.
- **emoji → asset 전환 추세**: V3 의 NPC dialog 가 현재 이모지/text 만이라면
  cycle 260 의 C 통합이 가장 큰 시각 향상. 동시에 톤 일관성 (16-bit pixel vs
  modern dark gold UI) 의 충돌 우려 — **portrait 는 modern UI 톤으로 통일**
  (Sharm 의 portrait 는 anime 톤, dark gold UI 와 fit 8/10 — case-by-case 검토
  필수).
- **B 의 6 realm ambient 가 cycle 156 SFX (12 + 3) 와 카테고리 중복**: 기존
  battle/field/lobby BGM 3 개를 6 realm 으로 rotation 만 해도 단기 ROI 충분.
  **B 의 신규 6 ambient 는 cycle 262 까지 미루고 단기는 기존 3 BGM rotation**
  권장.

---

## 한 줄 요약

> **Cycle 256 = discovery 만. 5 카테고리 (age VFX / realm ambient / NPC portrait /
> EternalCodex icon / age hero sprite) 의 후보 풀 정리 + 통합은 cycle 258 (D+A) /
> 260 (C) / 262 (B) / 264 (E) 4 분할.** Lucide ISC + Kenney CC0 + Sharm CC0 +
> Freesound CC0 (realm 별 mix) = attribution 의무 0. CC-BY 3.0 / GPL / SA 회피.
> 단기 (cycle 256 sub-action) = 기존 BGM 3 → 6 realm rotation 매핑 (자산 0).
> 장기 (cycle 264) = age sprite 5 stage 는 자체 작성 또는 CSS filter 임시 대응.
