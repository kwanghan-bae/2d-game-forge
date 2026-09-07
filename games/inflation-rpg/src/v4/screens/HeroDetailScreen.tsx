import { getV4EquipmentDefinition, getV4EquipmentName } from '../equipment';
import type { V4HeroSnapshot } from '../types';
import { useV4ScreenHeadingFocus } from '../useV4ScreenHeadingFocus';

interface Props {
  hero: V4HeroSnapshot;
  gold: number;
  expeditionActive: boolean;
  onBack: () => void;
  onImportLegacy: () => void;
  onRejuvenate: () => void;
}

function finiteHeroNumber(value: unknown, fallback = 0): string {
  const safeFallback = typeof fallback === 'number' && Number.isFinite(fallback)
    ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(fallback)))
    : 0;
  const safeValue = typeof value === 'number' && Number.isFinite(value)
    ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(value)))
    : safeFallback;
  return safeValue.toLocaleString('ko-KR');
}

function finiteHeroValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function equipmentLevel(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(20, Math.max(1, Math.floor(value)))
    : 1;
}

export function HeroDetailScreen({ hero, gold, expeditionActive, onBack, onImportLegacy, onRejuvenate }: Props) {
  const titleRef = useV4ScreenHeadingFocus();
  const age = Math.max(5, Math.floor(finiteHeroValue(hero.age, 17)));
  const level = Math.max(1, Math.floor(finiteHeroValue(hero.level, 1)));
  const years = Math.min(5, Math.max(0, age - 5));
  const cost = years * 10;

  return (
    <main className="v4-container">
      <section className="v4-panel">
        <div className="v4-button-row"><button type="button" className="v4-btn v4-btn--quiet" onClick={onBack}>← 마을로</button></div>
        <div className="v4-hero-card" style={{ marginTop: 12 }}>
          <div className="v4-hero-emoji" aria-hidden="true">{hero.emoji}</div>
          <div><h2 ref={titleRef} tabIndex={-1} className="v4-hero-name">{hero.name}</h2><p className="v4-hero-meta">영원한 영웅 · {age}세</p></div>
          <div className="v4-action">Lv.{finiteHeroNumber(level)}</div>
        </div>
      </section>
      <section className="v4-panel">
        <h2>기록 가져오기</h2>
        <p>{expeditionActive
          ? '원정 중에는 영웅 기록을 바꿀 수 없습니다. 귀환한 뒤 V3 기록을 가져오세요.'
          : 'V3 영웅 저장은 자동으로 섞이지 않습니다. 버튼을 눌렀을 때만 현재 V3 영웅 기록을 v4 형식으로 복사합니다.'}</p>
        <button type="button" className="v4-btn v4-btn--quiet" disabled={expeditionActive} onClick={onImportLegacy}>
          {expeditionActive ? '원정 귀환 후 V3 영웅 가져오기' : 'V3 영웅 가져오기'}
        </button>
      </section>
      <section className="v4-panel">
        <h2>능력치</h2>
        <div className="v4-detail-grid">
          <div className="v4-detail-stat"><small>HP</small><strong>{finiteHeroNumber(hero.hp)}</strong><span className="v4-muted">/ {finiteHeroNumber(hero.hpMax)}</span></div>
          <div className="v4-detail-stat"><small>공격력</small><strong>{finiteHeroNumber(hero.atk)}</strong></div>
          <div className="v4-detail-stat"><small>방어력</small><strong>{finiteHeroNumber(hero.def)}</strong></div>
          <div className="v4-detail-stat"><small>치명타 확률</small><strong>{Math.round(Math.min(1, Math.max(0, finiteHeroValue(hero.critRateBase, 0.05))) * 100)}%</strong></div>
        </div>
      </section>
      <section className="v4-panel">
        <h2>장비</h2>
        {hero.equipmentIds.length > 0 ? hero.equipmentIds.map((equipmentId) => {
          const definition = getV4EquipmentDefinition(equipmentId);
          const level = equipmentLevel(hero.equipmentLevels?.[equipmentId]);
          const bonuses = definition
            ? [
              `공격 +${definition.atk * level}`,
              `방어 +${definition.def * level}`,
              `HP +${definition.hpMax * level}`,
              ...(definition.critRate > 0 ? [`치명타 +${Math.round(definition.critRate * level * 100)}%`] : []),
            ].filter((value) => !value.endsWith('+0'))
            : [];
          return (
            <div className="v4-agent" key={equipmentId}>
              <span>⚔️ {getV4EquipmentName(equipmentId)} · Lv.{level}<br /><span className="v4-muted">{bonuses.join(' · ') || '기록된 장비'}</span></span>
              <span className="v4-agent-role">장착됨</span>
            </div>
          );
        }) : <p>아직 장비가 없습니다. 대장간에서 첫 철검을 제작하세요.</p>}
      </section>
      <section className="v4-panel">
        <h2>영원성</h2>
        <p>행동 기록 {finiteHeroNumber(hero.actionCount)}회 · 회춘 {finiteHeroNumber(hero.rejuvenationCount)}회</p>
        <p>{years}년을 되돌리며, 현재 나이에 따라 금화 {cost}가 필요합니다. 오프라인 정산에서는 자동 확정되지 않습니다.</p>
        <button type="button" className="v4-btn v4-btn--primary" disabled={years <= 0 || gold < cost || expeditionActive} onClick={onRejuvenate}>
          {years <= 0 ? '최연소 상태' : expeditionActive ? '원정 귀환 후 가능' : gold < cost ? `금화 부족 (${cost} 필요)` : `${years}년 회춘 · ${cost} 금화`}
        </button>
      </section>
    </main>
  );
}
