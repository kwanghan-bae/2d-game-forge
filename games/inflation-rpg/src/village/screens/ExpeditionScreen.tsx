import { FACILITY_DEFINITIONS, getVillageAgentDefinition, getVillageCurrencyName, getVillageFacilityName, getVillagePolicyName, getVillageRealmDefinition, getVillageRealmName, getVillageRealmRouteDurationSeconds, REALM_DEFINITIONS } from '../data';
import { getAvailableStoryChoice, getExpeditionForecast, getNextRealmId, getVillageHeroPower } from '../domain';
import { getVillageEquipmentName } from '../equipment';
import type { InterventionType, RealmId, SupportAgentId, VillageCurrencyKey, VillageSaveEnvelope } from '../types';
import { useVillageScreenHeadingFocus } from '../useVillageScreenHeadingFocus';

interface Props {
  save: VillageSaveEnvelope;
  now: number;
  onStart: (realmId: RealmId, agentId: SupportAgentId | null) => void;
  onConfirm: () => void;
  onConfirmUnlock: () => void;
  onRefresh: () => void;
  onIntervention: (type: InterventionType) => void;
  onOpenSaga?: () => void;
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

function getResourceEntries(resources: unknown): Array<[string, number]> {
  if (!resources || typeof resources !== 'object' || Array.isArray(resources)) return [];
  return Object.entries(resources as Record<string, unknown>).flatMap(([key, value]) => {
    const amount = safePositiveResource(value);
    return amount === null ? [] : [[key, amount] as [string, number]];
  });
}

function formatResources(resources: unknown): string {
  return getResourceEntries(resources)
    .map(([key, amount]) => `${getVillageCurrencyName(key)} +${amount.toLocaleString('ko-KR')}`)
    .join(' · ') || '없음';
}

function formatCosts(cost: unknown): string {
  return getResourceEntries(cost)
    .map(([key, amount]) => `${getVillageCurrencyName(key)} ${amount.toLocaleString('ko-KR')}`)
    .join(' · ') || '없음';
}

function getMissingRealmCost(save: VillageSaveEnvelope, cost: Partial<Record<VillageCurrencyKey, number>>): string | null {
  const missing = Object.entries(cost).flatMap(([key, value]) => {
    const required = safePositiveResource(value);
    if (required === null) return [];
    const available = safePositiveResource(save.meta.currencies[key as VillageCurrencyKey]) ?? 0;
    return available < required
      ? `${getVillageCurrencyName(key)} ${required.toLocaleString('ko-KR')} 필요 (현재 ${available.toLocaleString('ko-KR')})`
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

type GuideAvailability = 'ready' | 'fatigued' | 'busy' | 'missing' | 'invalid';

function hasCanonicalGuideMetadata(
  guide: VillageSaveEnvelope['meta']['agents'][number],
): boolean {
  const definition = getVillageAgentDefinition(guide.id);
  return Boolean(definition
    && guide.nameKR === definition.nameKR
    && guide.roleKR === definition.roleKR
    && guide.trait === definition.trait);
}

function getGuideAvailability(
  guide: VillageSaveEnvelope['meta']['agents'][number] | undefined,
): GuideAvailability {
  if (!guide) return 'missing';
  if (!hasCanonicalGuideMetadata(guide)) return 'invalid';
  if (typeof guide.fatigue !== 'number' || !Number.isFinite(guide.fatigue) || guide.fatigue < 0 || guide.fatigue > 100) {
    return 'invalid';
  }
  if (guide.activeTaskId) return 'busy';
  if (guide.fatigue >= 100) return 'fatigued';
  return 'ready';
}

export function ExpeditionScreen({ save, now, onStart, onConfirm, onConfirmUnlock, onRefresh, onIntervention, onOpenSaga, onBack }: Props) {
  const titleRef = useVillageScreenHeadingFocus();

  const expedition = save.run.expedition;
  const result = save.run.lastExpeditionResult;
  const guide = save.meta.agents.find((agent) => agent.id === 'guide');
  const guideAvailability = getGuideAvailability(guide);
  const guideName = guide ? getVillageAgentDefinition(guide.id)?.nameKR ?? '기록되지 않은 에이전트' : '없음';
  const activeRealm = expedition ? getVillageRealmDefinition(expedition.realmId) ?? null : null;
  const activeEncounter = activeRealm
    ? activeRealm.encounters[Math.min(activeRealm.encounters.length - 1, Math.max(0, expedition?.encounterIndex ?? activeRealm.encounters.length - 1))]
    : null;
  const activeForecast = activeRealm && activeEncounter && expedition
    ? getExpeditionForecast(save, expedition.realmId, expedition.encounterIndex ?? activeRealm.encounters.length - 1, expedition.assignedAgentId, expedition.id)
    : null;
  const waitingForBoss = activeEncounter?.tier === 'boss';
  const nextRealmId = result?.outcome === 'victory' ? getNextRealmId(result.realmId) : null;
  const nextRealmPending = Boolean(nextRealmId && !save.meta.unlockedRealms.includes(nextRealmId));
  const storyChoicePending = Boolean(nextRealmId === 'underworld' && getAvailableStoryChoice(save));
  const resultRewardText = result ? formatResources(result.reward) : '없음';
  const resultSuccessChance = result && typeof result.successChance === 'number'
    && Number.isFinite(result.successChance) && result.successChance >= 0 && result.successChance <= 1
    ? result.successChance
    : null;
  const resultEncountersCleared = result ? safeEncounterCount(result.encountersCleared) : null;
  const resultEncounterTotal = result ? safeEncounterCount(result.totalEncounterCount) ?? resultEncountersCleared : null;

  return (
    <main className="village-container">
      <section className="village-panel">
        <div className="village-button-row"><button type="button" className="village-btn village-btn--quiet" onClick={onBack}>← 마을로</button></div>
        <h2 ref={titleRef} tabIndex={-1} style={{ marginTop: 12 }}>원정소</h2>
        <p>정책: <span className="village-action">{getVillagePolicyName(expedition?.policy ?? save.run.policy)}</span> · 길잡이: {guideName}</p>
      </section>

      {!expedition && result && (
        <section className="village-panel" data-testid="village-expedition-result">
          <div className="village-panel-head">
            <h2>{result.outcome === 'victory' ? '원정 성공' : '원정 중단'}</h2>
            <span className="village-action">{getVillageRealmName(result.realmId)}</span>
          </div>
          <p>{result.outcome === 'victory'
            ? resultRewardText === '없음'
              ? '영웅이 무사히 돌아와 사가에 원정 기록을 남겼습니다.'
              : '영웅이 무사히 돌아와 마을에 보상을 남겼습니다.'
            : '이번 원정은 영웅의 안전을 위해 중단되었습니다.'}</p>
          <div className="village-detail-grid">
            <div className="village-detail-stat"><small>전투력</small><strong>{formatFiniteNumber(result.heroPower)}</strong><span className="village-muted">/ 권장 {formatFiniteNumber(result.recommendedPower)}</span></div>
            <div className="village-detail-stat"><small>전투</small><strong>{formatFiniteNumber(result.turns)}턴</strong><span className="village-muted">받은 피해 {formatFiniteNumber(result.totalDamageTaken)}</span></div>
          </div>
          {resultSuccessChance !== null && <p className="village-muted">판정 당시 예상 승률 {Math.round(resultSuccessChance * 100)}%</p>}
          {resultEncountersCleared !== null && resultEncounterTotal !== null && <p className="village-muted">원정 단계 {resultEncountersCleared}/{resultEncounterTotal} 정산</p>}
          {result.outcome === 'victory' ? (
            <>
              <div className="village-alert">획득 보상 · {resultRewardText}{resultRewardText === '없음' ? ' · 사가에 원정 기록을 남겼습니다.' : ''}</div>
              {nextRealmPending && nextRealmId && <div className="village-button-row"><p className="village-muted">{storyChoicePending ? '깊은 숲의 선택을 먼저 사가에 기록해야 저승으로 갈 수 있습니다.' : '다음 영역의 기록을 확인한 뒤 원정을 이어가세요.'}</p>{storyChoicePending
                ? <button type="button" className="village-btn village-btn--primary" onClick={onOpenSaga}>사가에서 선택하기</button>
                : <button type="button" className="village-btn village-btn--primary" onClick={onConfirmUnlock}>{getVillageRealmName(nextRealmId)} 기록하기</button>}</div>}
            </>
          ) : (
            <>
              <div className="village-alert">부족한 점 · {getResultWeakness(result.weaknessKR)}</div>
              <div className="village-alert">영구 자산은 보존되었습니다. 출발 준비 비용도 반환되어 다음 선택을 준비할 수 있습니다.</div>
              <p>추천 시설 · {getVillageFacilityName(result.recommendedFacilityId)} · 예상 재도전 {formatFiniteDuration(result.retryAfterSeconds)}초</p>
              {result.recommendedEquipmentId && <p>추천 장비 · {getVillageEquipmentName(result.recommendedEquipmentId)}</p>}
            </>
          )}
        </section>
      )}

      {expedition ? (
        <section className="village-panel" data-testid="village-active-expedition">
          <h2>{expedition.status === 'awaiting_confirmation' ? '원정 결과 확인 필요' : '원정 진행 중'}</h2>
          <p>{activeRealm?.icon} {getVillageRealmName(expedition.realmId)} · {activeEncounter?.nameKR ?? activeRealm?.boss ?? '기록 확인 필요'}</p>
          {activeEncounter && <div className="village-stat-line"><span className="village-chip">현재 단계 {activeEncounter.tier === 'normal' ? '일반' : activeEncounter.tier === 'elite' ? '정예' : '보스'}</span><span className="village-chip">{(expedition.encounterIndex ?? activeRealm!.encounters.length - 1) + 1}/{activeRealm!.encounters.length}</span><span className="village-chip">권장 {activeEncounter.recommendedPower}</span></div>}
          {activeEncounter && activeForecast && <p className="village-muted">현재 전투력 {getVillageHeroPower(save).toLocaleString('ko-KR')} · 예상 승률 {Math.round(activeForecast.successChance * 100)}%</p>}
          {expedition.status === 'awaiting_confirmation' && <div className="village-alert">오프라인 동안 위험 구간에 도착했습니다. {waitingForBoss ? '보스 결과와 보상을' : '원정 결과와 보상을'} 확인한 뒤 귀환을 확정하세요.</div>}
          <div className="village-progress"><span style={{ width: `${getExpeditionProgressPercent(now, expedition.startedAt, expedition.completesAt)}%` }} /></div>
          <p>{expedition.status === 'awaiting_confirmation' ? '귀환 판정 대기 중' : `귀환까지 ${getExpeditionRemainingSeconds(now, expedition.completesAt)}초`}</p>
          <div className="village-button-row">
            {expedition.status === 'awaiting_confirmation'
              ? <button type="button" className="village-btn village-btn--primary" onClick={onConfirm}>{waitingForBoss ? '보스 결과 확인' : '원정 결과 확인'}</button>
              : <button type="button" className="village-btn village-btn--primary" onClick={onRefresh}>시간 진행 확인</button>}
            <button type="button" className="village-btn village-btn--quiet" disabled={save.run.interventionCharges <= 0} onClick={() => onIntervention('retreat')}>신의 개입: 후퇴 ({save.run.interventionCharges})</button>
          </div>
        </section>
      ) : (
        <section className="village-panel">
          <h2>영역 선택</h2>
          {nextRealmPending && <div className="village-alert">다음 영역 기록을 먼저 확정한 뒤 새 원정을 출발할 수 있습니다.</div>}
          {(Object.keys(REALM_DEFINITIONS) as RealmId[]).map((realmId) => {
            const realm = REALM_DEFINITIONS[realmId];
            const unlocked = save.meta.unlockedRealms.includes(realmId);
            const missingRealmCost = unlocked ? getMissingRealmCost(save, realm.cost) : null;
            const guideReady = guideAvailability === 'ready';
            const guideButtonLabel = nextRealmPending
              ? '기록 먼저 확정'
              : !unlocked
              ? '미해금'
              : missingRealmCost
                ? '재화 부족'
              : guideReady
                ? '길잡이와 출발'
                : guideAvailability === 'fatigued'
                  ? '길잡이 휴식 필요'
                  : guideAvailability === 'busy'
                    ? '길잡이 사용 중'
                    : '길잡이 정보 확인 필요';
            return (
              <article key={realmId} className={`village-realm-card ${unlocked ? '' : 'village-realm-card--locked'}`}>
                <div className="village-realm-head"><h3 className="village-realm-title">{realm.icon} {realm.nameKR}</h3><span className="village-realm-risk">위험도 {Math.round(realm.risk * 100)}%</span></div>
                <p>{realm.description}</p>
                <div className="village-stat-line"><span className="village-chip">권장 전투력 {realm.recommendedPower}</span><span className="village-chip">기본 경로 {getVillageRealmRouteDurationSeconds(realm)}초</span><span className="village-chip">준비 비용 · {formatCosts(realm.cost)}</span></div>
                {missingRealmCost && <div className="village-task village-task--blocked">{missingRealmCost}</div>}
                <p className="village-muted">보스 승률 · 혼자 {Math.round(getExpeditionForecast(save, realmId, 2, null).successChance * 100)}% · 길잡이 {Math.round(getExpeditionForecast(save, realmId, 2, 'guide').successChance * 100)}% · 현재 전투력 {getVillageHeroPower(save).toLocaleString('ko-KR')}</p>
                <p className="village-muted">예상 보상 · {formatResources(realm.reward)}</p>
                <div className="village-encounter-row" aria-label={`${realm.nameKR} 원정 단계`}>
                  {realm.encounters.map((encounter) => <span className="village-encounter" key={encounter.id}><strong>{ENCOUNTER_LABELS[encounter.tier]}</strong><br />{encounter.durationSeconds}초 · {encounter.recommendedPower}</span>)}
                </div>
                <div className="village-button-row" style={{ marginTop: 7 }}>
                  <button
                    type="button"
                    className="village-btn village-btn--primary"
                    disabled={!unlocked || !guideReady || nextRealmPending || Boolean(missingRealmCost)}
                    onClick={() => onStart(realmId, 'guide')}
                  >
                    {guideButtonLabel}
                  </button>
                  <button type="button" className="village-btn village-btn--quiet" disabled={!unlocked || nextRealmPending || Boolean(missingRealmCost)} onClick={() => onStart(realmId, null)}>{nextRealmPending ? '기록 먼저 확정' : missingRealmCost ? '재화 부족' : '혼자 출발'}</button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
