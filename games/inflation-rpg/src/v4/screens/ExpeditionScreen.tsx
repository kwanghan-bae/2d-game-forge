import { FACILITY_DEFINITIONS, getV4CurrencyName, getV4FacilityName, getV4PolicyName, getV4RealmDefinition, getV4RealmName, getV4RealmRouteDurationSeconds, REALM_DEFINITIONS } from '../data';
import { getExpeditionSuccessChance, getNextRealmId, getV4HeroPower } from '../domain';
import { getV4EquipmentName } from '../equipment';
import type { InterventionType, RealmId, SupportAgentId, V4CurrencyKey, V4SaveEnvelope } from '../types';
import { useV4ScreenHeadingFocus } from '../useV4ScreenHeadingFocus';

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

function safePositiveResource(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  const amount = Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(value)));
  return amount > 0 ? amount : null;
}

function formatResources(resources: Partial<Record<V4CurrencyKey, number>>): string {
  return Object.entries(resources).flatMap(([key, value]) => {
    const amount = safePositiveResource(value);
    return amount === null ? [] : `${getV4CurrencyName(key)} +${amount.toLocaleString('ko-KR')}`;
  })
    .join(' · ') || '없음';
}

function formatCosts(cost: Partial<Record<V4CurrencyKey, number>>): string {
  return Object.entries(cost).flatMap(([key, value]) => {
    const amount = safePositiveResource(value);
    return amount === null ? [] : `${getV4CurrencyName(key)} ${amount.toLocaleString('ko-KR')}`;
  })
    .join(' · ') || '없음';
}

function getMissingRealmCost(save: V4SaveEnvelope, cost: Partial<Record<V4CurrencyKey, number>>): string | null {
  const missing = Object.entries(cost).flatMap(([key, value]) => {
    const required = safePositiveResource(value);
    if (required === null) return [];
    const available = safePositiveResource(save.meta.currencies[key as V4CurrencyKey]) ?? 0;
    return available < required
      ? `${getV4CurrencyName(key)} ${required.toLocaleString('ko-KR')} 필요 (현재 ${available.toLocaleString('ko-KR')})`
      : [];
  });
  return missing.length > 0 ? `출발 비용 부족 · ${missing.join(' · ')}` : null;
}

function formatFiniteNumber(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '0';
  return Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(value))).toLocaleString('ko-KR');
}

function formatFiniteDuration(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.ceil(value))).toLocaleString('ko-KR')
    : '0';
}

function safeEncounterCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value >= 0
    ? Math.min(3, value)
    : null;
}

function getResultWeakness(value: unknown): string {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : '원정 결과의 준비 정보를 확인하세요.';
}

function getExpeditionProgressPercent(now: number, startedAt: number, completesAt: number): number {
  const duration = completesAt - startedAt;
  if (!Number.isFinite(now) || !Number.isFinite(startedAt) || !Number.isFinite(completesAt) || duration <= 0) return 0;
  return Math.min(100, Math.max(0, ((now - startedAt) / duration) * 100));
}

function getExpeditionRemainingSeconds(now: number, completesAt: number): number {
  if (!Number.isFinite(now) || !Number.isFinite(completesAt)) return 0;
  return Math.max(0, Math.ceil((completesAt - now) / 1000));
}

export function ExpeditionScreen({ save, now, onStart, onConfirm, onConfirmUnlock, onRefresh, onIntervention, onBack }: Props) {
  const titleRef = useV4ScreenHeadingFocus();

  const expedition = save.run.expedition;
  const result = save.run.lastExpeditionResult;
  const guide = save.meta.agents.find((agent) => agent.id === 'guide');
  const activeRealm = expedition ? getV4RealmDefinition(expedition.realmId) ?? null : null;
  const activeEncounter = activeRealm
    ? activeRealm.encounters[Math.min(activeRealm.encounters.length - 1, Math.max(0, expedition?.encounterIndex ?? activeRealm.encounters.length - 1))]
    : null;
  const waitingForBoss = activeEncounter?.tier === 'boss';
  const nextRealmId = result?.outcome === 'victory' ? getNextRealmId(result.realmId) : null;
  const nextRealmPending = Boolean(nextRealmId && !save.meta.unlockedRealms.includes(nextRealmId));
  const resultRewardText = result ? formatResources(result.reward) : '없음';
  const resultSuccessChance = result && typeof result.successChance === 'number'
    && Number.isFinite(result.successChance) && result.successChance >= 0 && result.successChance <= 1
    ? result.successChance
    : null;
  const resultEncountersCleared = result ? safeEncounterCount(result.encountersCleared) : null;
  const resultEncounterTotal = result ? safeEncounterCount(result.totalEncounterCount) ?? resultEncountersCleared : null;

  return (
    <main className="v4-container">
      <section className="v4-panel">
        <div className="v4-button-row"><button type="button" className="v4-btn v4-btn--quiet" onClick={onBack}>← 마을로</button></div>
        <h2 ref={titleRef} tabIndex={-1} style={{ marginTop: 12 }}>원정소</h2>
        <p>정책: <span className="v4-action">{getV4PolicyName(expedition?.policy ?? save.run.policy)}</span> · 길잡이: {guide?.nameKR ?? '없음'}</p>
      </section>

      {!expedition && result && (
        <section className="v4-panel" data-testid="v4-expedition-result">
          <div className="v4-panel-head">
            <h2>{result.outcome === 'victory' ? '원정 성공' : '원정 중단'}</h2>
            <span className="v4-action">{getV4RealmName(result.realmId)}</span>
          </div>
          <p>{result.outcome === 'victory'
            ? resultRewardText === '없음'
              ? '영웅이 무사히 돌아와 사가에 원정 기록을 남겼습니다.'
              : '영웅이 무사히 돌아와 마을에 보상을 남겼습니다.'
            : '이번 원정은 영웅의 안전을 위해 중단되었습니다.'}</p>
          <div className="v4-detail-grid">
            <div className="v4-detail-stat"><small>전투력</small><strong>{formatFiniteNumber(result.heroPower)}</strong><span className="v4-muted">/ 권장 {formatFiniteNumber(result.recommendedPower)}</span></div>
            <div className="v4-detail-stat"><small>전투</small><strong>{formatFiniteNumber(result.turns)}턴</strong><span className="v4-muted">받은 피해 {formatFiniteNumber(result.totalDamageTaken)}</span></div>
          </div>
          {resultSuccessChance !== null && <p className="v4-muted">판정 당시 예상 승률 {Math.round(resultSuccessChance * 100)}%</p>}
          {resultEncountersCleared !== null && resultEncounterTotal !== null && <p className="v4-muted">원정 단계 {resultEncountersCleared}/{resultEncounterTotal} 정산</p>}
          {result.outcome === 'victory' ? (
            <>
              <div className="v4-alert">획득 보상 · {resultRewardText}{resultRewardText === '없음' ? ' · 사가에 원정 기록을 남겼습니다.' : ''}</div>
              {nextRealmPending && nextRealmId && <div className="v4-button-row"><p className="v4-muted">오프라인 승리는 다음 Realm 해금을 자동 확정하지 않습니다.</p><button type="button" className="v4-btn v4-btn--primary" onClick={onConfirmUnlock}>{getV4RealmName(nextRealmId)} 기록하기</button></div>}
            </>
          ) : (
            <>
              <div className="v4-alert">부족한 점 · {getResultWeakness(result.weaknessKR)}</div>
              <div className="v4-alert">영구 자산은 보존되었습니다. 출발 준비 비용도 반환되어 다음 선택을 준비할 수 있습니다.</div>
              <p>추천 시설 · {getV4FacilityName(result.recommendedFacilityId)} · 예상 재도전 {formatFiniteDuration(result.retryAfterSeconds)}초</p>
              {result.recommendedEquipmentId && <p>추천 장비 · {getV4EquipmentName(result.recommendedEquipmentId)}</p>}
            </>
          )}
        </section>
      )}

      {expedition ? (
        <section className="v4-panel" data-testid="v4-active-expedition">
          <h2>{expedition.status === 'awaiting_confirmation' ? '원정 결과 확인 필요' : '원정 진행 중'}</h2>
          <p>{activeRealm?.icon} {getV4RealmName(expedition.realmId)} · {activeEncounter?.nameKR ?? activeRealm?.boss ?? '기록 확인 필요'}</p>
          {activeEncounter && <div className="v4-stat-line"><span className="v4-chip">현재 단계 {activeEncounter.tier === 'normal' ? '일반' : activeEncounter.tier === 'elite' ? '정예' : '보스'}</span><span className="v4-chip">{(expedition.encounterIndex ?? activeRealm!.encounters.length - 1) + 1}/{activeRealm!.encounters.length}</span><span className="v4-chip">권장 {activeEncounter.recommendedPower}</span></div>}
          {activeEncounter && <p className="v4-muted">현재 전투력 {getV4HeroPower(save).toLocaleString('ko-KR')} · 예상 승률 {Math.round(getExpeditionSuccessChance(save, expedition.realmId, expedition.encounterIndex ?? activeRealm!.encounters.length - 1, expedition.assignedAgentId) * 100)}%</p>}
          {expedition.status === 'awaiting_confirmation' && <div className="v4-alert">오프라인 동안 위험 구간에 도착했습니다. {waitingForBoss ? '보스 결과와 보상을' : '원정 결과와 보상을'} 확인한 뒤 귀환을 확정하세요.</div>}
          <div className="v4-progress"><span style={{ width: `${getExpeditionProgressPercent(now, expedition.startedAt, expedition.completesAt)}%` }} /></div>
          <p>{expedition.status === 'awaiting_confirmation' ? '귀환 판정 대기 중' : `귀환까지 ${getExpeditionRemainingSeconds(now, expedition.completesAt)}초`}</p>
          <div className="v4-button-row">
            {expedition.status === 'awaiting_confirmation'
              ? <button type="button" className="v4-btn v4-btn--primary" onClick={onConfirm}>{waitingForBoss ? '보스 결과 확인' : '원정 결과 확인'}</button>
              : <button type="button" className="v4-btn v4-btn--primary" onClick={onRefresh}>시간 진행 확인</button>}
            <button type="button" className="v4-btn v4-btn--quiet" disabled={save.run.interventionCharges <= 0} onClick={() => onIntervention('retreat')}>신의 개입: 후퇴 ({save.run.interventionCharges})</button>
          </div>
        </section>
      ) : (
        <section className="v4-panel">
          <h2>Realm 선택</h2>
          {nextRealmPending && <div className="v4-alert">다음 Realm 기록을 먼저 확정한 뒤 새 원정을 출발할 수 있습니다.</div>}
          {(Object.keys(REALM_DEFINITIONS) as RealmId[]).map((realmId) => {
            const realm = REALM_DEFINITIONS[realmId];
            const unlocked = save.meta.unlockedRealms.includes(realmId);
            const missingRealmCost = unlocked ? getMissingRealmCost(save, realm.cost) : null;
            const guideReady = Boolean(guide && !guide.activeTaskId && (guide.fatigue ?? 0) < 100);
            const guideButtonLabel = nextRealmPending
              ? '기록 먼저 확정'
              : !unlocked
              ? '미해금'
              : missingRealmCost
                ? '재화 부족'
              : guideReady
                ? '길잡이와 출발'
                : (guide?.fatigue ?? 0) >= 100
                  ? '길잡이 휴식 필요'
                  : '길잡이 사용 중';
            return (
              <article key={realmId} className={`v4-realm-card ${unlocked ? '' : 'v4-realm-card--locked'}`}>
                <div className="v4-realm-head"><h3 className="v4-realm-title">{realm.icon} {realm.nameKR}</h3><span className="v4-realm-risk">위험도 {Math.round(realm.risk * 100)}%</span></div>
                <p>{realm.description}</p>
                <div className="v4-stat-line"><span className="v4-chip">권장 전투력 {realm.recommendedPower}</span><span className="v4-chip">기본 경로 {getV4RealmRouteDurationSeconds(realm)}초</span><span className="v4-chip">준비 비용 · {formatCosts(realm.cost)}</span></div>
                {missingRealmCost && <div className="v4-task v4-task--blocked">{missingRealmCost}</div>}
                <p className="v4-muted">보스 예상 승률 {Math.round(getExpeditionSuccessChance(save, realmId, 2, guideReady ? 'guide' : null) * 100)}% · 현재 전투력 {getV4HeroPower(save).toLocaleString('ko-KR')}</p>
                <p className="v4-muted">예상 보상 · {formatResources(realm.reward)}</p>
                <div className="v4-encounter-row" aria-label={`${realm.nameKR} 원정 단계`}>
                  {realm.encounters.map((encounter) => <span className="v4-encounter" key={encounter.id}><strong>{ENCOUNTER_LABELS[encounter.tier]}</strong><br />{encounter.durationSeconds}초 · {encounter.recommendedPower}</span>)}
                </div>
                <div className="v4-button-row" style={{ marginTop: 7 }}>
                  <button
                    type="button"
                    className="v4-btn v4-btn--primary"
                    disabled={!unlocked || !guideReady || nextRealmPending || Boolean(missingRealmCost)}
                    onClick={() => onStart(realmId, 'guide')}
                  >
                    {guideButtonLabel}
                  </button>
                  <button type="button" className="v4-btn v4-btn--quiet" disabled={!unlocked || nextRealmPending || Boolean(missingRealmCost)} onClick={() => onStart(realmId, null)}>{nextRealmPending ? '기록 먼저 확정' : missingRealmCost ? '재화 부족' : '혼자 출발'}</button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
