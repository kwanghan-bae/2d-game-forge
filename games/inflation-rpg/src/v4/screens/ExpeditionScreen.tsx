import { REALM_DEFINITIONS } from '../data';
import type { RealmId, SupportAgentId, V4Policy, V4SaveEnvelope } from '../types';

interface Props {
  save: V4SaveEnvelope;
  now: number;
  onStart: (realmId: RealmId, agentId: SupportAgentId | null) => void;
  onRefresh: () => void;
  onBack: () => void;
}

export function ExpeditionScreen({ save, now, onStart, onRefresh, onBack }: Props) {
  const expedition = save.run.expedition;
  const guide = save.meta.agents.find((agent) => agent.id === 'guide');

  return (
    <main className="v4-container">
      <section className="v4-panel">
        <div className="v4-button-row"><button type="button" className="v4-btn v4-btn--quiet" onClick={onBack}>← 마을로</button></div>
        <h2 style={{ marginTop: 12 }}>원정소</h2>
        <p>정책: <span className="v4-action">{save.run.policy === 'aggression' ? '공격 우선' : save.run.policy === 'hoarding' ? '안전 비축' : '성장 집중'}</span> · 길잡이: {guide?.nameKR ?? '없음'}</p>
      </section>

      {expedition ? (
        <section className="v4-panel" data-testid="v4-active-expedition">
          <h2>원정 진행 중</h2>
          <p>{REALM_DEFINITIONS[expedition.realmId].icon} {REALM_DEFINITIONS[expedition.realmId].nameKR} · {REALM_DEFINITIONS[expedition.realmId].boss}</p>
          <div className="v4-progress"><span style={{ width: `${Math.min(100, Math.max(0, ((now - expedition.startedAt) / (expedition.completesAt - expedition.startedAt)) * 100))}%` }} /></div>
          <p>귀환까지 {Math.max(0, Math.ceil((expedition.completesAt - now) / 1000))}초</p>
          <button type="button" className="v4-btn v4-btn--primary" onClick={onRefresh}>시간 진행 확인</button>
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
