import type { Boss } from '../types';

export const BOSSES: Boss[] = [
  // ── Normal mode: original 9 (preserved as-is) ──
  { id: 'goblin-chief',   nameKR: '도깨비 대장',  emoji: '👹', areaId: 'goblin-pass',      bpReward: 3, isHardMode: false, hpMult: 10, atkMult: 2 },
  { id: 'gate-guardian',  nameKR: '관문 수호신',  emoji: '⛩️',  areaId: 'baekdu-gate',      bpReward: 3, isHardMode: false, hpMult: 10, atkMult: 2 },
  { id: 'sea-god',        nameKR: '해신',         emoji: '🌊', areaId: 'dragon-palace',    bpReward: 4, isHardMode: false, hpMult: 12, atkMult: 2.5 },
  { id: 'black-dragon',   nameKR: '흑룡',         emoji: '🐲', areaId: 'black-dragon-den', bpReward: 5, isHardMode: false, hpMult: 15, atkMult: 3 },
  { id: 'death-reaper',   nameKR: '저승사자',     emoji: '💀', areaId: 'underworld-gate',  bpReward: 5, isHardMode: false, hpMult: 15, atkMult: 3 },
  { id: 'jade-emperor',   nameKR: '옥황상제',     emoji: '👑', areaId: 'jade-palace',      bpReward: 6, isHardMode: false, hpMult: 20, atkMult: 3.5 },
  { id: 'chaos-god',      nameKR: '혼돈신',       emoji: '🌀', areaId: 'chaos-land',       bpReward: 6, isHardMode: false, hpMult: 20, atkMult: 3.5 },
  { id: 'final-boss',     nameKR: '최종보스',     emoji: '🌟', areaId: 'final-realm',      bpReward: 8, isHardMode: false, hpMult: 30, atkMult: 4 },
  { id: 'time-warden',    nameKR: '시간의 파수꾼',emoji: '⏳', areaId: 'time-rift',        bpReward: 6, isHardMode: false, hpMult: 20, atkMult: 3.5 },

  // ── Hard mode: original 9 (preserved as-is) ──
  { id: 'abyss-lord',     nameKR: '심연의 군주',  emoji: '🕳️',  areaId: 'hard-abyss',       bpReward: 4, isHardMode: true,  hpMult: 15, atkMult: 3 },
  { id: 'void-king',      nameKR: '공허의 왕',    emoji: '🌑', areaId: 'hard-void',        bpReward: 5, isHardMode: true,  hpMult: 18, atkMult: 3.5 },
  { id: 'hard-goblin',    nameKR: '도깨비 왕',    emoji: '👺', areaId: 'goblin-pass',      bpReward: 4, isHardMode: true,  hpMult: 15, atkMult: 3 },
  { id: 'hard-dragon',    nameKR: '황금룡',       emoji: '✨', areaId: 'black-dragon-den', bpReward: 5, isHardMode: true,  hpMult: 20, atkMult: 4 },
  { id: 'hard-reaper',    nameKR: '사신',         emoji: '🔱', areaId: 'underworld-gate',  bpReward: 5, isHardMode: true,  hpMult: 20, atkMult: 4 },
  { id: 'hard-emperor',   nameKR: '천제',         emoji: '🏆', areaId: 'jade-palace',      bpReward: 6, isHardMode: true,  hpMult: 25, atkMult: 4.5 },
  { id: 'hard-chaos',     nameKR: '원초혼돈',     emoji: '💫', areaId: 'chaos-land',       bpReward: 6, isHardMode: true,  hpMult: 25, atkMult: 4.5 },
  { id: 'hard-final',     nameKR: '진 최종보스',  emoji: '🌈', areaId: 'final-realm',      bpReward: 8, isHardMode: true,  hpMult: 40, atkMult: 5 },
  { id: 'hard-time',      nameKR: '시간파괴자',   emoji: '⚡', areaId: 'time-rift',        bpReward: 6, isHardMode: true,  hpMult: 25, atkMult: 4.5 },

  // ── New normal bosses: plains region (lv 1–5,000) ──
  { id: 'plains-ghost',        nameKR: '옛 성터 망령',     emoji: '👻', areaId: 'old-fortress',      bpReward: 2, isHardMode: false, hpMult: 8,  atkMult: 1.5 },
  { id: 'spirit-post-guardian',nameKR: '서낭당 수호신',    emoji: '🪄', areaId: 'spirit-post',       bpReward: 2, isHardMode: false, hpMult: 9,  atkMult: 1.8 },
  { id: 'cursed-plains',       nameKR: '저주의 들 악령',   emoji: '🌿', areaId: 'cursed-fields',     bpReward: 3, isHardMode: false, hpMult: 10, atkMult: 2,   guaranteedDrop: 'acc-spirit-talisman' },
  { id: 'plains-lord',         nameKR: '평야의 패왕',      emoji: '🦅', areaId: 'plains-border',     bpReward: 3, isHardMode: false, hpMult: 11, atkMult: 2.2 },

  // ── New normal bosses: forest region (lv 500–22,000) ──
  { id: 'gumiho',              nameKR: '구미호',           emoji: '🦊', areaId: 'fox-den',           bpReward: 3, isHardMode: false, hpMult: 10, atkMult: 2 },
  { id: 'tree-spirit',         nameKR: '신령 나무 정령',   emoji: '🌳', areaId: 'spirit-tree',       bpReward: 3, isHardMode: false, hpMult: 11, atkMult: 2.2 },
  { id: 'black-tiger',         nameKR: '흑호',             emoji: '🐯', areaId: 'beast-territory',   bpReward: 4, isHardMode: false, hpMult: 13, atkMult: 2.5 },
  { id: 'cursed-tree-spirit',  nameKR: '저주받은 목령',    emoji: '🌲', areaId: 'cursed-tree',       bpReward: 5, isHardMode: false, hpMult: 15, atkMult: 2.8 },
  { id: 'forest-ruler',        nameKR: '숲의 지배자',      emoji: '🌿', areaId: 'forest-heart',      bpReward: 5, isHardMode: false, hpMult: 16, atkMult: 3,   guaranteedDrop: 'w-vine-bow' },

  // ── New normal bosses: mountains region (lv 3,000–180,000) ──
  { id: 'mountain-god',        nameKR: '산신',             emoji: '🏔️',  areaId: 'mountain-shrine',   bpReward: 4, isHardMode: false, hpMult: 13, atkMult: 2.5 },
  { id: 'kumgang-spirit',      nameKR: '금강산 신령',      emoji: '⛰️',  areaId: 'kumgang-peak',      bpReward: 4, isHardMode: false, hpMult: 14, atkMult: 2.8 },
  { id: 'thunder-god',         nameKR: '천둥신',           emoji: '⛈️',  areaId: 'thunder-gorge',     bpReward: 6, isHardMode: false, hpMult: 20, atkMult: 3.5 },
  { id: 'sky-mountain-lord',   nameKR: '구름 너머의 군주', emoji: '🌤️',  areaId: 'summit-beyond',     bpReward: 6, isHardMode: false, hpMult: 22, atkMult: 3.8 },

  // ── New normal bosses: sea region (lv 20,000–400,000) ──
  { id: 'wave-spirit',         nameKR: '파도 정령',        emoji: '🌊', areaId: 'cliff-coast',       bpReward: 4, isHardMode: false, hpMult: 13, atkMult: 2.5 },
  { id: 'dragon-king-guard',   nameKR: '용왕 근위대장',    emoji: '🐉', areaId: 'dragon-treasury',   bpReward: 5, isHardMode: false, hpMult: 18, atkMult: 3.2 },
  { id: 'ice-sea-dragon',      nameKR: '빙해룡',           emoji: '🧊', areaId: 'glacier-sea',       bpReward: 6, isHardMode: false, hpMult: 20, atkMult: 3.5 },
  { id: 'true-sea-god',        nameKR: '진 해신',          emoji: '🌊', areaId: 'deep-palace',       bpReward: 7, isHardMode: false, hpMult: 24, atkMult: 4 },
  { id: 'abyss-sea-ruler',     nameKR: '심해 지배자',      emoji: '🦑', areaId: 'abyss-throne',      bpReward: 7, isHardMode: false, hpMult: 26, atkMult: 4.2 },

  // ── New normal bosses: volcano region (lv 100,000–2,100,000) ──
  { id: 'ash-spirit',          nameKR: '재의 정령',        emoji: '🌋', areaId: 'ash-plains',        bpReward: 5, isHardMode: false, hpMult: 16, atkMult: 3 },
  { id: 'fire-warlord',        nameKR: '화염의 군주',      emoji: '🔥', areaId: 'flame-gorge',       bpReward: 6, isHardMode: false, hpMult: 20, atkMult: 3.5 },
  { id: 'magma-king',          nameKR: '마그마 왕',        emoji: '♨️',  areaId: 'magma-depths',      bpReward: 7, isHardMode: false, hpMult: 24, atkMult: 4 },
  { id: 'volcano-heart',       nameKR: '화산의 심장',      emoji: '❤️‍🔥', areaId: 'volcano-heart',     bpReward: 7, isHardMode: false, hpMult: 26, atkMult: 4.2 },
  { id: 'fire-sovereign',      nameKR: '불의 지배자',      emoji: '🏛️',  areaId: 'fire-throne',       bpReward: 8, isHardMode: false, hpMult: 30, atkMult: 4.5 },

  // ── New normal bosses: underworld region (lv 400,000–∞) ──
  { id: 'hell-gate-guard',     nameKR: '저승 관문 파수꾼', emoji: '🗝️',  areaId: 'hell-gate',         bpReward: 6, isHardMode: false, hpMult: 20, atkMult: 3.5 },
  { id: 'yama-king',           nameKR: '염라대왕',         emoji: '👿', areaId: 'yama-hall',         bpReward: 6, isHardMode: false, hpMult: 22, atkMult: 3.8 },
  { id: 'grudge-general',      nameKR: '원혼 장군',        emoji: '⚔️',  areaId: 'grudge-plains',     bpReward: 7, isHardMode: false, hpMult: 25, atkMult: 4 },
  { id: 'ghost-king',          nameKR: '귀왕',             emoji: '🏰', areaId: 'ghost-castle',      bpReward: 7, isHardMode: false, hpMult: 26, atkMult: 4.2 },
  { id: 'hell-door-guardian',  nameKR: '지옥문 수호자',    emoji: '🔒', areaId: 'hell-door',         bpReward: 8, isHardMode: false, hpMult: 30, atkMult: 4.5 },
  { id: 'dark-kingdom-ruler',  nameKR: '어둠의 왕',        emoji: '🌑', areaId: 'dark-kingdom',      bpReward: 8, isHardMode: false, hpMult: 32, atkMult: 4.5 },
  { id: 'final-judge',         nameKR: '최후의 심판자',    emoji: '⚖️',  areaId: 'final-judgment',    bpReward: 8, isHardMode: false, hpMult: 35, atkMult: 4.8 },
  { id: 'underworld-lord',     nameKR: '저승의 절대자',    emoji: '💀', areaId: 'underworld-depths', bpReward: 8, isHardMode: false, hpMult: 38, atkMult: 5 },

  // ── New normal bosses: heaven region (lv 2,000,000–32,000,000) ──
  { id: 'cloud-guardian',           nameKR: '구름 관문 수호자',   emoji: '☁️',  areaId: 'cloud-gate',        bpReward: 7, isHardMode: false, hpMult: 25, atkMult: 4 },
  { id: 'celestial-garden-spirit',  nameKR: '천상 정원의 정령',   emoji: '🌸', areaId: 'celestial-garden',  bpReward: 7, isHardMode: false, hpMult: 26, atkMult: 4.2 },
  { id: 'thunder-celestial',        nameKR: '천둥 신선',          emoji: '⚡', areaId: 'thunder-divine',    bpReward: 7, isHardMode: false, hpMult: 28, atkMult: 4.3 },
  { id: 'celestial-lord',           nameKR: '천상계 군주',        emoji: '✨', areaId: 'heaven-depths',     bpReward: 8, isHardMode: false, hpMult: 32, atkMult: 4.5 },
  { id: 'heaven-ruler',             nameKR: '천상의 절대자',      emoji: '👼', areaId: 'heaven-deepest',    bpReward: 8, isHardMode: false, hpMult: 35, atkMult: 4.8 },

  // ── New normal bosses: chaos region (lv 15,000,000–∞) ──
  { id: 'void-boundary-lord',  nameKR: '공허 경계의 지배자', emoji: '🌌', areaId: 'void-boundary',     bpReward: 8, isHardMode: false, hpMult: 32, atkMult: 4.5 },
  { id: 'time-destroyer',      nameKR: '시간 파괴자',        emoji: '🕰️',  areaId: 'time-collapse',     bpReward: 8, isHardMode: false, hpMult: 35, atkMult: 4.8 },
  { id: 'god-of-gods',         nameKR: '신 중의 신',         emoji: '🌠', areaId: 'god-battlefield',   bpReward: 8, isHardMode: false, hpMult: 40, atkMult: 5 },
  { id: 'primordial-chaos',    nameKR: '태초의 혼돈',        emoji: '♾️',  areaId: 'primordial-chaos',  bpReward: 8, isHardMode: false, hpMult: 50, atkMult: 5.5 },

  // ── Hard mode: demon-castle region (isHardOnly, isHardMode: true) ──
  { id: 'demon-gate-guardian', nameKR: '마왕 관문 수호자',   emoji: '🔱', areaId: 'demon-gate',        bpReward: 5, isHardMode: true,  hpMult: 18, atkMult: 3.5 },
  { id: 'cursed-castle-lord',  nameKR: '저주받은 성의 군주', emoji: '🏚️',  areaId: 'cursed-castle',     bpReward: 6, isHardMode: true,  hpMult: 22, atkMult: 4 },
  { id: 'demon-palace-lord',   nameKR: '마왕의 전각 군주',   emoji: '👹', areaId: 'demon-hall',        bpReward: 7, isHardMode: true,  hpMult: 28, atkMult: 4.3 },
  { id: 'dark-treasury-guard', nameKR: '어둠의 보고 수호자', emoji: '💎', areaId: 'dark-treasury',     bpReward: 7, isHardMode: true,  hpMult: 32, atkMult: 4.5 },
  { id: 'demon-throne',        nameKR: '마왕의 옥좌 수호자', emoji: '🪑', areaId: 'demon-throne-room', bpReward: 8, isHardMode: true,  hpMult: 38, atkMult: 4.8 },
  { id: 'demon-king-inner',    nameKR: '마왕 본체 내핵',     emoji: '😈', areaId: 'demon-inner',       bpReward: 8, isHardMode: true,  hpMult: 45, atkMult: 5 },
  { id: 'demon-king',          nameKR: '마왕',               emoji: '🐉', areaId: 'demon-king',        bpReward: 8, isHardMode: true,  hpMult: 55, atkMult: 5.5 },

  // ── Hard variants for new normal plains bosses ──
  { id: 'plains-ghost-hard',         nameKR: '원한의 성터 망령',  emoji: '💀', areaId: 'old-fortress',      bpReward: 3, isHardMode: true,  hpMult: 14, atkMult: 2 },
  { id: 'spirit-post-guardian-hard', nameKR: '광란의 서낭신',     emoji: '⚡', areaId: 'spirit-post',       bpReward: 3, isHardMode: true,  hpMult: 15, atkMult: 2.4 },
  { id: 'cursed-plains-hard',        nameKR: '타락한 저주 악령',  emoji: '🌑', areaId: 'cursed-fields',     bpReward: 4, isHardMode: true,  hpMult: 17, atkMult: 2.8 },
  { id: 'plains-lord-hard',          nameKR: '심연의 평야 패왕',  emoji: '🦅', areaId: 'plains-border',     bpReward: 4, isHardMode: true,  hpMult: 18, atkMult: 3 },

  // ── Hard variants for new normal forest bosses ──
  { id: 'gumiho-hard',               nameKR: '구미호 왕',         emoji: '🦊', areaId: 'fox-den',           bpReward: 4, isHardMode: true,  hpMult: 17, atkMult: 2.8 },
  { id: 'tree-spirit-hard',          nameKR: '분노한 신령 목령',  emoji: '🌳', areaId: 'spirit-tree',       bpReward: 4, isHardMode: true,  hpMult: 18, atkMult: 3 },
  { id: 'black-tiger-hard',          nameKR: '심연의 흑호',       emoji: '🐯', areaId: 'beast-territory',   bpReward: 5, isHardMode: true,  hpMult: 22, atkMult: 3.5 },
  { id: 'cursed-tree-spirit-hard',   nameKR: '타락한 목령',       emoji: '🌲', areaId: 'cursed-tree',       bpReward: 6, isHardMode: true,  hpMult: 26, atkMult: 4 },
  { id: 'forest-ruler-hard',         nameKR: '원초의 숲 지배자',  emoji: '🌿', areaId: 'forest-heart',      bpReward: 6, isHardMode: true,  hpMult: 28, atkMult: 4.2 },

  // ── Hard variants for new normal mountains bosses ──
  { id: 'mountain-god-hard',         nameKR: '광분한 산신',       emoji: '🏔️',  areaId: 'mountain-shrine',   bpReward: 5, isHardMode: true,  hpMult: 22, atkMult: 3.5 },
  { id: 'kumgang-spirit-hard',       nameKR: '분노한 금강 신령',  emoji: '⛰️',  areaId: 'kumgang-peak',      bpReward: 5, isHardMode: true,  hpMult: 23, atkMult: 3.8 },
  { id: 'thunder-god-hard',          nameKR: '원초 천둥신',       emoji: '⛈️',  areaId: 'thunder-gorge',     bpReward: 7, isHardMode: true,  hpMult: 35, atkMult: 5 },
  { id: 'sky-mountain-lord-hard',    nameKR: '심연의 산 군주',    emoji: '🌤️',  areaId: 'summit-beyond',     bpReward: 7, isHardMode: true,  hpMult: 38, atkMult: 5.2 },

  // ── Hard variants for new normal sea bosses ──
  { id: 'wave-spirit-hard',          nameKR: '폭풍 파도 정령',    emoji: '🌊', areaId: 'cliff-coast',       bpReward: 5, isHardMode: true,  hpMult: 22, atkMult: 3.5 },
  { id: 'dragon-king-guard-hard',    nameKR: '심연의 용왕 근위',  emoji: '🐉', areaId: 'dragon-treasury',   bpReward: 6, isHardMode: true,  hpMult: 28, atkMult: 4.5 },
  { id: 'ice-sea-dragon-hard',       nameKR: '타락한 빙해룡',     emoji: '🧊', areaId: 'glacier-sea',       bpReward: 7, isHardMode: true,  hpMult: 35, atkMult: 5 },
  { id: 'true-sea-god-hard',         nameKR: '심연의 진 해신',    emoji: '🌊', areaId: 'deep-palace',       bpReward: 8, isHardMode: true,  hpMult: 40, atkMult: 5.5 },
  { id: 'abyss-sea-ruler-hard',      nameKR: '원초 심해 지배자',  emoji: '🦑', areaId: 'abyss-throne',      bpReward: 8, isHardMode: true,  hpMult: 45, atkMult: 5.5 },

  // ── Hard variants for new normal volcano bosses ──
  { id: 'ash-spirit-hard',           nameKR: '분노한 재의 정령',  emoji: '🌋', areaId: 'ash-plains',        bpReward: 6, isHardMode: true,  hpMult: 26, atkMult: 4.2 },
  { id: 'fire-warlord-hard',         nameKR: '심연의 화염 군주',  emoji: '🔥', areaId: 'flame-gorge',       bpReward: 7, isHardMode: true,  hpMult: 35, atkMult: 5 },
  { id: 'magma-king-hard',           nameKR: '원초 마그마 왕',    emoji: '♨️',  areaId: 'magma-depths',      bpReward: 8, isHardMode: true,  hpMult: 40, atkMult: 5.5 },
  { id: 'volcano-heart-hard',        nameKR: '타락한 화산의 심장',emoji: '❤️‍🔥', areaId: 'volcano-heart',     bpReward: 8, isHardMode: true,  hpMult: 44, atkMult: 5.8 },
  { id: 'fire-sovereign-hard',       nameKR: '심연의 불의 지배자',emoji: '🏛️',  areaId: 'fire-throne',       bpReward: 8, isHardMode: true,  hpMult: 50, atkMult: 6 },

  // ── Hard variants for new normal underworld bosses ──
  { id: 'hell-gate-guard-hard',      nameKR: '심연의 저승 파수꾼',emoji: '🗝️',  areaId: 'hell-gate',         bpReward: 7, isHardMode: true,  hpMult: 35, atkMult: 5 },
  { id: 'yama-king-hard',            nameKR: '타락한 염라대왕',   emoji: '👿', areaId: 'yama-hall',         bpReward: 7, isHardMode: true,  hpMult: 38, atkMult: 5.2 },
  { id: 'grudge-general-hard',       nameKR: '심연의 원혼 장군',  emoji: '⚔️',  areaId: 'grudge-plains',     bpReward: 8, isHardMode: true,  hpMult: 42, atkMult: 5.5 },
  { id: 'ghost-king-hard',           nameKR: '원초의 귀왕',       emoji: '🏰', areaId: 'ghost-castle',      bpReward: 8, isHardMode: true,  hpMult: 45, atkMult: 5.8 },
  { id: 'hell-door-guardian-hard',   nameKR: '심연의 지옥문 수호',emoji: '🔒', areaId: 'hell-door',         bpReward: 8, isHardMode: true,  hpMult: 50, atkMult: 6 },
  { id: 'dark-kingdom-ruler-hard',   nameKR: '원초의 어둠의 왕',  emoji: '🌑', areaId: 'dark-kingdom',      bpReward: 8, isHardMode: true,  hpMult: 52, atkMult: 6 },
  { id: 'final-judge-hard',          nameKR: '심연의 최후 심판자',emoji: '⚖️',  areaId: 'final-judgment',    bpReward: 8, isHardMode: true,  hpMult: 58, atkMult: 6.5 },
  { id: 'underworld-lord-hard',      nameKR: '저승의 원초 절대자',emoji: '💀', areaId: 'underworld-depths', bpReward: 8, isHardMode: true,  hpMult: 65, atkMult: 7 },

  // ── Hard variants for new normal heaven bosses ──
  { id: 'cloud-guardian-hard',            nameKR: '분노한 구름 수호자',  emoji: '⛅', areaId: 'cloud-gate',        bpReward: 8, isHardMode: true,  hpMult: 42, atkMult: 5.5 },
  { id: 'celestial-garden-spirit-hard',   nameKR: '타락한 천상 정원령',  emoji: '🌸', areaId: 'celestial-garden',  bpReward: 8, isHardMode: true,  hpMult: 44, atkMult: 5.8 },
  { id: 'thunder-celestial-hard',         nameKR: '원초 천둥 신선',       emoji: '⚡', areaId: 'thunder-divine',    bpReward: 8, isHardMode: true,  hpMult: 48, atkMult: 6 },
  { id: 'celestial-lord-hard',            nameKR: '심연의 천상 군주',     emoji: '✨', areaId: 'heaven-depths',     bpReward: 8, isHardMode: true,  hpMult: 55, atkMult: 6.5 },
  { id: 'heaven-ruler-hard',              nameKR: '원초의 천상 절대자',   emoji: '👼', areaId: 'heaven-deepest',    bpReward: 8, isHardMode: true,  hpMult: 60, atkMult: 7 },

  // ── Hard variants for new normal chaos bosses ──
  { id: 'void-boundary-lord-hard', nameKR: '원초 공허 경계 지배자', emoji: '🌌', areaId: 'void-boundary',     bpReward: 8, isHardMode: true,  hpMult: 55, atkMult: 6.5 },
  { id: 'time-destroyer-hard',     nameKR: '원초 시간 파괴자',      emoji: '🕰️',  areaId: 'time-collapse',     bpReward: 8, isHardMode: true,  hpMult: 60, atkMult: 7 },
  { id: 'god-of-gods-hard',        nameKR: '원초 신 중의 신',       emoji: '🌠', areaId: 'god-battlefield',   bpReward: 8, isHardMode: true,  hpMult: 68, atkMult: 7.5 },
  { id: 'primordial-chaos-hard',   nameKR: '심연의 태초 혼돈',      emoji: '♾️',  areaId: 'primordial-chaos',  bpReward: 8, isHardMode: true,  hpMult: 80, atkMult: 8 },
];

export function getBossById(id: string): Boss | undefined {
  return BOSSES.find(b => b.id === id);
}

export function getBossesForArea(areaId: string, isHardMode: boolean): Boss[] {
  return BOSSES.filter(b => b.areaId === areaId && b.isHardMode === isHardMode);
}
