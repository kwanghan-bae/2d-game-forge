import type { UltSkillRow } from '../types';

export const ULT_CATALOG: UltSkillRow[] = [
  // ── 화랑 (검술 / 창술 / 체술 / 무영) ──
  { id: 'hwarang_ult_ilseom',     charId: 'hwarang', ultIndex: 1,
    nameKR: '일섬', description: '단일 처형 (HP 30% 이하 즉사)', cooldownSec: 8,
    effect: { type: 'execute', multiplier: 5, executeThreshold: 0.30 }, vfxEmoji: '⚡' },
  { id: 'hwarang_ult_cheongongmu', charId: 'hwarang', ultIndex: 2,
    nameKR: '천공무', description: '관통 다단', cooldownSec: 8,
    effect: { type: 'multi_hit', multiplier: 2.5, targets: 4 }, vfxEmoji: '🌪️' },
  { id: 'hwarang_ult_jinmyung',    charId: 'hwarang', ultIndex: 3,
    nameKR: '진명', description: '광역 폭발', cooldownSec: 8,
    effect: { type: 'aoe', multiplier: 3, targets: 5 }, vfxEmoji: '💥' },
  { id: 'hwarang_ult_muyoungsal',  charId: 'hwarang', ultIndex: 4,
    nameKR: '무영살', description: '크리 보장 처형', cooldownSec: 8,
    effect: { type: 'execute', multiplier: 6, executeThreshold: 0.35 }, vfxEmoji: '🌑' },

  // ── 무당 (저주 / 축복 / 점복 / 강령) ──
  { id: 'mudang_ult_heukju',       charId: 'mudang', ultIndex: 1,
    nameKR: '흑주', description: '광역 디버프 (적 ATK -50% × 5s)', cooldownSec: 8,
    effect: { type: 'debuff', debuffStatPercent: 50, debuffDurationSec: 5, targets: 5 }, vfxEmoji: '🌀' },
  { id: 'mudang_ult_chunwoo',      charId: 'mudang', ultIndex: 2,
    nameKR: '천우', description: '회복', cooldownSec: 8,
    effect: { type: 'heal', healPercent: 50 }, vfxEmoji: '✨' },
  { id: 'mudang_ult_sintak',       charId: 'mudang', ultIndex: 3,
    nameKR: '신탁', description: 'LUC 비례 처형', cooldownSec: 8,
    effect: { type: 'execute', multiplier: 4, executeThreshold: 0.30 }, vfxEmoji: '🔮' },
  { id: 'mudang_ult_younghonsohwan', charId: 'mudang', ultIndex: 4,
    nameKR: '영혼소환', description: '광역 다단', cooldownSec: 8,
    effect: { type: 'aoe', multiplier: 2.5, targets: 6 }, vfxEmoji: '👻' },

  // ── 초의 (방어 / 반격 / 분노 / 수호) ──
  { id: 'choeui_ult_bulgwae',      charId: 'choeui', ultIndex: 1,
    nameKR: '불괴', description: 'DEF buff', cooldownSec: 8,
    effect: { type: 'buff', buffStat: 'def', buffPercent: 100, buffDurationSec: 8 }, vfxEmoji: '🛡️' },
  { id: 'choeui_ult_bangyeokildo', charId: 'choeui', ultIndex: 2,
    nameKR: '반격일도', description: '받은 dmg 80% 반사 × 3s', cooldownSec: 8,
    effect: { type: 'reflect', reflectPercent: 80, reflectDurationSec: 3 }, vfxEmoji: '⚔️' },
  { id: 'choeui_ult_gwangpokwha',  charId: 'choeui', ultIndex: 3,
    nameKR: '광폭화', description: 'ATK buff', cooldownSec: 8,
    effect: { type: 'buff', buffStat: 'atk', buffPercent: 100, buffDurationSec: 8 }, vfxEmoji: '🔥' },
  { id: 'choeui_ult_hoguk',        charId: 'choeui', ultIndex: 4,
    nameKR: '호국', description: '회복', cooldownSec: 8,
    effect: { type: 'heal', healPercent: 50 }, vfxEmoji: '🌟' },
];

export function getUltSkillsForChar(charId: string): UltSkillRow[] {
  return ULT_CATALOG.filter(u => u.charId === charId);
}

export function getUltById(id: string): UltSkillRow | undefined {
  return ULT_CATALOG.find(u => u.id === id);
}
