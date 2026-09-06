/**
 * OmniverseArmoryModal.tsx — C1160: Divine Armory Modal & Interactive Forging UI.
 *
 * Provides the interactive UI for forging the 4 apex Divine Regalia with Pantheon Crests:
 * - Real-time Pantheon Crest balance & forged regalia inventory.
 * - Active regalia perks dashboard (Penetration, HP/Barrier, Crit, Immunity).
 * - Interactive forging buttons with confirmation feedback.
 */

import { useGameStore } from '../store/gameStore';
import {
  ALL_OMNIVERSE_REGALIA_IDS,
  getOmniverseRegalia,
  canForgeOmniverseRegalia,
  forgeOmniverseRegalia,
  evaluateForgedRegaliaPerks,
  type OmniverseRegaliaId,
} from '../systems/omniverseRegalia';
import {
  getBlacksmithDialogue,
  getRegaliaLore,
} from '../data/omniverseRegaliaLore';

interface Props {
  onClose: () => void;
}

export function OmniverseArmoryModal({ onClose }: Props) {
  const meta = useGameStore(s => s.meta);

  const crests = (meta as unknown as { pantheonCrests?: number }).pantheonCrests ?? 0;
  const forged = meta.forgedRegalia ?? [];
  const perks = evaluateForgedRegaliaPerks(meta);
  const blacksmith = getBlacksmithDialogue(forged.length);

  const handleForge = (id: OmniverseRegaliaId) => {
    const check = canForgeOmniverseRegalia(meta, id);
    if (!check.canForge) return;

    const { newMeta } = forgeOmniverseRegalia(meta, id);
    useGameStore.setState({ meta: newMeta });
  };

  const getSlotBadge = (slot: string) => {
    switch (slot) {
      case 'weapon':
        return { text: '무기', color: '#f87171' };
      case 'armor':
        return { text: '방어구', color: '#60a5fa' };
      default:
        return { text: '장신구', color: '#c084fc' };
    }
  };

  return (
    <div
      data-testid="omniverse-armory-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: 16,
      }}
    >
      <div
        data-testid="omniverse-armory-modal"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 700,
          maxHeight: '90vh',
          background: 'linear-gradient(180deg, #09090b 0%, #1c0528 100%)',
          border: '1px solid #f59e0b',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(245, 158, 11, 0.25)',
          overflow: 'hidden',
          color: '#e4e4e7',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #451a03',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, #78350f 0%, #451a03 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>✨</span>
            <div>
              <strong style={{ fontSize: 17, color: '#fef3c7' }}>
                신격 보구 무기고 (Omniverse Armory)
              </strong>
              <div style={{ fontSize: 11, color: '#fde68a' }}>
                만신전 문장을 제물로 바쳐 4대 우주 거신의 신격을 품은 보구를 주조하십시오.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              data-testid="armory-crests-count"
              style={{
                fontSize: 13,
                background: '#451a03',
                border: '1px solid #f59e0b',
                padding: '4px 10px',
                borderRadius: 20,
                color: '#fef08a',
                fontWeight: 'bold',
              }}
            >
              문장: {crests}개 ({forged.length}/4 주조)
            </div>
            <button
              data-testid="close-btn"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#a1a1aa',
                fontSize: 20,
                cursor: 'pointer',
                padding: '0 4px',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Hephaestus Blacksmith Dialogue Banner */}
        <div
          data-testid="blacksmith-dialogue-banner"
          style={{
            padding: '10px 20px',
            background: '#271004',
            borderBottom: '1px solid #78350f',
            fontSize: 12,
            color: '#fed7aa',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 18 }}>🔨</span>
          <div>
            <strong style={{ color: '#fb923c' }}>{blacksmith.title}: </strong>
            <span style={{ fontStyle: 'italic' }}>"{blacksmith.quote}"</span>
          </div>
        </div>

        {/* Active Perks Dashboard */}
        <div
          data-testid="regalia-perks-banner"
          style={{
            padding: '12px 20px',
            background: '#181124',
            borderBottom: '1px solid #2e1065',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
            textAlign: 'center',
            fontSize: 11,
          }}
        >
          <div>
            <div style={{ color: '#a1a1aa' }}>🗡️ 방어 관통</div>
            <div style={{ color: '#f87171', fontWeight: 'bold', fontSize: 13 }}>
              +{(perks.defPenetration * 100).toFixed(0)}%
            </div>
          </div>
          <div>
            <div style={{ color: '#a1a1aa' }}>🫀 보너스 HP / 장벽</div>
            <div style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: 13 }}>
              +{(perks.bonusHp / 100_000_000).toFixed(0)}억 / +{(perks.flatBarrier / 10_000).toFixed(0)}만
            </div>
          </div>
          <div>
            <div style={{ color: '#a1a1aa' }}>👁️ 치명타율 / 피해</div>
            <div style={{ color: '#c084fc', fontWeight: 'bold', fontSize: 13 }}>
              +{(perks.critRateBonus * 100).toFixed(0)}% / +{(perks.critDamageBonus * 100).toFixed(0)}%
            </div>
          </div>
          <div>
            <div style={{ color: '#a1a1aa' }}>🛡️ 디버프 면역 / 저항</div>
            <div style={{ color: '#34d399', fontWeight: 'bold', fontSize: 13 }}>
              {perks.debuffImmunity ? '면역' : '미보유'} / +{(perks.allElementalResistance * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Regalia Grid */}
        <div
          style={{
            padding: '16px 20px',
            overflowY: 'auto',
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}
        >
          {ALL_OMNIVERSE_REGALIA_IDS.map(id => {
            const regalia = getOmniverseRegalia(id);
            const lore = getRegaliaLore(id);
            const isForged = forged.includes(id);
            const check = canForgeOmniverseRegalia(meta, id);
            const badge = getSlotBadge(regalia.slot);

            return (
              <div
                key={regalia.id}
                data-testid={`regalia-card-${regalia.id}`}
                style={{
                  background: isForged
                    ? 'linear-gradient(135deg, #2e1065 0%, #3b0764 100%)'
                    : '#18181b',
                  border: isForged ? '1px solid #d946ef' : '1px solid #27272a',
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 20 }}>{regalia.icon}</span>
                    <div>
                      <strong style={{ fontSize: 14, color: '#fff' }}>
                        {regalia.nameKR}
                      </strong>
                      <span style={{ fontSize: 10, color: '#fbbf24', marginLeft: 4 }}>
                        ({lore.hanja})
                      </span>
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 10,
                          padding: '1px 5px',
                          borderRadius: 3,
                          background: badge.color,
                          color: '#000',
                          fontWeight: 'bold',
                        }}
                      >
                        {badge.text}
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: isForged ? '#059669' : '#27272a',
                      color: isForged ? '#ecfdf5' : '#a1a1aa',
                      fontWeight: 'bold',
                    }}
                  >
                    {isForged ? '주조 완료' : '미보유'}
                  </span>
                </div>

                {/* Description */}
                <div style={{ fontSize: 11, color: '#a1a1aa' }}>
                  {regalia.description}
                </div>

                {/* Lore Scripture */}
                <div
                  data-testid={`regalia-scripture-${regalia.id}`}
                  style={{
                    fontSize: 10,
                    color: isForged ? '#d8b4fe' : '#71717a',
                    fontStyle: 'italic',
                    lineHeight: 1.3,
                  }}
                >
                  "{isForged ? lore.awakenedInscription : lore.forgingHymn}"
                </div>

                {/* Perk Highlight */}
                <div
                  style={{
                    padding: '4px 8px',
                    borderRadius: 4,
                    background: 'rgba(0,0,0,0.3)',
                    color: '#fde047',
                    fontSize: 11,
                    fontWeight: 'bold',
                  }}
                >
                  ⚡ 효과: {regalia.perkSummaryKR}
                </div>

                {/* Forge Button */}
                <button
                  data-testid={`forge-btn-${regalia.id}`}
                  disabled={!check.canForge}
                  onClick={() => handleForge(regalia.id)}
                  style={{
                    marginTop: 4,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: isForged
                      ? '#27272a'
                      : check.canForge
                      ? 'linear-gradient(90deg, #d97706 0%, #f59e0b 100%)'
                      : '#3f3f46',
                    color: isForged ? '#71717a' : check.canForge ? '#fff' : '#a1a1aa',
                    fontWeight: 'bold',
                    fontSize: 12,
                    cursor: check.canForge ? 'pointer' : 'not-allowed',
                  }}
                >
                  {isForged
                    ? '✨ 주조 완료'
                    : check.canForge
                    ? `보구 주조 (문장 ${regalia.cost}개)`
                    : `문장 부족 (${regalia.cost}개 필요)`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
