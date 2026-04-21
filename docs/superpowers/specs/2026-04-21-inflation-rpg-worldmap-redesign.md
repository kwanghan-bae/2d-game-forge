# Inflation RPG — 월드맵 재설계 스펙

## 목표

현재 단조로운 구역 리스트 UI를 **CSS 일러스트 2단계 탐색 맵**으로 교체하고,  
14개 구역을 **9개 테마 지역 × 총 120개 구역**으로 확장한다.

## 아키텍처

### 2단계 탐색

1. **WorldMap** (전체 지도) — 9개 지역이 한국 지형에 배치된 CSS 배경 위에 Region 노드로 표시. 현재 레벨에 맞는 지역은 밝게, 미도달 지역은 흐리게.
2. **RegionMap** (지역 지도) — 지역 선택 후 진입. 해당 지역의 구역 노드 12~22개가 자유 배치 + SVG 베지어 연결선으로 표시. 구역 탭 → 전투 진입.

뒤로가기: RegionMap → WorldMap.

### 타입 변경

**`src/data/regions.ts`** (신규)

```ts
export interface Region {
  id: string;
  nameKR: string;
  emoji: string;
  worldX: number; // % 위치, WorldMap 기준
  worldY: number;
  bgGradient: string; // CSS linear-gradient (RegionMap 배경)
  bgPattern: string;  // CSS3 Patterns 텍스처 (RegionMap 배경 위에 overlay)
  isHardOnly: boolean;
}
```

**`src/types.ts` — MapArea 확장**

```ts
export interface MapArea {
  id: string;
  nameKR: string;
  regionId: string;      // 추가
  levelRange: [number, number];
  bossId?: string;
  isHardOnly: boolean;
  mapX: number;          // % 위치, RegionMap 기준
  mapY: number;
  icon: string;          // game-icons.net SVG 파일명 (확장자 없음)
}
```

---

## 지역 & 구역 데이터 (120개)

### Region 1: 조선 평야 `plains` — 22구역, Lv 1–5,000

```
worldX: 20, worldY: 75
bgGradient: linear-gradient(160deg, #7ab648 0%, #5a9e30 60%, #3d7a20 100%)
bgPattern: repeating-linear-gradient(45deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 8px)
emoji: 🏘️
```

| # | id | nameKR | levelRange | bossId | mapX | mapY | icon |
|---|----|----|----|----|----|----|---- |
| 1 | village-entrance | 마을 입구 | [1, 8] | | 30 | 85 | village |
| 2 | farm-fields | 농가 들판 | [5, 18] | | 50 | 80 | wheat |
| 3 | brook-side | 개울가 | [12, 35] | | 70 | 82 | water-drop |
| 4 | market-street | 장터 거리 | [25, 60] | | 40 | 70 | coins |
| 5 | tavern-street | 주막 거리 | [45, 100] | | 60 | 72 | beer |
| 6 | beacon-hill | 봉수대 언덕 | [75, 155] | | 25 | 62 | fire |
| 7 | dirt-road | 황톳길 | [120, 220] | | 50 | 60 | footprint |
| 8 | reed-field | 갈대밭 | [170, 300] | | 75 | 65 | grass |
| 9 | old-fortress | 옛 성터 | [230, 400] | plains-ghost | 35 | 52 | castle |
| 10 | grassland-end | 초원 끝 | [320, 500] | | 60 | 50 | plain-arrow |
| 11 | foothills-village | 산기슭 마을 | [420, 650] | | 20 | 45 | village |
| 12 | watermill | 물레방아 터 | [550, 800] | | 55 | 42 | gears |
| 13 | wasteland | 황무지 | [700, 1000] | | 75 | 45 | arid |
| 14 | spirit-post | 서낭당 고개 | [850, 1200] | spirit-post-guardian | 38 | 35 | wooden-sign |
| 15 | ferry-crossing | 나루터 | [1000, 1500] | | 65 | 38 | boat |
| 16 | flooded-plains | 범람한 들판 | [1200, 1800] | | 28 | 25 | rain |
| 17 | ruined-village | 폐허 마을 | [1500, 2200] | | 55 | 28 | ruins |
| 18 | cursed-fields | 저주받은 땅 | [1800, 2500] | cursed-plains | 72 | 28 | poison |
| 19 | wanderer-camp | 유랑민 야영지 | [2000, 3000] | | 40 | 18 | campfire |
| 20 | plains-border | 평야 끝자락 | [2500, 3500] | plains-lord | 62 | 18 | border-post |
| 21 | frontier-post | 변방 초소 | [3000, 4000] | | 25 | 12 | watchtower |
| 22 | borderlands | 국경 지대 | [3500, 5000] | | 50 | 10 | crossed-swords |

---

### Region 2: 깊은 숲 `forest` — 14구역, Lv 500–22,000

```
worldX: 35, worldY: 55
bgGradient: linear-gradient(160deg, #1e4620 0%, #2d5a1b 50%, #1a3a12 100%)
bgPattern: repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 12px)
emoji: 🌲
```

| # | id | nameKR | levelRange | bossId | mapX | mapY | icon |
|---|----|----|----|----|----|----|---- |
| 1 | forest-entrance | 숲의 입구 | [500, 900] | | 30 | 85 | pine-tree |
| 2 | bamboo-grove | 대나무 숲 | [750, 1300] | | 55 | 80 | bamboo |
| 3 | ancient-tree | 고목 군락 | [1100, 1800] | | 75 | 75 | oak |
| 4 | fox-den | 여우굴 | [1500, 2500] | gumiho | 40 | 65 | fox |
| 5 | moss-rocks | 이끼 바위 | [2000, 3200] | | 65 | 62 | stone-block |
| 6 | mushroom-valley | 버섯 골짜기 | [2700, 4000] | | 25 | 52 | mushroom |
| 7 | spirit-tree | 신령 나무 | [3300, 5000] | tree-spirit | 55 | 48 | tree-face |
| 8 | dark-forest | 어두운 숲 | [4000, 6500] | | 75 | 42 | dark-forest |
| 9 | hidden-shrine | 숨겨진 사당 | [5500, 8000] | | 38 | 35 | torii-gate |
| 10 | beast-territory | 맹수 구역 | [7000, 10000] | black-tiger | 62 | 30 | tiger |
| 11 | poison-grove | 독초 군락 | [8500, 12000] | | 28 | 22 | poison |
| 12 | forest-labyrinth | 숲의 미로 | [10000, 15000] | | 55 | 18 | maze |
| 13 | cursed-tree | 저주받은 고목 | [13000, 18000] | cursed-tree-spirit | 72 | 15 | dead-tree |
| 14 | forest-heart | 숲의 심장 | [16000, 22000] | forest-ruler | 42 | 8 | heart |

---

### Region 3: 산악 지대 `mountains` — 16구역, Lv 3,000–150,000

```
worldX: 50, worldY: 40
bgGradient: linear-gradient(160deg, #7f8c8d 0%, #566573 60%, #2c3e50 100%)
bgPattern: repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 10px)
emoji: ⛰️
```

| # | id | nameKR | levelRange | bossId | mapX | mapY | icon |
|---|----|----|----|----|----|----|---- |
| 1 | mountain-trail | 산길 입구 | [3000, 5500] | | 30 | 88 | hiking |
| 2 | goblin-pass | 도깨비 고개 | [4500, 7000] | goblin-chief | 55 | 82 | imp |
| 3 | rocky-ridge | 바위 능선 | [6000, 9500] | | 75 | 78 | rock |
| 4 | cliff-path | 절벽 길 | [8000, 12000] | | 40 | 68 | cliff |
| 5 | mountain-shrine | 산신 사당 | [10000, 16000] | mountain-god | 65 | 65 | totem |
| 6 | snow-valley | 설국 계곡 | [13000, 20000] | | 25 | 55 | snowflake |
| 7 | kumgang-foot | 금강산 기슭 | [17000, 26000] | | 55 | 50 | mountain |
| 8 | kumgang-mid | 금강산 중턱 | [22000, 32000] | | 70 | 42 | pine-tree |
| 9 | kumgang-peak | 금강산 정상 | [28000, 40000] | kumgang-spirit | 40 | 35 | mountain-peak |
| 10 | baekdu-approach | 백두 길목 | [35000, 50000] | | 65 | 28 | arrow-right |
| 11 | baekdu-gate | 백두 관문 | [45000, 62000] | gate-guardian | 30 | 22 | fortress |
| 12 | baekdu-cheonji | 백두 천지 | [55000, 78000] | | 55 | 18 | lake |
| 13 | cloud-ridge | 구름 능선 | [70000, 95000] | | 72 | 12 | cloud |
| 14 | thunder-gorge | 천둥 협곡 | [85000, 115000] | thunder-god | 38 | 8 | lightning |
| 15 | spirit-peak | 신령 봉우리 | [105000, 140000] | | 62 | 5 | spirit |
| 16 | summit-beyond | 구름 너머 정상 | [130000, 180000] | sky-mountain-lord | 48 | 2 | star |

---

### Region 4: 동해 바다 `sea` — 13구역, Lv 20,000–400,000

```
worldX: 72, worldY: 45
bgGradient: linear-gradient(180deg, #1a5276 0%, #154360 50%, #0b2d44 100%)
bgPattern: repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, transparent 1px, transparent 20px), repeating-linear-gradient(180deg, rgba(255,255,255,0.03) 0px, transparent 1px, transparent 8px)
emoji: 🌊
```

| # | id | nameKR | levelRange | bossId | mapX | mapY | icon |
|---|----|----|----|----|----|----|---- |
| 1 | coastline | 해안가 | [20000, 35000] | | 30 | 85 | anchor |
| 2 | tidal-flats | 갯벌 | [28000, 45000] | | 55 | 80 | crab |
| 3 | cliff-coast | 파도치는 절벽 | [38000, 58000] | wave-spirit | 72 | 75 | wave |
| 4 | deep-entrance | 심해 입구 | [50000, 75000] | | 38 | 65 | fish |
| 5 | dragon-palace | 용궁 어귀 | [65000, 95000] | sea-god | 62 | 60 | trident |
| 6 | coral-palace | 산호 궁전 | [80000, 115000] | | 28 | 52 | coral |
| 7 | deep-cave | 심해 동굴 | [95000, 135000] | | 58 | 45 | cave |
| 8 | dragon-treasury | 용왕의 보고 | [115000, 160000] | dragon-king-guard | 75 | 38 | treasure |
| 9 | storm-vortex | 폭풍의 소용돌이 | [135000, 185000] | | 35 | 30 | vortex |
| 10 | glacier-sea | 빙하 바다 | [160000, 220000] | ice-sea-dragon | 60 | 25 | ice |
| 11 | undersea-volcano | 해저 화산 | [195000, 270000] | | 25 | 18 | fire |
| 12 | deep-palace | 용궁 심층 | [240000, 330000] | true-sea-god | 55 | 12 | palace |
| 13 | abyss-throne | 심해 왕좌 | [300000, 400000] | abyss-sea-ruler | 42 | 5 | throne |

---

### Region 5: 화산 지대 `volcano` — 13구역, Lv 100,000–1,800,000

```
worldX: 68, worldY: 68
bgGradient: linear-gradient(160deg, #c0392b 0%, #922b21 60%, #641e16 100%)
bgPattern: radial-gradient(circle at 50% 50%, rgba(255,120,0,0.08) 0%, transparent 60%)
emoji: 🌋
```

| # | id | nameKR | levelRange | bossId | mapX | mapY | icon |
|---|----|----|----|----|----|----|---- |
| 1 | volcano-foot | 화산 기슭 | [100000, 160000] | | 30 | 88 | mountain |
| 2 | lava-fields | 용암 들판 | [140000, 210000] | | 55 | 82 | lava |
| 3 | ash-plains | 재의 평원 | [185000, 265000] | ash-spirit | 72 | 75 | ash |
| 4 | crater-entrance | 분화구 입구 | [240000, 330000] | | 40 | 65 | circle |
| 5 | black-dragon-den | 흑룡 소굴 | [300000, 420000] | black-dragon | 65 | 58 | dragon |
| 6 | lava-waterfall | 용암 폭포 | [380000, 520000] | | 28 | 48 | waterfall |
| 7 | flame-gorge | 화염 협곡 | [480000, 650000] | fire-warlord | 58 | 42 | fire |
| 8 | crater-rim | 분화구 테두리 | [600000, 800000] | | 75 | 35 | crater |
| 9 | magma-depths | 마그마 심층 | [750000, 1000000] | magma-king | 35 | 25 | lava |
| 10 | flame-kingdom | 불꽃 왕국 | [950000, 1250000] | | 58 | 18 | castle |
| 11 | underground-blaze | 지하 불길 | [1150000, 1500000] | | 28 | 12 | fire |
| 12 | volcano-heart | 화산 심장부 | [1350000, 1700000] | volcano-heart | 55 | 7 | heart |
| 13 | fire-throne | 불의 왕좌 | [1600000, 2100000] | fire-sovereign | 42 | 2 | throne |

---

### Region 6: 저승 `underworld` — 13구역, Lv 400,000–9,000,000

```
worldX: 48, worldY: 20
bgGradient: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)
bgPattern: radial-gradient(ellipse at 50% 50%, rgba(100,0,200,0.06) 0%, transparent 70%)
emoji: 💀
```

| # | id | nameKR | levelRange | bossId | mapX | mapY | icon |
|---|----|----|----|----|----|----|---- |
| 1 | underworld-gate | 저승 입구 | [400000, 600000] | death-reaper | 50 | 88 | gate |
| 2 | three-river | 삼도천 | [550000, 800000] | | 30 | 78 | river |
| 3 | hell-gate | 저승 관문 | [720000, 1000000] | hell-gate-guard | 68 | 72 | portcullis |
| 4 | yama-hall | 염라대왕 전각 | [900000, 1250000] | yama-king | 45 | 62 | throne |
| 5 | oblivion-river | 망각의 강 | [1150000, 1600000] | | 25 | 52 | river |
| 6 | grudge-plains | 원혼 들판 | [1400000, 1900000] | grudge-general | 65 | 45 | ghost |
| 7 | ghost-castle | 귀왕의 성 | [1700000, 2400000] | ghost-king | 42 | 35 | haunted-house |
| 8 | deep-underworld | 저승 심층 | [2200000, 3100000] | | 68 | 28 | skull |
| 9 | hell-door | 지옥문 | [2900000, 4000000] | hell-door-guardian | 30 | 20 | door |
| 10 | dark-kingdom | 어둠의 왕국 | [3700000, 5200000] | dark-kingdom-ruler | 55 | 15 | crown |
| 11 | dissolution-zone | 존재 소멸 지대 | [4800000, 6800000] | | 25 | 8 | void |
| 12 | final-judgment | 최후의 심판 | [6200000, 8500000] | final-judge | 60 | 5 | scale |
| 13 | underworld-depths | 저승 최심층 | [8000000, Infinity] | underworld-lord | 42 | 2 | abyss |

---

### Region 7: 천상계 `heaven` — 10구역, Lv 2,000,000–30,000,000

```
worldX: 30, worldY: 20
bgGradient: linear-gradient(160deg, #d5e8f5 0%, #a9cfe8 50%, #7ab8e8 100%)
bgPattern: radial-gradient(circle 3px at 10px 10px, rgba(255,255,255,0.5) 100%, transparent 0%), radial-gradient(circle 3px at 30px 30px, rgba(255,255,255,0.3) 100%, transparent 0%)
emoji: ☁️
```

| # | id | nameKR | levelRange | bossId | mapX | mapY | icon |
|---|----|----|----|----|----|----|---- |
| 1 | cloud-gate | 구름 관문 | [2000000, 3000000] | cloud-guardian | 50 | 88 | cloud |
| 2 | fairy-valley | 선녀 계곡 | [2700000, 4000000] | | 30 | 78 | feather |
| 3 | celestial-garden | 천상 정원 | [3600000, 5200000] | celestial-garden-spirit | 68 | 72 | flower |
| 4 | jade-palace | 옥황상제 궁전 | [4800000, 6800000] | jade-emperor | 45 | 60 | palace |
| 5 | star-field | 별자리 지대 | [6200000, 8800000] | | 25 | 50 | star |
| 6 | thunder-divine | 천둥신 영역 | [8200000, 11500000] | thunder-celestial | 65 | 42 | lightning |
| 7 | immortal-realm | 신선 경지 | [10500000, 15000000] | | 40 | 32 | yin-yang |
| 8 | heaven-depths | 천상계 심층 | [13500000, 19000000] | celestial-lord | 68 | 22 | crown |
| 9 | chaos-door | 혼돈의 문 앞 | [17000000, 24000000] | | 30 | 15 | portal |
| 10 | heaven-deepest | 천상 최심층 | [22000000, 32000000] | heaven-ruler | 52 | 8 | infinity |

---

### Region 8: 혼돈의 끝 `chaos` — 10구역, Lv 15,000,000–∞

```
worldX: 50, worldY: 10
bgGradient: linear-gradient(160deg, #0a0a0a 0%, #1a0a2e 50%, #0a0a0a 100%)
bgPattern: conic-gradient(from 0deg at 50% 50%, rgba(100,0,255,0.05), rgba(0,100,255,0.05), rgba(100,0,255,0.05))
emoji: 🌀
```

| # | id | nameKR | levelRange | bossId | mapX | mapY | icon |
|---|----|----|----|----|----|----|---- |
| 1 | chaos-land | 혼돈의 땅 | [15000000, 25000000] | chaos-god | 50 | 88 | chaos |
| 2 | time-rift | 시간의 틈 | [22000000, 38000000] | | 30 | 75 | hourglass |
| 3 | void-boundary | 공허의 경계 | [34000000, 56000000] | void-boundary-lord | 68 | 68 | void |
| 4 | existence-end | 존재의 끝 | [52000000, 88000000] | | 25 | 55 | skull |
| 5 | time-collapse | 시간 붕괴 지대 | [80000000, 135000000] | time-destroyer | 62 | 45 | broken-clock |
| 6 | primal-void | 원초의 공허 | [125000000, 210000000] | | 38 | 35 | black-hole |
| 7 | god-battlefield | 신들의 전장 | [190000000, 320000000] | god-of-gods | 65 | 25 | crossed-swords |
| 8 | final-gate | 최종 구역 입구 | [300000000, 500000000] | | 30 | 15 | gate |
| 9 | final-realm | 최종 구역 | [450000000, Infinity] | final-boss | 55 | 8 | crown |
| 10 | primordial-chaos | 태초의 혼돈 | [Infinity, Infinity] | primordial-chaos | 42 | 2 | infinity |

---

### Region 9: 마왕의 성 `demon-castle` — 9구역, **하드모드 전용**, Lv 100–∞

```
worldX: 80, worldY: 25
bgGradient: linear-gradient(160deg, #3d0000 0%, #1a0000 100%)
bgPattern: repeating-linear-gradient(45deg, rgba(200,0,0,0.06) 0px, rgba(200,0,0,0.06) 1px, transparent 1px, transparent 8px)
emoji: 🏰
isHardOnly: true
```

| # | id | nameKR | levelRange | bossId | mapX | mapY | icon |
|---|----|----|----|----|----|----|---- |
| 1 | hard-abyss | 심연 | [100, 5000] | abyss-lord | 50 | 88 | abyss |
| 2 | hard-void | 공허 | [5000, 50000] | void-king | 35 | 75 | void |
| 3 | demon-gate | 마왕의 관문 | [30000, 200000] | demon-gate-guardian | 65 | 65 | gate |
| 4 | cursed-castle | 저주받은 성 | [150000, 800000] | cursed-castle-lord | 30 | 52 | haunted-house |
| 5 | demon-hall | 마왕의 전각 | [600000, 3000000] | demon-palace-lord | 60 | 42 | throne |
| 6 | dark-treasury | 어둠의 보고 | [2000000, 10000000] | dark-treasury-guard | 35 | 30 | treasure |
| 7 | demon-throne-room | 마왕의 옥좌 | [8000000, 40000000] | demon-throne | 65 | 20 | crown |
| 8 | demon-inner | 마왕의 심층 | [30000000, 150000000] | demon-king-inner | 40 | 10 | skull |
| 9 | demon-king | 마왕 본체 | [100000000, Infinity] | demon-king | 55 | 3 | dragon |

---

## UI 컴포넌트 설계

### WorldMap

- 컨테이너: `390×600px`, `position: relative`
- 배경: 한국 지형 CSS gradient (남쪽 녹색 → 중앙 산악 → 북쪽 하늘)
- CSS3 Patterns 텍스처 레이어 (배경 위 `::after` pseudo)
- 9개 Region 노드: `position: absolute`, `width: 56px height: 56px`, 원형
  - 해금: 지역 고유 색 + emoji + nameKR
  - 잠금: 회색 반투명 + 🔒
  - 현재 플레이어 지역: `box-shadow: 0 0 12px 4px gold`
- SVG overlay: 지역 간 연결선 (점선, 해금 구간 금색·잠긴 구간 회색)
- 하드모드 지역(마왕의 성): 오른쪽 가장자리, 빨간 테두리 (하드모드 해금 전 숨김)

### RegionMap

- 컨테이너: `390×600px`, 지역 bgGradient + bgPattern 적용
- 상단 좌측 `←` 버튼: WorldMap 복귀
- 구역 노드: `position: absolute`, `width: 48px height: 48px`, 원형
  - 아이콘: game-icons.net SVG (`public/assets/icons/{icon}.svg`), `24px`
  - 잠금: `opacity: 0.35` + 🔒 badge
  - 현재 구역: `animate-pulse` (Animate.css 또는 CSS keyframes)
  - 보스 구역: 붉은 테두리 `border: 2px solid #e03030`
  - 탭: 전투 진입 (현재 `encounterMonster()` + `setScreen('battle')` 흐름)
- SVG overlay: 구역 간 베지어 곡선
  - 해금 구간: `stroke: #d4af37` (금색), `stroke-dasharray: 6 3`
  - 잠긴 구간: `stroke: #555`, `stroke-dasharray: 4 4`
- 하단 정보 바: 구역명 + 레벨 범위 + 보스 여부 (탭 시 표시)

### 잠금 판별

```ts
function isAreaUnlocked(area: MapArea, runLevel: number): boolean {
  return runLevel >= area.levelRange[0];
}

function isRegionUnlocked(region: Region, areas: MapArea[], runLevel: number): boolean {
  return areas.some(a => a.regionId === region.id && isAreaUnlocked(a, runLevel));
}
```

**`isHardOnly` 규칙**: MapArea의 `isHardOnly`는 소속 Region의 `isHardOnly`와 동일. Region 9(`demon-castle`)의 모든 구역은 `isHardOnly: true`. 나머지 Region 구역은 `isHardOnly: false`.

**`[Infinity, Infinity]` 구역**: Region 8의 `primordial-chaos`는 숨겨진 비밀 구역 — 절대 레벨 도달 불가. UI에서 표시하지 않음 (`levelRange[0] === Infinity`이면 렌더링 스킵).

---

## 에셋

- **아이콘**: `public/assets/icons/` 디렉터리에 game-icons.net SVG 저장 (CC BY 3.0, 저작자 표시 필요)
- **CSS 라이브러리**: Animate.css (CDN 또는 npm) — 보스 노드 맥동 효과
- 이미지 파일 추가 없음 — 모든 배경은 CSS gradient

---

## 범위 밖 (Phase B에서 처리)

- 구역별 몬스터 테이블 확장 (현재는 `pickMonster(level)` 레벨 기반으로 공통 처리)
- 신규 보스 9개 Region의 bossId에 해당하는 데이터 (`bosses.ts` 확장)
- 구역 클리어 기록 / 탐험 완료 마크
