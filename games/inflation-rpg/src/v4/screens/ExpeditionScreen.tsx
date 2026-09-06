import { FACILITY_DEFINITIONS, REALM_DEFINITIONS } from '../data';
import type { InterventionType, RealmId, SupportAgentId, V4Policy, V4SaveEnvelope } from '../types';

interface Props {
  save: V4SaveEnvelope;
  now: number;
  onStart: (realmId: RealmId, agentId: SupportAgentId | null) => void;
  onRefresh: () => void;
  onIntervention: (type: InterventionType) => void;
  onBack: () => void;
}

export function ExpeditionScreen({ save, now, onStart, onRefresh, onIntervention, onBack }: Props) {
  const expedition = save.run.expedition;
  const result = save.run.lastExpeditionResult;
  const guide = save.meta.agents.find((agent) => agent.id === 'guide');

  return (
    <main className="v4-container">
      <section className="v4-panel">
        <div className="v4-button-row"><button type="button" className="v4-btn v4-btn--quiet" onClick={onBack}>← 마을로</button></div>
        <h2 style={{ marginTop: 12 }}>원정소</h2>
        <p>정책: <span className="v4-action">{save.run.policy === 'aggression' ? '공격 우선' : save.run.policy === 'hoarding' ? '안전 비축' : '성장 집중'}</span> · 길잡이: {guide?.nameKR ?? '없음'}</p>
      </section>

      {!expedition && result && (
        <section className="v4-panel" data-testid="v4-expedition-result">
          <div className="v4-panel-head">
            <h2>{result.outcome === 'victory' ? '원정 성공' : '원정 중단'}</h2>
            <span className="v4-action">{REALM_DEFINITIONS[result.realmId].nameKR}</span>
          </div>
          <p>{result.outcome === 'victory' ? '영웅이 무사히 돌아와 마을에 보상을 남겼습니다.' : '이번 원정은 영웅의 안전을 위해 중단되었습니다.'}</p>
          <div className="v4-detail-grid">
            <div className="v4-detail-stat"><small>전투력</small><strong>{result.heroPower.toLocaleString('ko-KR')}</strong><span className="v4-muted">/ 권장 {result.recommendedPower.toLocaleString('ko-KR')}</span></div>
            <div className="v4-detail-stat"><small>전투</small><strong>{result.turns}턴</strong><span className="v4-muted">받은 피해 {result.totalDamageTaken.toLocaleString('ko-KR')}</span></div>
          </div>
          {result.outcome === 'victory' ? (
            <div className="v4-alert">획득 보상 · {Object.entries(result.reward).map(([key, value]) => `${key} +${value}`).join(' · ') || '없음'}</div>
          ) : (
            <>
              <div className="v4-alert">부족한 점 · {result.weaknessKR}</div>
              <p>추천 시설 · {FACILITY_DEFINITIONS[result.recommendedFacilityId].nameKR} · 예상 재도전 {result.retryAfterSeconds}초</p>
              {result.recommendedEquipmentId && <p>추천 장비 · {result.recommendedEquipmentId === 'v4_iron_sword' ? '마을의 철검' : result.recommendedEquipmentId}</p>}
            </>
          )}
        </section>
      )}

      {expedition ? (
        <section className="v4-panel" data-testid="v4-active-expedition">
          <h2>원정 진행 중</h2>
          <p>{REALM_DEFINITIONS[expedition.realmId].icon} {REALM_DEFINITIONS[expedition.realmId].nameKR} · {REALM_DEFINITIONS[expedition.realmId].boss}</p>
          <div className="v4-progress"><span style={{ width: `${Math.min(100, Math.max(0, ((now - expedition.startedAt) / (expedition.completesAt - expedition.startedAt)) * 100))}%` }} /></div>
          <p>귀환까지 {Math.max(0, Math.ceil((expedition.completesAt - now) / 1000))}초</p>
          <div className="v4-button-row">
            <button type="button" className="v4-btn v4-btn--primary" onClick={onRefresh}>시간 진행 확인</button>
            <button type="button" className="v4-btn v4-btn--quiet" disabled={save.run.interventionCharges <= 0} onClick={() => onIntervention('retreat')}>신의 개입: 후퇴 ({save.run.interventionCharges})</button>
          </div>
        </section>
      ) : (
        <section className="v4-panel">
          <h2>Realm 선택</h2>
          {(Object.keys(REALM_DEFINITIONS) as RealmId[]).map((realmId) => {
            const realm = REALM_DEFINITIONS[realmId];
            const unlocked = save.meta.unlockedRealms.includes(realmId);
            return (
              <article key={realmId} className={`v4-realm-card ${unlocked ? '' : 'v4-realm-card--locked'}`}>
                <div className="v4-realm-head"><h3 className="v4-realm-title">{realm.icon} {realm.nameKR}</h3><span className="v4-realm-risk">위험도 {Math.round(realm.risk * 100)}%</span></div>
                <p>{realm.description}</p>
                <div className="v4-stat-line"><span className="v4-chip">권장 전투력 {realm.recommendedPower}</span><span className="v4-chip">{realm.durationSeconds}초</span><span className="v4-chip">신력 {realm.cost.spirit ?? 0}</span></div>
                <div className="v4-button-row" style={{ marginTop: 7 }}>
                  <button type="button" className="v4-btn v4-btn--primary" disabled={!unlocked} onClick={() => onStart(realmId, guide?.activeTaskId ? null : 'guide')}>{unlocked ? '길잡이와 출발' : '미해금'}</button>
                  <button type="button" className="v4-btn v4-btn--quiet" disabled={!unlocked} onClick={() => onStart(realmId, null)}>혼자 출발</button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
