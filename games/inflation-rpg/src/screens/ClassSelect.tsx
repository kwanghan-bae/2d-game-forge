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
        <span style={{ color: 'var(--accent)', fontWeight: 700 }}>영웅을 선택하라</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>영혼등급 {meta.soulGrade}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {CHARACTERS.map((char) => {
          const isUnlocked = unlockedIds.has(char.id);
          const isSelected = selected === char.id;
          return (
            <CharCard
              key={char.id}
              char={char}
              unlocked={isUnlocked}
              selected={isSelected}
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

function CharCard({ char, unlocked, selected, onSelect }: {
  char: Character;
  unlocked: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      role="button"
      aria-label={unlocked ? char.nameKR : '잠김'}
      className={selected ? 'selected' : ''}
      onClick={onSelect}
      style={{
        background: selected ? 'var(--accent-dim)' : 'var(--bg-card)',
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 8,
        padding: '8px 4px',
        textAlign: 'center',
        cursor: unlocked ? 'pointer' : 'default',
        opacity: unlocked ? 1 : 0.35,
        position: 'relative',
      }}
    >
      <div style={{ fontSize: 24, lineHeight: 1 }}>{unlocked ? char.emoji : '🔒'}</div>
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600, marginTop: 4 }}>
        {unlocked ? char.nameKR : '???'}
      </div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>
        {unlocked ? char.statFocus : ''}
      </div>
    </button>
  );
}

function CharDetail({ char }: { char: Character }) {
  return (
    <div className="panel" style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
        {char.emoji} {char.nameKR}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
        {char.statFocus}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        패시브: {char.passiveSkill.nameKR} — {char.passiveSkill.description}
      </div>
    </div>
  );
}
