import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useCycleStoreV2 } from '../overworld/cycleSliceV2';
import { getEquippedInstances } from '../systems/equipment';
import { getEffectiveElement } from '../systems/enchantSystem';
import { getUnlockedTitles } from '../data/ascensionTitles';
import { aggregateReforgeBonus } from '../systems/reforgeSystem';
import { ElementalBadge, AffinityMatchBanner } from './ElementalBadge';
import {
  TRIAL_FLOORS,
  MAX_TRIAL_FLOOR,
  getTrialFloor,
  resolveTrialCombat,
  type TrialCombatResult,
} from '../systems/ascensionTrials';
import { AscendantRushModal } from './AscendantRushModal';
import { ChaosRiftModal } from './ChaosRiftModal';
import { ApexTrialModal } from './ApexTrialModal';
import { AbyssalCorridorModal } from './AbyssalCorridorModal';
import { PrimordialAscensionModal } from './PrimordialAscensionModal';
import { RiftLeaderboardBadge } from './RiftLeaderboardBadge';
import { ZenithSanctuaryBadge } from './ZenithSanctuaryBadge';
import { PrimordialConstellationBadge } from './PrimordialConstellationBadge';

interface Props {
  onClose: () => void;
}

export function AscensionTrialsModal({ onClose }: Props) {
  const meta = useGameStore(s => s.meta);
  const run = useGameStore(s => s.run);
  const controller = useCycleStoreV2(s => s.controller);
  const hero = controller?.getHero();

  // Determine hero attack element & armor DR bonus from equipped gear
  const eqInst = getEquippedInstances(meta.inventory, meta.equippedItemIds);
  const equippedWeapon = eqInst.find(i => i.baseId.startsWith('w-'));
  const heroWeaponElement = equippedWeapon ? getEffectiveElement(equippedWeapon) : 'neutral';
  const reforgeBonus = aggregateReforgeBonus(eqInst);

  const clearedFloor = (meta as unknown as { ascensionTrialClearedFloor?: number }).ascensionTrialClearedFloor ?? 0;
  const unlockedTitles = getUnlockedTitles(clearedFloor);
  const highestTitle = unlockedTitles.length > 0 ? unlockedTitles[unlockedTitles.length - 1] : null;

  const [selectedFloor, setSelectedFloor] = useState<number>(
    Math.min(MAX_TRIAL_FLOOR, clearedFloor + 1),
  );
  const [combatResult, setCombatResult] = useState<TrialCombatResult | null>(null);
  const [showBossRush, setShowBossRush] = useState(false);
  const [showChaosRift, setShowChaosRift] = useState(false);
  const [showApexTrial, setShowApexTrial] = useState(false);
  const [showCorridor, setShowCorridor] = useState(false);
  const [showPrimordial, setShowPrimordial] = useState(false);

  const floorDef = getTrialFloor(selectedFloor) ?? TRIAL_FLOORS[0];
  const isUnlocked = selectedFloor <= clearedFloor + 1;
  const isCleared = selectedFloor <= clearedFloor;

  const handleChallenge = () => {
    if (!hero || !isUnlocked) return;

    const result = resolveTrialCombat(
      hero,
      selectedFloor,
      heroWeaponElement,
      reforgeBonus.armorDrBonus,
    );
    setCombatResult(result);

    if (result.won) {
      // Award rewards
      const newCleared = Math.max(clearedFloor, selectedFloor);
      const rew = result.rewards;
      useGameStore.setState(s => ({
        run: {
          ...s.run,
          goldThisRun: s.run.goldThisRun + (rew?.gold ?? 0),
        },
        meta: {
          ...s.meta,
          enhanceStones: s.meta.enhanceStones + (rew?.enhanceStones ?? 0),
          ascensionTrialClearedFloor: newCleared,
        } as typeof s.meta,
      }));
    }
  };

  return (
    <div
      data-testid="ascension-trials-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 110,
      }}
      onClick={onClose}
    >
      <div
        data-testid="ascension-trials-modal"
        style={{
          width: 'min(580px, 96vw)',
          maxHeight: '92vh',
          background: '#12141f',
          color: '#eee',
          borderRadius: 12,
          border: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#1a1d2d',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>⚔️</span>
            <div>
              <strong style={{ fontSize: 16, color: '#f8fafc' }}>승천의 시련 (보스 러시)</strong>
              <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>
                진행도: {clearedFloor}/{MAX_TRIAL_FLOOR}층
              </span>
              {highestTitle && (
                <span
                  data-testid="ascension-title-badge"
                  style={{
                    fontSize: 11,
                    color: '#fbbf24',
                    background: '#451a03',
                    padding: '2px 6px',
                    borderRadius: 4,
                    marginLeft: 8,
                    border: '1px solid #d97706',
                  }}
                >
                  {highestTitle.badge} {highestTitle.nameKR}
                </span>
              )}
              <span style={{ marginLeft: 6 }}>
                <RiftLeaderboardBadge highestDepth={meta.highestRiftDepth ?? 0} hideZero size="sm" />
              </span>
              <span style={{ marginLeft: 6 }}>
                <ZenithSanctuaryBadge clearedTiers={meta.apexTrialsCleared ?? []} hideZero size="sm" />
              </span>
              <span style={{ marginLeft: 6 }}>
                <PrimordialConstellationBadge />
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              data-testid="open-boss-rush-btn"
              onClick={() => setShowBossRush(true)}
              style={{
                background: '#b91c1c',
                border: 'none',
                borderRadius: 6,
                padding: '4px 10px',
                color: '#fff',
                fontSize: 12,
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              👑 보스 연전
            </button>
            <button
              data-testid="open-chaos-rift-btn"
              onClick={() => setShowChaosRift(true)}
              style={{
                background: '#7c3aed',
                border: 'none',
                borderRadius: 6,
                padding: '4px 10px',
                color: '#fff',
                fontSize: 12,
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              🌀 혼돈의 균열
            </button>
            <button
              data-testid="open-apex-trial-btn"
              onClick={() => setShowApexTrial(true)}
              style={{
                background: '#4f46e5',
                border: 'none',
                borderRadius: 6,
                padding: '4px 10px',
                color: '#fff',
                fontSize: 12,
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              🌌 초월 시련
            </button>
            <button
              data-testid="open-corridor-modal-btn"
              onClick={() => setShowCorridor(true)}
              style={{
                background: '#6366f1',
                border: 'none',
                borderRadius: 6,
                padding: '4px 10px',
                color: '#fff',
                fontSize: 12,
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              🪐 심연 회랑
            </button>
            <button
              data-testid="open-primordial-modal-btn"
              onClick={() => setShowPrimordial(true)}
              style={{
                background: '#9333ea',
                border: 'none',
                borderRadius: 6,
                padding: '4px 10px',
                color: '#fff',
                fontSize: 12,
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              🌱 태초 승천
            </button>
            <button
              data-testid="close-btn"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: 18,
                cursor: 'pointer',
                padding: '0 4px',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Floor Selection Strip */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            padding: '10px 14px',
            overflowX: 'auto',
            background: '#0f111a',
            borderBottom: '1px solid #1e293b',
          }}
        >
          {TRIAL_FLOORS.map(f => {
            const floorUnlocked = f.floor <= clearedFloor + 1;
            const floorCleared = f.floor <= clearedFloor;
            const isSelected = f.floor === selectedFloor;

            return (
              <button
                key={f.floor}
                data-testid={`floor-btn-${f.floor}`}
                disabled={!floorUnlocked}
                onClick={() => { setSelectedFloor(f.floor); setCombatResult(null); }}
                style={{
                  flexShrink: 0,
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: `1px solid ${isSelected ? '#3b82f6' : '#334155'}`,
                  background: isSelected ? '#1e293b' : floorUnlocked ? '#161926' : '#0a0c12',
                  color: floorCleared ? '#34d399' : floorUnlocked ? '#f1f5f9' : '#475569',
                  cursor: floorUnlocked ? 'pointer' : 'not-allowed',
                  fontSize: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{f.floor}층</div>
                <div style={{ fontSize: 10 }}>
                  {floorCleared ? '✅' : floorUnlocked ? '⚔️' : '🔒'}
                </div>
              </button>
            );
          })}
        </div>

        {/* Main Floor Info & Combat Panel */}
        <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
          <div
            style={{
              background: '#1a1d2e',
              borderRadius: 8,
              padding: 16,
              border: '1px solid #2e354f',
              marginBottom: 16,
            }}
          >
            {/* Boss Title & Element */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 13, color: '#94a3b8', marginRight: 6 }}>{floorDef.floor}층 수호자</span>
                <strong style={{ fontSize: 18, color: '#f8fafc' }}>{floorDef.name}</strong>
              </div>
              <ElementalBadge element={floorDef.element} size="lg" />
            </div>

            {/* Boss Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14, fontSize: 13 }}>
              <div style={{ background: '#121422', padding: 8, borderRadius: 6 }}>
                <span style={{ color: '#94a3b8' }}>보스 HP:</span>{' '}
                <strong style={{ color: '#f87171' }}>{floorDef.baseHp.toLocaleString()}</strong>
              </div>
              <div style={{ background: '#121422', padding: 8, borderRadius: 6 }}>
                <span style={{ color: '#94a3b8' }}>보스 ATK:</span>{' '}
                <strong style={{ color: '#fbbf24' }}>{floorDef.baseAtk.toLocaleString()}</strong>
              </div>
            </div>

            {/* Matchup & Affinity */}
            <div
              style={{
                background: '#121422',
                borderRadius: 6,
                padding: 10,
                marginBottom: 14,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#94a3b8' }}>영웅 공격 속성:</span>
                <ElementalBadge element={heroWeaponElement} size="sm" />
              </div>
              <AffinityMatchBanner
                attackerElement={heroWeaponElement}
                defenderElement={floorDef.element}
              />
            </div>

            {/* Rewards */}
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>첫 클리어 보상:</div>
            <div style={{ display: 'flex', gap: 12, fontSize: 13, marginBottom: 16 }}>
              <span style={{ color: '#60a5fa' }}>💎 강화석 {floorDef.rewards.enhanceStones}개</span>
              <span style={{ color: '#fbbf24' }}>💰 {floorDef.rewards.gold.toLocaleString()} G</span>
              <span style={{ color: '#a78bfa' }}>⭐ JP +{floorDef.rewards.jpBonus}</span>
            </div>

            {/* Challenge Button */}
            <button
              data-testid="challenge-btn"
              disabled={!hero || !isUnlocked}
              onClick={handleChallenge}
              style={{
                width: '100%',
                padding: '12px 0',
                borderRadius: 8,
                border: 'none',
                background: isUnlocked ? '#2563eb' : '#334155',
                color: isUnlocked ? '#fff' : '#64748b',
                fontWeight: 'bold',
                fontSize: 15,
                cursor: isUnlocked ? 'pointer' : 'not-allowed',
              }}
            >
              {!hero ? '영웅 부재' : !isUnlocked ? '이전 층 클리어 필요' : isCleared ? '재도전하기' : '시련 도전'}
            </button>
          </div>

          {/* Combat Outcome Box */}
          {combatResult && (
            <div
              data-testid="trial-combat-result"
              style={{
                background: combatResult.won ? '#064e3b' : '#7f1d1d',
                borderRadius: 8,
                padding: 14,
                border: `1px solid ${combatResult.won ? '#059669' : '#b91c1c'}`,
                color: '#fff',
                fontSize: 13,
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: 15, marginBottom: 6 }}>
                {combatResult.won
                  ? `🎉 ${floorDef.name} 토벌 성공! (${combatResult.turns}턴 만에 격파)`
                  : `💀 패배... (${floorDef.name} 남은 체력: ${combatResult.enemyRemainingHp.toLocaleString()})`}
              </div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>
                가한 총 피해: {combatResult.damageDealtTotal.toLocaleString()} | 입은 피해: {combatResult.damageTakenTotal.toLocaleString()}
                {combatResult.elementalMultiplier !== 1.0 && (
                  <span style={{ marginLeft: 6 }}>
                    (속성 배율 {combatResult.elementalMultiplier}x 적용)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {showBossRush && <AscendantRushModal onClose={() => setShowBossRush(false)} />}
      {showChaosRift && <ChaosRiftModal onClose={() => setShowChaosRift(false)} />}
      {showApexTrial && <ApexTrialModal onClose={() => setShowApexTrial(false)} />}
      {showCorridor && <AbyssalCorridorModal onClose={() => setShowCorridor(false)} />}
      {showPrimordial && <PrimordialAscensionModal onClose={() => setShowPrimordial(false)} />}
    </div>
  );
}
