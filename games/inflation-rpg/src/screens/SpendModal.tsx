import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useCycleStoreV2 } from '../overworld/cycleSliceV2';
import { BUFF_CATALOG, type BuffDef, nextStepCost, singleStepCost, maxAffordable } from '../buff/catalog';
import { getRejuvDiscount } from '../buff/buffEffects';
import { rejuvenationCost } from '../hero/rejuvenation';
import type { BuffId } from '../types';

interface Props {
  onClose: () => void;
}

/**
 * Cycle 4 B2: Hick's Law mitigation — 7 buff 를 4 카테고리로 분리.
 * catalog.ts 를 건드리지 않고 SpendModal 안에 매핑을 두어 Group A 의
 * catalog.ts 수정과 merge conflict 회피.
 *
 * - movement: 이동의 가호 (1)
 * - resource: 풍요의 손길, 빛의 풍요 (2)
 * - time: 자비의 손길, 시간의 늪, 빛의 은총 (3)
 * - misc: 격차의 칼날 (1)
 *
 * 한 탭 max 3 buff. 각 카테고리 ≥ 1.
 */
export type BuffCategory = 'movement' | 'resource' | 'time' | 'misc';

export const BUFF_CATEGORY: Record<BuffId, BuffCategory> = {
  move_speed:     'movement',
  drop_chance:    'resource',
  light_rate:     'resource',
  rejuv_discount: 'time',
  aging_slow:     'time',
  oneshot_rejuv:  'time',
  field_diff:     'misc',
};

export const CATEGORY_LABEL_KR: Record<BuffCategory, string> = {
  movement: '이동',
  resource: '자원',
  time:     '시간',
  misc:     '기타',
};

const CATEGORY_ORDER: readonly BuffCategory[] = ['movement', 'resource', 'time', 'misc'] as const;

const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 100,
};
const modalStyle: React.CSSProperties = {
  width: 'min(420px, 92vw)', maxHeight: '80vh',
  background: '#1a1d28', color: '#eee',
  borderRadius: 12, border: '1px solid #444',
  display: 'flex', flexDirection: 'column',
  paddingBottom: 'env(safe-area-inset-bottom)',
};
const headerStyle: React.CSSProperties = {
  padding: '12px 16px', borderBottom: '1px solid #333',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
};
const bodyStyle: React.CSSProperties = {
  overflowY: 'auto', overscrollBehavior: 'contain',
  padding: '8px 0',
};
const cardStyle: React.CSSProperties = {
  padding: '12px 16px', borderBottom: '1px solid #2a2d38',
};
const btnRowStyle: React.CSSProperties = {
  display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap',
};
const btnStyle = (disabled: boolean): React.CSSProperties => ({
  minHeight: 44, padding: '8px 12px',
  background: disabled ? '#2a2d38' : '#3b4252',
  color: disabled ? '#666' : '#eee',
  border: '1px solid #555', borderRadius: 6,
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: 13,
  // Cycle 4 B2: disabled 가시성 강화 (PRD 권장 opacity: 0.4).
  opacity: disabled ? 0.4 : 1,
});

// Cycle 4 B2: 카테고리 탭 스타일.
const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  padding: '8px 12px',
  borderBottom: '1px solid #333',
  background: '#15171f',
};

function tabBtnStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    minHeight: 36,
    padding: '6px 10px',
    background: active ? '#3b4252' : 'transparent',
    color: active ? '#ffd54f' : '#aaa',
    border: active ? '1px solid #fbbf24' : '1px solid #444',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: active ? 700 : 400,
    whiteSpace: 'nowrap',
  };
}

export function SpendModal({ onClose }: Props) {
  const meta = useGameStore(s => s.meta);
  const buyBuff = useGameStore(s => s.buyBuff);
  const rejuvenateHero = useCycleStoreV2(s => s.rejuvenateHero);
  const controller = useCycleStoreV2(s => s.controller);
  // Cycle 4 B2: 첫 진입 시 'movement' 탭 selected.
  const [category, setCategory] = useState<BuffCategory>('movement');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const light = Math.floor(meta.light ?? 0);
  const hero = controller?.getHero();
  const heroAge = hero?.age ?? 5;
  const discount = getRejuvDiscount(meta);
  const oneshotCost = Math.ceil(rejuvenationCost(heroAge) * (1 - discount));
  const oneshotDisabled = light < oneshotCost || heroAge <= 5;

  const visibleBuffs = BUFF_CATALOG.filter(def => BUFF_CATEGORY[def.id] === category);

  return (
    <div data-testid="spend-modal-backdrop" style={modalBackdropStyle} onClick={onClose}>
      <div data-testid="spend-modal" style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <strong>신의 메뉴</strong>
          <span data-testid="spend-modal-light">빛: {light}</span>
          <button type="button" data-testid="spend-modal-close" onClick={onClose} style={btnStyle(false)}>✕</button>
        </div>
        {/* Cycle 4 B2: 카테고리 탭 (Hick's Law mitigation). 한 탭 max 3 buff. */}
        <div data-testid="spend-modal-tabs" style={tabBarStyle}>
          {CATEGORY_ORDER.map(c => (
            <button
              key={c}
              type="button"
              data-testid={`spend-tab-${c}`}
              data-active={category === c ? 'true' : undefined}
              onClick={() => setCategory(c)}
              style={tabBtnStyle(category === c)}
            >
              {CATEGORY_LABEL_KR[c]}
            </button>
          ))}
        </div>
        <div style={bodyStyle}>
          {visibleBuffs.map(def => def.isOneShot ? (
            <div key={def.id} style={cardStyle}>
              <div><strong>{def.nameKR}</strong></div>
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
                {def.descKR} · 현재 hero {heroAge}세 → {Math.max(5, heroAge - 5)}세
              </div>
              <div style={btnRowStyle}>
                <button
                  type="button"
                  data-testid={`buff-oneshot-rejuv-1`}
                  disabled={oneshotDisabled}
                  onClick={() => { if (!oneshotDisabled) rejuvenateHero(5); }}
                  style={btnStyle(oneshotDisabled)}
                >
                  1번 쓰기: {oneshotCost} 빛
                </button>
              </div>
            </div>
          ) : (
            <BuffCard
              key={def.id}
              def={def}
              currentLv={meta.buffLevels?.[def.id] ?? 0}
              light={light}
              onBuy={(count) => buyBuff(def.id, count)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface CardProps {
  def: BuffDef;
  currentLv: number;
  light: number;
  onBuy: (count: 1 | 10 | 'max') => void;
}

function BuffCard({ def, currentLv, light, onBuy }: CardProps) {
  const cost1 = singleStepCost(def, currentLv);
  const cost10 = nextStepCost(def, currentLv, 10);
  const maxN = maxAffordable(def, currentLv, light);
  const costMax = maxN > 0 ? nextStepCost(def, currentLv, maxN) : 0;
  const capReached = def.cap !== undefined &&
    ((def.perLevel > 0 && currentLv * def.perLevel >= def.cap) ||
     (def.perLevel < 0 && 1 + currentLv * def.perLevel <= def.cap));

  return (
    <div style={cardStyle} data-testid={`buff-card-${def.id}`}>
      <div>
        <strong>{def.nameKR}</strong>
        <span style={{ marginLeft: 8, color: '#aaa' }}>Lv {currentLv}</span>
        {capReached && <span style={{ marginLeft: 8, color: '#888', fontSize: 11 }}>최대</span>}
      </div>
      <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>{def.descKR}</div>
      <div style={btnRowStyle}>
        <button
          type="button"
          data-testid={`buff-${def.id}-x1`}
          disabled={light < cost1}
          onClick={() => onBuy(1)}
          style={btnStyle(light < cost1)}
        >
          ×1: {cost1}
        </button>
        <button
          type="button"
          data-testid={`buff-${def.id}-x10`}
          disabled={light < cost10}
          onClick={() => onBuy(10)}
          style={btnStyle(light < cost10)}
        >
          ×10: {cost10}
        </button>
        <button
          type="button"
          data-testid={`buff-${def.id}-xmax`}
          disabled={maxN === 0}
          onClick={() => onBuy('max')}
          style={btnStyle(maxN === 0)}
        >
          ×Max: {maxN > 0 ? `${maxN}개 ${costMax}` : '불가'}
        </button>
      </div>
    </div>
  );
}
