import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { CHARACTERS, getUnlockedCharacters } from '../data/characters';
import type { Character } from '../types';

export function ClassSelect() {
  const [selected, setSelected] = useState<string | null>(null);
  const startRun = useGameStore((s) => s.startRun);
  const setScreen = useGameStore((s) => s.setScreen);
  const meta = useGameStore((s) => s.meta);
  const unlocked = getUnlockedCharacters(meta.soulGrade);
  const unlockedIds = new Set(unlocked.map((c) => c.id));

  const handleStart = () => {
    if (!selected) return;
    startRun(selected, false);
  };

  return (
    <div className="screen" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setScreen('main-menu')}>
          ← 뒤로
        </button>
        <span style={{ color: 'var(--forge-accent)', fontWeight: 700 }}>영웅을 선택하라</span>
        <span style={{ fontSize: 12, color: 'var(--forge-text-muted)' }}>영혼등급 {meta.soulGrade}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {CHARACTERS.map((char) => {
          const isUnlocked = unlockedIds.has(char.id);
          const isSelected = selected === char.id;
          const charLv = meta.characterLevels[char.id] ?? 0;
          return (
            <CharCard
              key={char.id}
              char={char}
              unlocked={isUnlocked}
              selected={isSelected}
              charLv={charLv}
              onSelect={() => isUnlocked && setSelected(char.id)}
            />
          );
        })}
      </div>

      {selected && (
        <CharDetail char={CHARACTERS.find((c) => c.id === selected)!} />
      )}

      <button
        className="btn-primary"
        style={{ width: '100%', marginTop: 'auto', opacity: selected ? 1 : 0.4 }}
        disabled={!selected}
        onClick={handleStart}
      >
        모험 시작
      </button>
    </div>
  );
}

function CharCard({ char, unlocked, selected, charLv, onSelect }: {
  char: Character;
  unlocked: boolean;
  selected: boolean;
  charLv: number;
  onSelect: () => void;
}) {
  return (
    <button
      role="button"
      aria-label={unlocked ? char.nameKR : '잠김'}
      className={selected ? 'selected' : ''}
      onClick={onSelect}
      style={{
        background: selected ? 'var(--forge-accent-dim)' : 'var(--forge-bg-card)',
        border: `1px solid ${selected ? 'var(--forge-accent)' : 'var(--forge-border)'}`,
        borderRadius: 8,
        padding: '8px 4px',
        textAlign: 'center',
        cursor: unlocked ? 'pointer' : 'default',
        opacity: unlocked ? 1 : 0.35,
        position: 'relative',
      }}
    >
      {charLv > 0 && (
        <div style={{ position: 'absolute', top: 2, right: 2, background: 'var(--forge-accent)', color: '#1a1a24', fontSize: 8, fontWeight: 700, borderRadius: 3, padding: '1px 3px', lineHeight: 1.2 }}>
          Lv.{charLv}
        </div>
      )}
      <div style={{ fontSize: 24, lineHeight: 1 }}>{unlocked ? char.emoji : '🔒'}</div>
      <div style={{ fontSize: 10, color: 'var(--forge-text-secondary)', fontWeight: 600, marginTop: 4 }}>
        {unlocked ? char.nameKR : '???'}
      </div>
      <div style={{ fontSize: 9, color: 'var(--forge-text-muted)' }}>
        {unlocked ? char.statFocus : ''}
      </div>
    </button>
  );
}

function CharDetail({ char }: { char: Character }) {
  return (
    <div className="panel" style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 700, color: 'var(--forge-accent)', marginBottom: 4 }}>
        {char.emoji} {char.nameKR}
      </div>
      <div style={{ fontSize: 12, color: 'var(--forge-text-muted)', marginBottom: 6 }}>
        {char.statFocus}
      </div>
      <div style={{ fontSize: 12, color: 'var(--forge-text-secondary)' }}>
        패시브: {char.passiveSkill.nameKR} — {char.passiveSkill.description}
      </div>
    </div>
  );
}
