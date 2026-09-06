import { FACILITY_DEFINITIONS, REALM_DEFINITIONS } from '../data';
import { getExpeditionSuccessChance, getNextRealmId, getV4HeroPower } from '../domain';
import type { InterventionType, RealmId, SupportAgentId, V4Policy, V4SaveEnvelope } from '../types';

interface Props {
  save: V4SaveEnvelope;
  now: number;
  onStart: (realmId: RealmId, agentId: SupportAgentId | null) => void;
  onConfirm: () => void;
  onConfirmUnlock: () => void;
  onRefresh: () => void;
  onIntervention: (type: InterventionType) => void;
  onBack: () => void;
}

const ENCOUNTER_LABELS = {
  normal: '일반',
  elite: '정예',
  boss: '보스',
} as const;

export function ExpeditionScreen({ save, now, onStart, onConfirm, onConfirmUnlock, onRefresh, onIntervention, onBack }: Props) {
  const expedition = save.run.expedition;
  const result = save.run.lastExpeditionResult;
  const guide = save.meta.agents.find((agent) => agent.id === 'guide');
  const activeRealm = expedition ? REALM_DEFINITIONS[expedition.realmId] : null;
  const activeEncounter = activeRealm
    ? activeRealm.encounters[Math.min(activeRealm.encounters.length - 1, Math.max(0, expedition?.encounterIndex ?? activeRealm.encounters.length - 1))]
    : null;
  const nextRealmId = result?.outcome === 'victory' ? getNextRealmId(result.realmId) : null;
  const nextRealmPending = Boolean(nextRealmId && !save.meta.unlockedRealms.includes(nextRealmId));

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
          {result.successChance !== undefined && <p className="v4-muted">판정 당시 예상 승률 {Math.round(result.successChance * 100)}%</p>}
          {result.encountersCleared !== undefined && <p className="v4-muted">원정 단계 {result.encountersCleared}/{result.totalEncounterCount ?? result.encountersCleared} 정산</p>}
          {result.outcome === 'victory' ? (
            <>
              <div className="v4-alert">획득 보상 · {Object.entries(result.reward).map(([key, value]) => `${key} +${value}`).join(' · ') || '없음'}</div>
              {nextRealmPending && nextRealmId && <div className="v4-button-row"><p className="v4-muted">오프라인 승리는 다음 Realm 해금을 자동 확정하지 않습니다.</p><button type="button" className="v4-btn v4-btn--primary" onClick={onConfirmUnlock}>{REALM_DEFINITIONS[nextRealmId].nameKR} 기록하기</button></div>}
            </>
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
          <h2>{expedition.status === 'awaiting_confirmation' ? '원정 결과 확인 필요' : '원정 진행 중'}</h2>
          <p>{activeRealm?.icon} {activeRealm?.nameKR} · {activeEncounter?.nameKR ?? activeRealm?.boss}</p>
          {activeEncounter && <div className="v4-stat-line"><span className="v4-chip">현재 단계 {activeEncounter.tier === 'normal' ? '일반' : activeEncounter.tier === 'elite' ? '정예' : '보스'}</span><span className="v4-chip">{(expedition.encounterIndex ?? activeRealm!.encounters.length - 1) + 1}/{activeRealm!.encounters.length}</span><span className="v4-chip">권장 {activeEncounter.recommendedPower}</span></div>}
          {activeEncounter && <p className="v4-muted">현재 전투력 {getV4HeroPower(save).toLocaleString('ko-KR')} · 예상 승률 {Math.round(getExpeditionSuccessChance(save, expedition.realmId, expedition.encounterIndex ?? activeRealm!.encounters.length - 1, expedition.assignedAgentId) * 100)}%</p>}
          {expedition.status === 'awaiting_confirmation' && <div className="v4-alert">오프라인 동안 위험 구간에 도착했습니다. 보스 결과와 보상을 확인한 뒤 귀환을 확정하세요.</div>}
          <div className="v4-progress"><span style={{ width: `${Math.min(100, Math.max(0, ((now - expedition.startedAt) / (expedition.completesAt - expedition.startedAt)) * 100))}%` }} /></div>
          <p>{expedition.status === 'awaiting_confirmation' ? '귀환 판정 대기 중' : `귀환까지 ${Math.max(0, Math.ceil((expedition.completesAt - now) / 1000))}초`}</p>
          <div className="v4-button-row">
            {expedition.status === 'awaiting_confirmation'
              ? <button type="button" className="v4-btn v4-btn--primary" onClick={onConfirm}>보스 결과 확인</button>
              : <button type="button" className="v4-btn v4-btn--primary" onClick={onRefresh}>시간 진행 확인</button>}
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
                <p className="v4-muted">보스 예상 승률 {Math.round(getExpeditionSuccessChance(save, realmId, 2, guide?.activeTaskId ? null : 'guide') * 100)}% · 현재 전투력 {getV4HeroPower(save).toLocaleString('ko-KR')}</p>
                <div className="v4-encounter-row" aria-label={`${realm.nameKR} 원정 단계`}>
                  {realm.encounters.map((encounter) => <span className="v4-encounter" key={encounter.id}><strong>{ENCOUNTER_LABELS[encounter.tier]}</strong><br />{encounter.durationSeconds}초 · {encounter.recommendedPower}</span>)}
                </div>
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
