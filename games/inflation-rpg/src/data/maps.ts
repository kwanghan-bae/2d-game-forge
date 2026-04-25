import type { MapArea } from '../types';

// bossId 필드는 UI 배지(빨간 테두리, BOSS 표시)용이다. 실제 전투 보스 스폰은
// BattleScene이 boss.areaId로 검색하므로 bosses.ts를 기준으로 한다.
// 현재 bossId 값 중 bosses.ts에 미정의된 것들은 향후 추가될 보스의 placeholder다.
export const MAP_AREAS: MapArea[] = [
  // ── Region: plains (조선 평야) ── 22구역 Lv 1–5,000
  { id: 'village-entrance',  nameKR: '마을 입구',    regionId: 'plains', levelRange: [1, 8],          bossId: undefined,              isHardOnly: false, mapX: 30, mapY: 85, icon: 'village' },
  { id: 'farm-fields',       nameKR: '농가 들판',    regionId: 'plains', levelRange: [5, 18],         bossId: undefined,              isHardOnly: false, mapX: 50, mapY: 80, icon: 'wheat' },
  { id: 'brook-side',        nameKR: '개울가',       regionId: 'plains', levelRange: [12, 35],        bossId: undefined,              isHardOnly: false, mapX: 70, mapY: 82, icon: 'water-drop' },
  { id: 'market-street',     nameKR: '장터 거리',    regionId: 'plains', levelRange: [25, 60],        bossId: undefined,              isHardOnly: false, mapX: 40, mapY: 70, icon: 'coins' },
  { id: 'tavern-street',     nameKR: '주막 거리',    regionId: 'plains', levelRange: [45, 100],       bossId: undefined,              isHardOnly: false, mapX: 60, mapY: 72, icon: 'beer' },
  { id: 'beacon-hill',       nameKR: '봉수대 언덕',  regionId: 'plains', levelRange: [75, 155],       bossId: undefined,              isHardOnly: false, mapX: 25, mapY: 62, icon: 'fire' },
  { id: 'dirt-road',         nameKR: '황톳길',       regionId: 'plains', levelRange: [120, 220],      bossId: undefined,              isHardOnly: false, mapX: 50, mapY: 60, icon: 'footprint' },
  { id: 'reed-field',        nameKR: '갈대밭',       regionId: 'plains', levelRange: [170, 300],      bossId: undefined,              isHardOnly: false, mapX: 75, mapY: 65, icon: 'grass' },
  { id: 'old-fortress',      nameKR: '옛 성터',      regionId: 'plains', levelRange: [230, 400],      bossId: 'plains-ghost',         isHardOnly: false, mapX: 35, mapY: 52, icon: 'castle' },
  { id: 'grassland-end',     nameKR: '초원 끝',      regionId: 'plains', levelRange: [320, 500],      bossId: undefined,              isHardOnly: false, mapX: 60, mapY: 50, icon: 'plain-arrow' },
  { id: 'foothills-village', nameKR: '산기슭 마을',  regionId: 'plains', levelRange: [420, 650],      bossId: undefined,              isHardOnly: false, mapX: 20, mapY: 45, icon: 'village' },
  { id: 'watermill',         nameKR: '물레방아 터',  regionId: 'plains', levelRange: [550, 800],      bossId: undefined,              isHardOnly: false, mapX: 55, mapY: 42, icon: 'gears' },
  { id: 'wasteland',         nameKR: '황무지',       regionId: 'plains', levelRange: [700, 1000],     bossId: undefined,              isHardOnly: false, mapX: 75, mapY: 45, icon: 'arid' },
  { id: 'spirit-post',       nameKR: '서낭당 고개',  regionId: 'plains', levelRange: [850, 1200],     bossId: 'spirit-post-guardian', isHardOnly: false, mapX: 38, mapY: 35, icon: 'wooden-sign' },
  { id: 'ferry-crossing',    nameKR: '나루터',       regionId: 'plains', levelRange: [1000, 1500],    bossId: undefined,              isHardOnly: false, mapX: 65, mapY: 38, icon: 'boat' },
  { id: 'flooded-plains',    nameKR: '범람한 들판',  regionId: 'plains', levelRange: [1200, 1800],    bossId: undefined,              isHardOnly: false, mapX: 28, mapY: 25, icon: 'rain' },
  { id: 'ruined-village',    nameKR: '폐허 마을',    regionId: 'plains', levelRange: [1500, 2200],    bossId: undefined,              isHardOnly: false, mapX: 55, mapY: 28, icon: 'ruins' },
  { id: 'cursed-fields',     nameKR: '저주받은 땅',  regionId: 'plains', levelRange: [1800, 2500],    bossId: 'cursed-plains',        isHardOnly: false, mapX: 72, mapY: 28, icon: 'poison' },
  { id: 'wanderer-camp',     nameKR: '유랑민 야영지',regionId: 'plains', levelRange: [2000, 3000],    bossId: undefined,              isHardOnly: false, mapX: 40, mapY: 18, icon: 'campfire' },
  { id: 'plains-border',     nameKR: '평야 끝자락',  regionId: 'plains', levelRange: [2500, 3500],    bossId: 'plains-lord',          isHardOnly: false, mapX: 62, mapY: 18, icon: 'border-post' },
  { id: 'frontier-post',     nameKR: '변방 초소',    regionId: 'plains', levelRange: [3000, 4000],    bossId: undefined,              isHardOnly: false, mapX: 25, mapY: 12, icon: 'watchtower' },
  { id: 'borderlands',       nameKR: '국경 지대',    regionId: 'plains', levelRange: [3500, 5000],    bossId: undefined,              isHardOnly: false, mapX: 50, mapY: 10, icon: 'crossed-swords' },

  // ── Region: forest (깊은 숲) ── 14구역 Lv 500–22,000
  { id: 'forest-entrance',   nameKR: '숲의 입구',    regionId: 'forest', levelRange: [500, 900],      bossId: undefined,              isHardOnly: false, mapX: 30, mapY: 85, icon: 'pine-tree' },
  { id: 'bamboo-grove',      nameKR: '대나무 숲',    regionId: 'forest', levelRange: [750, 1300],     bossId: undefined,              isHardOnly: false, mapX: 55, mapY: 80, icon: 'bamboo' },
  { id: 'ancient-tree',      nameKR: '고목 군락',    regionId: 'forest', levelRange: [1100, 1800],    bossId: undefined,              isHardOnly: false, mapX: 75, mapY: 75, icon: 'oak' },
  { id: 'fox-den',           nameKR: '여우굴',       regionId: 'forest', levelRange: [1500, 2500],    bossId: 'gumiho',               isHardOnly: false, mapX: 40, mapY: 65, icon: 'fox' },
  { id: 'moss-rocks',        nameKR: '이끼 바위',    regionId: 'forest', levelRange: [2000, 3200],    bossId: undefined,              isHardOnly: false, mapX: 65, mapY: 62, icon: 'stone-block' },
  { id: 'mushroom-valley',   nameKR: '버섯 골짜기',  regionId: 'forest', levelRange: [2700, 4000],    bossId: undefined,              isHardOnly: false, mapX: 25, mapY: 52, icon: 'mushroom' },
  { id: 'spirit-tree',       nameKR: '신령 나무',    regionId: 'forest', levelRange: [3300, 5000],    bossId: 'tree-spirit',          isHardOnly: false, mapX: 55, mapY: 48, icon: 'tree-face' },
  { id: 'dark-forest',       nameKR: '어두운 숲',    regionId: 'forest', levelRange: [4000, 6500],    bossId: undefined,              isHardOnly: false, mapX: 75, mapY: 42, icon: 'dark-forest' },
  { id: 'hidden-shrine',     nameKR: '숨겨진 사당',  regionId: 'forest', levelRange: [5500, 8000],    bossId: undefined,              isHardOnly: false, mapX: 38, mapY: 35, icon: 'torii-gate' },
  { id: 'beast-territory',   nameKR: '맹수 구역',    regionId: 'forest', levelRange: [7000, 10000],   bossId: 'black-tiger',          isHardOnly: false, mapX: 62, mapY: 30, icon: 'tiger' },
  { id: 'poison-grove',      nameKR: '독초 군락',    regionId: 'forest', levelRange: [8500, 12000],   bossId: undefined,              isHardOnly: false, mapX: 28, mapY: 22, icon: 'poison' },
  { id: 'forest-labyrinth',  nameKR: '숲의 미로',    regionId: 'forest', levelRange: [10000, 15000],  bossId: undefined,              isHardOnly: false, mapX: 55, mapY: 18, icon: 'maze' },
  { id: 'cursed-tree',       nameKR: '저주받은 고목', regionId: 'forest', levelRange: [13000, 18000], bossId: 'cursed-tree-spirit',   isHardOnly: false, mapX: 72, mapY: 15, icon: 'dead-tree' },
  { id: 'forest-heart',      nameKR: '숲의 심장',    regionId: 'forest', levelRange: [16000, 22000],  bossId: 'forest-ruler',         isHardOnly: false, mapX: 42, mapY: 8,  icon: 'heart' },

  // ── Region: mountains (산악 지대) ── 16구역 Lv 3,000–180,000
  { id: 'mountain-trail',    nameKR: '산길 입구',    regionId: 'mountains', levelRange: [3000, 5500],    bossId: undefined,           isHardOnly: false, mapX: 30, mapY: 88, icon: 'hiking' },
  { id: 'goblin-pass',       nameKR: '도깨비 고개',  regionId: 'mountains', levelRange: [4500, 7000],    bossId: 'goblin-chief',      isHardOnly: false, mapX: 55, mapY: 82, icon: 'imp' },
  { id: 'rocky-ridge',       nameKR: '바위 능선',    regionId: 'mountains', levelRange: [6000, 9500],    bossId: undefined,           isHardOnly: false, mapX: 75, mapY: 78, icon: 'rock' },
  { id: 'cliff-path',        nameKR: '절벽 길',      regionId: 'mountains', levelRange: [8000, 12000],   bossId: undefined,           isHardOnly: false, mapX: 40, mapY: 68, icon: 'cliff' },
  { id: 'mountain-shrine',   nameKR: '산신 사당',    regionId: 'mountains', levelRange: [10000, 16000],  bossId: 'mountain-god',      isHardOnly: false, mapX: 65, mapY: 65, icon: 'totem' },
  { id: 'snow-valley',       nameKR: '설국 계곡',    regionId: 'mountains', levelRange: [13000, 20000],  bossId: undefined,           isHardOnly: false, mapX: 25, mapY: 55, icon: 'snowflake' },
  { id: 'kumgang-foot',      nameKR: '금강산 기슭',  regionId: 'mountains', levelRange: [17000, 26000],  bossId: undefined,           isHardOnly: false, mapX: 55, mapY: 50, icon: 'mountain' },
  { id: 'kumgang-mid',       nameKR: '금강산 중턱',  regionId: 'mountains', levelRange: [22000, 32000],  bossId: undefined,           isHardOnly: false, mapX: 70, mapY: 42, icon: 'pine-tree' },
  { id: 'kumgang-peak',      nameKR: '금강산 정상',  regionId: 'mountains', levelRange: [28000, 40000],  bossId: 'kumgang-spirit',    isHardOnly: false, mapX: 40, mapY: 35, icon: 'mountain-peak' },
  { id: 'baekdu-approach',   nameKR: '백두 길목',    regionId: 'mountains', levelRange: [35000, 50000],  bossId: undefined,           isHardOnly: false, mapX: 65, mapY: 28, icon: 'arrow-right' },
  { id: 'baekdu-gate',       nameKR: '백두 관문',    regionId: 'mountains', levelRange: [45000, 62000],  bossId: 'gate-guardian',     isHardOnly: false, mapX: 30, mapY: 22, icon: 'fortress' },
  { id: 'baekdu-cheonji',    nameKR: '백두 천지',    regionId: 'mountains', levelRange: [55000, 78000],  bossId: undefined,           isHardOnly: false, mapX: 55, mapY: 18, icon: 'lake' },
  { id: 'cloud-ridge',       nameKR: '구름 능선',    regionId: 'mountains', levelRange: [70000, 95000],  bossId: undefined,           isHardOnly: false, mapX: 72, mapY: 12, icon: 'cloud' },
  { id: 'thunder-gorge',     nameKR: '천둥 협곡',    regionId: 'mountains', levelRange: [85000, 115000], bossId: 'thunder-god',       isHardOnly: false, mapX: 38, mapY: 8,  icon: 'lightning' },
  { id: 'spirit-peak',       nameKR: '신령 봉우리',  regionId: 'mountains', levelRange: [105000, 140000],bossId: undefined,           isHardOnly: false, mapX: 62, mapY: 5,  icon: 'spirit' },
  { id: 'summit-beyond',     nameKR: '구름 너머 정상',regionId: 'mountains', levelRange: [130000, 180000],bossId: 'sky-mountain-lord', isHardOnly: false, mapX: 48, mapY: 2,  icon: 'star' },

  // ── Region: sea (동해 바다) ── 13구역 Lv 20,000–400,000
  { id: 'coastline',         nameKR: '해안가',         regionId: 'coast', levelRange: [20000, 35000],   bossId: undefined,           isHardOnly: false, mapX: 30, mapY: 85, icon: 'anchor' },
  { id: 'tidal-flats',       nameKR: '갯벌',           regionId: 'coast', levelRange: [28000, 45000],   bossId: undefined,           isHardOnly: false, mapX: 55, mapY: 80, icon: 'crab' },
  { id: 'cliff-coast',       nameKR: '파도치는 절벽',  regionId: 'coast', levelRange: [38000, 58000],   bossId: 'wave-spirit',       isHardOnly: false, mapX: 72, mapY: 75, icon: 'wave' },
  { id: 'deep-entrance',     nameKR: '심해 입구',      regionId: 'coast', levelRange: [50000, 75000],   bossId: undefined,           isHardOnly: false, mapX: 38, mapY: 65, icon: 'fish' },
  { id: 'dragon-palace',     nameKR: '용궁 어귀',      regionId: 'coast', levelRange: [65000, 95000],   bossId: 'sea-god',           isHardOnly: false, mapX: 62, mapY: 60, icon: 'trident' },
  { id: 'coral-palace',      nameKR: '산호 궁전',      regionId: 'coast', levelRange: [80000, 115000],  bossId: undefined,           isHardOnly: false, mapX: 28, mapY: 52, icon: 'coral' },
  { id: 'deep-cave',         nameKR: '심해 동굴',      regionId: 'coast', levelRange: [95000, 135000],  bossId: undefined,           isHardOnly: false, mapX: 58, mapY: 45, icon: 'cave' },
  { id: 'dragon-treasury',   nameKR: '용왕의 보고',    regionId: 'coast', levelRange: [115000, 160000], bossId: 'dragon-king-guard', isHardOnly: false, mapX: 75, mapY: 38, icon: 'treasure' },
  { id: 'storm-vortex',      nameKR: '폭풍의 소용돌이',regionId: 'coast', levelRange: [135000, 185000], bossId: undefined,           isHardOnly: false, mapX: 35, mapY: 30, icon: 'vortex' },
  { id: 'glacier-sea',       nameKR: '빙하 바다',      regionId: 'coast', levelRange: [160000, 220000], bossId: 'ice-sea-dragon',    isHardOnly: false, mapX: 60, mapY: 25, icon: 'ice' },
  { id: 'undersea-volcano',  nameKR: '해저 화산',      regionId: 'coast', levelRange: [195000, 270000], bossId: undefined,           isHardOnly: false, mapX: 25, mapY: 18, icon: 'fire' },
  { id: 'deep-palace',       nameKR: '용궁 심층',      regionId: 'coast', levelRange: [240000, 330000], bossId: 'true-sea-god',      isHardOnly: false, mapX: 55, mapY: 12, icon: 'palace' },
  { id: 'abyss-throne',      nameKR: '심해 왕좌',      regionId: 'coast', levelRange: [300000, 400000], bossId: 'abyss-sea-ruler',   isHardOnly: false, mapX: 42, mapY: 5,  icon: 'throne' },

  // ── Region: volcano (화산 지대) ── 13구역 Lv 100,000–2,100,000
  { id: 'volcano-foot',      nameKR: '화산 기슭',   regionId: 'volcano', levelRange: [100000, 160000],  bossId: undefined,        isHardOnly: false, mapX: 30, mapY: 88, icon: 'mountain' },
  { id: 'lava-fields',       nameKR: '용암 들판',   regionId: 'volcano', levelRange: [140000, 210000],  bossId: undefined,        isHardOnly: false, mapX: 55, mapY: 82, icon: 'lava' },
  { id: 'ash-plains',        nameKR: '재의 평원',   regionId: 'volcano', levelRange: [185000, 265000],  bossId: 'ash-spirit',     isHardOnly: false, mapX: 72, mapY: 75, icon: 'ash' },
  { id: 'crater-entrance',   nameKR: '분화구 입구', regionId: 'volcano', levelRange: [240000, 330000],  bossId: undefined,        isHardOnly: false, mapX: 40, mapY: 65, icon: 'circle' },
  { id: 'black-dragon-den',  nameKR: '흑룡 소굴',   regionId: 'volcano', levelRange: [300000, 420000],  bossId: 'black-dragon',   isHardOnly: false, mapX: 65, mapY: 58, icon: 'dragon' },
  { id: 'lava-waterfall',    nameKR: '용암 폭포',   regionId: 'volcano', levelRange: [380000, 520000],  bossId: undefined,        isHardOnly: false, mapX: 28, mapY: 48, icon: 'waterfall' },
  { id: 'flame-gorge',       nameKR: '화염 협곡',   regionId: 'volcano', levelRange: [480000, 650000],  bossId: 'fire-warlord',   isHardOnly: false, mapX: 58, mapY: 42, icon: 'fire' },
  { id: 'crater-rim',        nameKR: '분화구 테두리',regionId: 'volcano', levelRange: [600000, 800000], bossId: undefined,        isHardOnly: false, mapX: 75, mapY: 35, icon: 'crater' },
  { id: 'magma-depths',      nameKR: '마그마 심층', regionId: 'volcano', levelRange: [750000, 1000000], bossId: 'magma-king',     isHardOnly: false, mapX: 35, mapY: 25, icon: 'lava' },
  { id: 'flame-kingdom',     nameKR: '불꽃 왕국',   regionId: 'volcano', levelRange: [950000, 1250000], bossId: undefined,        isHardOnly: false, mapX: 58, mapY: 18, icon: 'castle' },
  { id: 'underground-blaze', nameKR: '지하 불길',   regionId: 'volcano', levelRange: [1150000, 1500000],bossId: undefined,        isHardOnly: false, mapX: 28, mapY: 12, icon: 'fire' },
  { id: 'volcano-heart',     nameKR: '화산 심장부', regionId: 'volcano', levelRange: [1350000, 1700000],bossId: 'volcano-heart',  isHardOnly: false, mapX: 55, mapY: 7,  icon: 'heart' },
  { id: 'fire-throne',       nameKR: '불의 왕좌',   regionId: 'volcano', levelRange: [1600000, 2100000],bossId: 'fire-sovereign', isHardOnly: false, mapX: 42, mapY: 2,  icon: 'throne' },

  // ── Region: underworld (저승) ── 13구역 Lv 400,000–Infinity
  { id: 'underworld-gate',   nameKR: '저승 입구',       regionId: 'underworld', levelRange: [400000, 600000],   bossId: 'death-reaper',        isHardOnly: false, mapX: 50, mapY: 88, icon: 'gate' },
  { id: 'three-river',       nameKR: '삼도천',          regionId: 'underworld', levelRange: [550000, 800000],   bossId: undefined,             isHardOnly: false, mapX: 30, mapY: 78, icon: 'river' },
  { id: 'hell-gate',         nameKR: '저승 관문',       regionId: 'underworld', levelRange: [720000, 1000000],  bossId: 'hell-gate-guard',     isHardOnly: false, mapX: 68, mapY: 72, icon: 'portcullis' },
  { id: 'yama-hall',         nameKR: '염라대왕 전각',   regionId: 'underworld', levelRange: [900000, 1250000],  bossId: 'yama-king',           isHardOnly: false, mapX: 45, mapY: 62, icon: 'throne' },
  { id: 'oblivion-river',    nameKR: '망각의 강',       regionId: 'underworld', levelRange: [1150000, 1600000], bossId: undefined,             isHardOnly: false, mapX: 25, mapY: 52, icon: 'river' },
  { id: 'grudge-plains',     nameKR: '원혼 들판',       regionId: 'underworld', levelRange: [1400000, 1900000], bossId: 'grudge-general',      isHardOnly: false, mapX: 65, mapY: 45, icon: 'ghost' },
  { id: 'ghost-castle',      nameKR: '귀왕의 성',       regionId: 'underworld', levelRange: [1700000, 2400000], bossId: 'ghost-king',          isHardOnly: false, mapX: 42, mapY: 35, icon: 'haunted-house' },
  { id: 'deep-underworld',   nameKR: '저승 심층',       regionId: 'underworld', levelRange: [2200000, 3100000], bossId: undefined,             isHardOnly: false, mapX: 68, mapY: 28, icon: 'skull' },
  { id: 'hell-door',         nameKR: '지옥문',          regionId: 'underworld', levelRange: [2900000, 4000000], bossId: 'hell-door-guardian',  isHardOnly: false, mapX: 30, mapY: 20, icon: 'door' },
  { id: 'dark-kingdom',      nameKR: '어둠의 왕국',     regionId: 'underworld', levelRange: [3700000, 5200000], bossId: 'dark-kingdom-ruler',  isHardOnly: false, mapX: 55, mapY: 15, icon: 'crown' },
  { id: 'dissolution-zone',  nameKR: '존재 소멸 지대',  regionId: 'underworld', levelRange: [4800000, 6800000], bossId: undefined,             isHardOnly: false, mapX: 25, mapY: 8,  icon: 'void' },
  { id: 'final-judgment',    nameKR: '최후의 심판',     regionId: 'underworld', levelRange: [6200000, 8500000], bossId: 'final-judge',         isHardOnly: false, mapX: 60, mapY: 5,  icon: 'scale' },
  { id: 'underworld-depths', nameKR: '저승 최심층',     regionId: 'underworld', levelRange: [8000000, Infinity],bossId: 'underworld-lord',     isHardOnly: false, mapX: 42, mapY: 2,  icon: 'abyss' },

  // ── Region: heaven (천상계) ── 10구역 Lv 2,000,000–32,000,000
  { id: 'cloud-gate',        nameKR: '구름 관문',   regionId: 'heaven-realm', levelRange: [2000000, 3000000],   bossId: 'cloud-guardian',          isHardOnly: false, mapX: 50, mapY: 88, icon: 'cloud' },
  { id: 'fairy-valley',      nameKR: '선녀 계곡',   regionId: 'heaven-realm', levelRange: [2700000, 4000000],   bossId: undefined,                 isHardOnly: false, mapX: 30, mapY: 78, icon: 'feather' },
  { id: 'celestial-garden',  nameKR: '천상 정원',   regionId: 'heaven-realm', levelRange: [3600000, 5200000],   bossId: 'celestial-garden-spirit', isHardOnly: false, mapX: 68, mapY: 72, icon: 'flower' },
  { id: 'jade-palace',       nameKR: '옥황상제 궁전',regionId: 'heaven-realm', levelRange: [4800000, 6800000],  bossId: 'jade-emperor',            isHardOnly: false, mapX: 45, mapY: 60, icon: 'palace' },
  { id: 'star-field',        nameKR: '별자리 지대', regionId: 'heaven-realm', levelRange: [6200000, 8800000],   bossId: undefined,                 isHardOnly: false, mapX: 25, mapY: 50, icon: 'star' },
  { id: 'thunder-divine',    nameKR: '천둥신 영역', regionId: 'heaven-realm', levelRange: [8200000, 11500000],  bossId: 'thunder-celestial',       isHardOnly: false, mapX: 65, mapY: 42, icon: 'lightning' },
  { id: 'immortal-realm',    nameKR: '신선 경지',   regionId: 'heaven-realm', levelRange: [10500000, 15000000], bossId: undefined,                 isHardOnly: false, mapX: 40, mapY: 32, icon: 'yin-yang' },
  { id: 'heaven-depths',     nameKR: '천상계 심층', regionId: 'heaven-realm', levelRange: [13500000, 19000000], bossId: 'celestial-lord',          isHardOnly: false, mapX: 68, mapY: 22, icon: 'crown' },
  { id: 'chaos-door',        nameKR: '혼돈의 문 앞',regionId: 'heaven-realm', levelRange: [17000000, 24000000], bossId: undefined,                 isHardOnly: false, mapX: 30, mapY: 15, icon: 'portal' },
  { id: 'heaven-deepest',    nameKR: '천상 최심층', regionId: 'heaven-realm', levelRange: [22000000, 32000000], bossId: 'heaven-ruler',            isHardOnly: false, mapX: 52, mapY: 8,  icon: 'infinity' },

  // ── Region: chaos (혼돈의 끝) ── 9구역 visible + 1 hidden Lv 15,000,000–∞
  { id: 'chaos-land',        nameKR: '혼돈의 땅',    regionId: 'chaos', levelRange: [15000000, 25000000],   bossId: 'chaos-god',          isHardOnly: false, mapX: 50, mapY: 88, icon: 'chaos' },
  { id: 'time-rift',         nameKR: '시간의 틈',    regionId: 'chaos', levelRange: [22000000, 38000000],   bossId: undefined,            isHardOnly: false, mapX: 30, mapY: 75, icon: 'hourglass' },
  { id: 'void-boundary',     nameKR: '공허의 경계',  regionId: 'chaos', levelRange: [34000000, 56000000],   bossId: 'void-boundary-lord', isHardOnly: false, mapX: 68, mapY: 68, icon: 'void' },
  { id: 'existence-end',     nameKR: '존재의 끝',    regionId: 'chaos', levelRange: [52000000, 88000000],   bossId: undefined,            isHardOnly: false, mapX: 25, mapY: 55, icon: 'skull' },
  { id: 'time-collapse',     nameKR: '시간 붕괴 지대',regionId: 'chaos', levelRange: [80000000, 135000000], bossId: 'time-destroyer',     isHardOnly: false, mapX: 62, mapY: 45, icon: 'broken-clock' },
  { id: 'primal-void',       nameKR: '원초의 공허',  regionId: 'chaos', levelRange: [125000000, 210000000], bossId: undefined,            isHardOnly: false, mapX: 38, mapY: 35, icon: 'black-hole' },
  { id: 'god-battlefield',   nameKR: '신들의 전장',  regionId: 'chaos', levelRange: [190000000, 320000000], bossId: 'god-of-gods',        isHardOnly: false, mapX: 65, mapY: 25, icon: 'crossed-swords' },
  { id: 'final-gate',        nameKR: '최종 구역 입구',regionId: 'chaos', levelRange: [300000000, 500000000],bossId: undefined,            isHardOnly: false, mapX: 30, mapY: 15, icon: 'gate' },
  { id: 'final-realm',       nameKR: '최종 구역',    regionId: 'final-realm', levelRange: [450000000, Infinity],  bossId: 'final-boss',         isHardOnly: false, mapX: 55, mapY: 8,  icon: 'crown' },
  // hidden: levelRange[0] === Infinity → UI에서 렌더링 스킵
  { id: 'primordial-chaos',  nameKR: '태초의 혼돈',  regionId: 'chaos', levelRange: [Infinity, Infinity],   bossId: 'primordial-chaos',   isHardOnly: false, mapX: 42, mapY: 2,  icon: 'infinity' },

  // ── Region: demon-castle (마왕의 성) ── 9구역 isHardOnly: true Lv 100–∞
  { id: 'hard-abyss',        nameKR: '심연',        regionId: 'demon-castle', levelRange: [100, 5000],          bossId: 'abyss-lord',          isHardOnly: true, mapX: 50, mapY: 88, icon: 'abyss' },
  { id: 'hard-void',         nameKR: '공허',        regionId: 'demon-castle', levelRange: [5000, 50000],        bossId: 'void-king',           isHardOnly: true, mapX: 35, mapY: 75, icon: 'void' },
  { id: 'demon-gate',        nameKR: '마왕의 관문', regionId: 'demon-castle', levelRange: [30000, 200000],      bossId: 'demon-gate-guardian', isHardOnly: true, mapX: 65, mapY: 65, icon: 'gate' },
  { id: 'cursed-castle',     nameKR: '저주받은 성', regionId: 'demon-castle', levelRange: [150000, 800000],     bossId: 'cursed-castle-lord',  isHardOnly: true, mapX: 30, mapY: 52, icon: 'haunted-house' },
  { id: 'demon-hall',        nameKR: '마왕의 전각', regionId: 'demon-castle', levelRange: [600000, 3000000],    bossId: 'demon-palace-lord',   isHardOnly: true, mapX: 60, mapY: 42, icon: 'throne' },
  { id: 'dark-treasury',     nameKR: '어둠의 보고', regionId: 'demon-castle', levelRange: [2000000, 10000000],  bossId: 'dark-treasury-guard', isHardOnly: true, mapX: 35, mapY: 30, icon: 'treasure' },
  { id: 'demon-throne-room', nameKR: '마왕의 옥좌', regionId: 'demon-castle', levelRange: [8000000, 40000000],  bossId: 'demon-throne',        isHardOnly: true, mapX: 65, mapY: 20, icon: 'crown' },
  { id: 'demon-inner',       nameKR: '마왕의 심층', regionId: 'demon-castle', levelRange: [30000000, 150000000],bossId: 'demon-king-inner',    isHardOnly: true, mapX: 40, mapY: 10, icon: 'skull' },
  { id: 'demon-king',        nameKR: '마왕 본체',   regionId: 'demon-castle', levelRange: [100000000, Infinity], bossId: 'demon-king',         isHardOnly: true, mapX: 55, mapY: 3,  icon: 'dragon' },
];

export function getAreaById(id: string): MapArea | undefined {
  return MAP_AREAS.find((a) => a.id === id);
}

export function getAvailableAreas(isHardMode: boolean): MapArea[] {
  return MAP_AREAS.filter(
    (a) => a.levelRange[0] !== Infinity && (!a.isHardOnly || isHardMode)
  );
}

export function getAreasByRegion(regionId: string, isHardMode: boolean): MapArea[] {
  return MAP_AREAS.filter(
    (a) =>
      a.regionId === regionId &&
      a.levelRange[0] !== Infinity &&
      (!a.isHardOnly || isHardMode)
  );
}
