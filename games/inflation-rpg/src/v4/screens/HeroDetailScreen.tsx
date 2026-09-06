import type { V4HeroSnapshot } from '../types';

interface Props {
  hero: V4HeroSnapshot;
  gold: number;
  expeditionActive: boolean;
  onBack: () => void;
  onImportLegacy: () => void;
  onRejuvenate: () => void;
}

export function HeroDetailScreen({ hero, gold, expeditionActive, onBack, onImportLegacy, onRejuvenate }: Props) {
  const years = Math.min(5, Math.max(0, hero.age - 5));
  const cost = years * 10;

  return (
    <main className="v4-container">
      <section className="v4-panel">
        <div className="v4-button-row"><button type="button" className="v4-btn v4-btn--quiet" onClick={onBack}>← 마을로</button></div>
        <div className="v4-hero-card" style={{ marginTop: 12 }}>
          <div className="v4-hero-emoji" aria-hidden="true">{hero.emoji}</div>
          <div><h2 className="v4-hero-name">{hero.name}</h2><p className="v4-hero-meta">영원한 영웅 · {hero.age}세</p></div>
          <div className="v4-action">Lv.{hero.level}</div>
        </div>
      </section>
      <section className="v4-panel">
        <h2>기록 가져오기</h2>
        <p>V3 영웅 저장은 자동으로 섞이지 않습니다. 버튼을 눌렀을 때만 현재 V3 영웅 기록을 v4 형식으로 복사합니다.</p>
        <button type="button" className="v4-btn v4-btn--quiet" onClick={onImportLegacy}>V3 영웅 가져오기</button>
      </section>
      <section className="v4-panel">
        <h2>능력치</h2>
        <div className="v4-detail-grid">
          <div className="v4-detail-stat"><small>HP</small><strong>{hero.hp.toLocaleString('ko-KR')}</strong><span className="v4-muted">/ {hero.hpMax.toLocaleString('ko-KR')}</span></div>
          <div className="v4-detail-stat"><small>공격력</small><strong>{hero.atk.toLocaleString('ko-KR')}</strong></div>
          <div className="v4-detail-stat"><small>방어력</small><strong>{hero.def.toLocaleString('ko-KR')}</strong></div>
          <div className="v4-detail-stat"><small>치명타 확률</small><strong>{Math.round(hero.critRateBase * 100)}%</strong></div>
        </div>
      </section>
      <section className="v4-panel">
        <h2>장비</h2>
        {hero.equipmentIds.length > 0 ? hero.equipmentIds.map((equipmentId) => <div className="v4-agent" key={equipmentId}><span>⚔️ {equipmentId === 'v4_iron_sword' ? '마을의 철검' : equipmentId}</span><span className="v4-agent-role">장착됨</span></div>) : <p>아직 장비가 없습니다. 대장간에서 첫 철검을 제작하세요.</p>}
      </section>
      <section className="v4-panel">
        <h2>영원성</h2>
        <p>행동 기록 {hero.actionCount}회 · 회춘 {hero.rejuvenationCount}회</p>
        <p>5년을 되돌리며, 현재 나이에 따라 금화 {cost}가 필요합니다. 오프라인 정산에서는 자동 확정되지 않습니다.</p>
        <button type="button" className="v4-btn v4-btn--primary" disabled={years <= 0 || gold < cost || expeditionActive} onClick={onRejuvenate}>
          {years <= 0 ? '최연소 상태' : expeditionActive ? '원정 귀환 후 가능' : gold < cost ? `금화 부족 (${cost} 필요)` : `5년 회춘 · ${cost} 금화`}
        </button>
      </section>
    </main>
  );
}
