import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { ForgeScreen } from '@/components/ui/forge-screen';
import { ForgeButton } from '@/components/ui/forge-button';
import { ForgePanel } from '@/components/ui/forge-panel';
import { CHARACTERS, getCharacterById } from '../data/characters';
import { SKILLS } from '../data/skills';
import { getUltById, getUltSkillsForChar } from '../data/jobskills';
import {
  jpCostToLevel, totalSkillLv, ultSlotsUnlocked,
  skillDmgMul, skillCooldownMul,
} from '../systems/skillProgression';
import type { ActiveSkill, UltSkillRow, SkillKind } from '../types';

const PHASE_F2F3_CORE_CHARS = ['hwarang', 'mudang', 'choeui'] as const;

export function SkillProgression() {
  const meta = useGameStore((s) => s.meta);
  const setScreen = useGameStore((s) => s.setScreen);
  const levelUpSkill = useGameStore((s) => s.levelUpSkill);
  const pickUltSlot = useGameStore((s) => s.pickUltSlot);
  const watchAdForJpCap = useGameStore((s) => s.watchAdForJpCap);

  const [charId, setCharId] = useState<string>(() => {
    const lastPlayed = meta.lastPlayedCharId;
    if ((PHASE_F2F3_CORE_CHARS as readonly string[]).includes(lastPlayed)) return lastPlayed;
    return 'hwarang';
  });

  const character = getCharacterById(charId);
  if (!character) return null;

  const charJp = meta.jp[charId] ?? 0;
  const charEarned = meta.jpEarnedTotal[charId] ?? 0;
  const charCap = meta.jpCap[charId] ?? 0;
  const total = totalSkillLv(meta.skillLevels, charId);
  const slotsOpen = ultSlotsUnlocked(total);
  const slots = meta.ultSlotPicks[charId] ?? [null, null, null, null];

  const baseSkills = SKILLS[charId] ?? [];
  const ulta = getUltSkillsForChar(charId);

  const renderSkillCard = (s: ActiveSkill | UltSkillRow, kind: SkillKind) => {
    const lv = meta.skillLevels[charId]?.[s.id] ?? 0;
    const dmg = skillDmgMul(kind, lv);
    const cd = (s.cooldownSec * skillCooldownMul(kind, lv)).toFixed(1);
    const cost = jpCostToLevel(kind, lv);
    const canLevel = charJp >= cost && (kind === 'base' || slots.includes(s.id));
    return (
      <ForgePanel key={s.id} data-testid={`skill-card-${s.id}`} style={{ padding: 8, marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>
          <span>{s.vfxEmoji}</span> <span data-testid={`skill-name-${s.id}`}>{s.nameKR}</span> <span style={{ color: 'var(--forge-accent)' }}>Lv {lv}</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--forge-text-muted)' }}>DMG ×{dmg.toFixed(2)}  CD {cd}s</div>
        <div style={{ fontSize: 11 }}>→ +1 lv  비용: {cost} JP</div>
        <ForgeButton
          variant="primary"
          disabled={!canLevel}
          onClick={() => levelUpSkill(charId, s.id)}
          data-testid={`skill-levelup-${s.id}`}
          style={{ marginTop: 4 }}
        >+1</ForgeButton>
      </ForgePanel>
    );
  };

  const renderUltSlot = (slotIdx: number) => {
    const isUnlocked = slotIdx < slotsOpen;
    const picked = slots[slotIdx];
    const requiredLvThresholds = [50, 200, 500, 1500] as const;
    const requiredLv = requiredLvThresholds[slotIdx] ?? 50;
    if (!isUnlocked) {
      return (
        <ForgePanel key={`slot-${slotIdx}`} data-testid={`ult-slot-${slotIdx}-locked`} style={{ padding: 8, marginBottom: 6, opacity: 0.5 }}>
          <div style={{ fontSize: 12 }}>🔒 Slot {slotIdx + 1}</div>
          <div style={{ fontSize: 11 }}>{slotIdx === 0 ? `누적 ${total}/${requiredLv} 필요` : `≥${requiredLv} lv 필요`}</div>
        </ForgePanel>
      );
    }
    if (!picked) {
      return (
        <ForgePanel key={`slot-${slotIdx}`} data-testid={`ult-slot-${slotIdx}-empty`} style={{ padding: 8, marginBottom: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>Slot {slotIdx + 1} ✓</div>
          <div style={{ fontSize: 11 }}>비어있음 — ULT 선택</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
            {ulta.filter(u => !slots.includes(u.id)).map((u) => (
              <ForgeButton
                key={u.id}
                variant="secondary"
                onClick={() => pickUltSlot(charId, slotIdx as 0 | 1 | 2 | 3, u.id)}
                data-testid={`ult-slot-${slotIdx}-pick-${u.id}`}
                style={{ fontSize: 11, padding: '4px 8px' }}
              >{u.nameKR}</ForgeButton>
            ))}
          </div>
        </ForgePanel>
      );
    }
    const ult = getUltById(picked);
    if (!ult) return null;
    return (
      <div key={`slot-${slotIdx}`} data-testid={`ult-slot-${slotIdx}-filled`}>
        {renderSkillCard(ult, 'ult')}
        <ForgeButton
          variant="secondary"
          onClick={() => pickUltSlot(charId, slotIdx as 0 | 1 | 2 | 3, null)}
          data-testid={`ult-slot-${slotIdx}-clear`}
          style={{ fontSize: 11, padding: '4px 8px' }}
        >변경 (비우기)</ForgeButton>
      </div>
    );
  };

  return (
    <ForgeScreen style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <ForgeButton variant="secondary" style={{ padding: '6px 14px' }} onClick={() => setScreen('town')}>← Town</ForgeButton>
        <span style={{ fontWeight: 700 }}>{character.nameKR}의 직업소</span>
        <span style={{ fontSize: 12 }}>JP {charJp} | cap {charCap}</span>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {PHASE_F2F3_CORE_CHARS.map((id) => {
          const c = CHARACTERS.find(ch => ch.id === id);
          if (!c) return null;
          return (
            <ForgeButton key={id} variant={charId === id ? 'primary' : 'secondary'} onClick={() => setCharId(id)} style={{ flex: 1 }}>
              {c.emoji} {c.nameKR}
            </ForgeButton>
          );
        })}
      </div>

      <ForgeButton
        variant="secondary"
        onClick={() => watchAdForJpCap(charId)}
        data-testid="watch-ad-btn"
        style={{ width: '100%', marginBottom: 12 }}
      >📺 광고 시청 +50 cap</ForgeButton>

      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Base Skills</div>
      {baseSkills.map((s) => renderSkillCard(s, 'base'))}

      <div style={{ fontSize: 12, fontWeight: 700, margin: '12px 0 6px' }}>ULT Slots (∑ skill lv {total})</div>
      {[0, 1, 2, 3].map((idx) => renderUltSlot(idx))}
    </ForgeScreen>
  );
}
