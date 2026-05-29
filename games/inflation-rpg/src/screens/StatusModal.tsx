import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useCycleStoreV2 } from '../overworld/cycleSliceV2';
import { BUFF_CATALOG } from '../buff/catalog';
import { findRealm } from '../data/realms';
import { getEquipmentBase } from '../data/equipment';
import { findSkillById } from '../data/heroSkills';
import { getBackstory } from '../data/characterBackstories';
import { EQUIPMENT_FLAVOR } from '../data/equipmentFlavor';

interface Props {
  onClose: () => void;
}

export function StatusModal({ onClose }: Props) {
  const meta = useGameStore(s => s.meta);
  const run = useGameStore(s => s.run);
  const controller = useCycleStoreV2(s => s.controller);
  const hero = controller?.getHero();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!hero) return null;

  const realm = findRealm(run.currentRealmId);

  // Flatten all inventory items across slots
  const allItems = [
    ...meta.inventory.weapons,
    ...meta.inventory.armors,
    ...meta.inventory.accessories,
  ];
  const equippedItems = allItems.filter(item =>
    meta.equippedItemIds.includes(item.instanceId),
  );

  // Hero's learned skills (from HeroEntity.learnedSkillIds Set)
  const learnedSkills = [...hero.learnedSkillIds]
    .map(id => findSkillById(id))
    .filter((s): s is NonNullable<typeof s> => s != null);

  // Active buffs (non-zero levels, exclude oneshot)
  const activeBuffs = BUFF_CATALOG.filter(b => b.id !== 'oneshot_rejuv').filter(
    b => (meta.buffLevels[b.id] ?? 0) > 0,
  );

  return (
    <div
      data-testid="status-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        data-testid="status-modal"
        style={{
          width: 'min(480px, 96vw)',
          maxHeight: '88vh',
          background: '#1a1d28',
          color: '#eee',
          borderRadius: 12,
          border: '1px solid #444',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <strong>
            {hero.emoji} {hero.name}
          </strong>
          {run.characterId && getBackstory(run.characterId) && (
            <span data-testid="hero-backstory" style={{ fontSize: 11, fontStyle: 'italic', color: '#94a3b8', marginLeft: 8, opacity: 0.8 }}>
              {getBackstory(run.characterId)}
            </span>
          )}
          <button
            type="button"
            data-testid="status-modal-close"
            onClick={onClose}
            style={{
              minHeight: 44,
              padding: '6px 12px',
              background: '#3b4252',
              color: '#eee',
              border: '1px solid #555',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div
          style={{
            overflowY: 'auto',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {/* 기본 정보 */}
          <section>
            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>
              기본 정보
            </div>
            <div style={{ fontSize: 13 }}>
              나이: {Math.floor(hero.age)}세 · {hero.chapter}
            </div>
            <div style={{ fontSize: 13 }}>
              직업: {hero.job || '평민'}
            </div>
            <div style={{ fontSize: 13 }}>레벨: {hero.level}</div>
            <div style={{ fontSize: 13 }}>
              현재 위치: {realm.nameKR}
            </div>
            <div style={{ fontSize: 13 }}>
              회춘 횟수: {hero.rejuvenationCount}
            </div>
          </section>

          {/* 스탯 */}
          <section>
            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>
              스탯
            </div>
            <div style={{ fontSize: 13 }}>
              HP: {hero.hp} / {hero.hpMax}
            </div>
            <div style={{ fontSize: 13 }}>ATK: {hero.atk}</div>
          </section>

          {/* 장비 */}
          <section>
            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>
              장착 장비 ({equippedItems.length}/{meta.equipSlotCount})
            </div>
            {equippedItems.length === 0 ? (
              <div style={{ fontSize: 13, opacity: 0.5 }}>(장착 없음)</div>
            ) : (
              equippedItems.map(item => {
                const base = getEquipmentBase(item.baseId);
                const name = base?.name ?? item.baseId;
                const enhanceSuffix =
                  item.enhanceLv > 0 ? ` +${item.enhanceLv}` : '';
                const flavor = EQUIPMENT_FLAVOR[item.baseId];
                return (
                  <div key={item.instanceId} style={{ marginBottom: 4 }}>
                    <div style={{ fontSize: 13 }}>
                      {name}
                      {enhanceSuffix}
                      {base ? ` (${base.slot})` : ''}
                    </div>
                    {flavor && (
                      <div style={{ fontSize: 10, fontStyle: 'italic', color: '#6b7280', marginLeft: 8 }}>
                        {flavor}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </section>

          {/* 학습 스킬 */}
          <section>
            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>
              학습 스킬 ({learnedSkills.length})
            </div>
            {learnedSkills.length === 0 ? (
              <div style={{ fontSize: 13, opacity: 0.5 }}>(없음)</div>
            ) : (
              learnedSkills.map(skill => (
                <div key={skill.id} style={{ fontSize: 13 }}>
                  {skill.nameKR}
                </div>
              ))
            )}
          </section>

          {/* 신의 가호 */}
          <section>
            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>
              신의 가호
            </div>
            {activeBuffs.length === 0 ? (
              <div style={{ fontSize: 13, opacity: 0.5 }}>(없음)</div>
            ) : (
              activeBuffs.map(b => (
                <div key={b.id} style={{ fontSize: 13 }}>
                  {b.nameKR}: Lv {meta.buffLevels[b.id] ?? 0}
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
