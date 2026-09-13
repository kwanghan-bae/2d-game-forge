import { FACILITY_DEFINITIONS, getVillageAgentDefinition, getVillageCurrencyName, getVillagePolicyName, getVillageRealmName, POLICY_LABELS, REALM_DEFINITIONS } from '../data';
import { getFacilityTaskPreview, getFacilityUpgradeCost, getHeroNextAction, getNextRealmId, getVillageAgentPlan } from '../domain';
import { getVillageEquipmentDefinition, getVillageEquipmentName } from '../equipment';
import { Village_DAILY_REWARDED_LIMIT } from '../monetization';
import { useVillageScreenHeadingFocus } from '../useVillageScreenHeadingFocus';
import type { FacilityId, FacilityTask, InterventionType, RealmId, SupportAgentId, VillageFactionId, VillagePolicy, VillageSaveEnvelope, VillageWorldChainKind, VillageWorldEvent } from '../types';
import { Village_MAX_INTERVENTION_CHARGES, Village_MAX_WORLD_CHAIN_STEP } from '../types';

interface Props {
  save: VillageSaveEnvelope;
  now: number;
  onPolicyChange: (policy: VillagePolicy) => void;
  onStartTask: (facilityId: FacilityId, agentId?: SupportAgentId | null) => void;
  onCancelTask: (facilityId: FacilityId) => void;
  onRestAgent: (agentId: SupportAgentId) => void;
  onInstantTask?: (facilityId: FacilityId) => void;
  onRefresh: () => void;
  onUpgrade: (facilityId: FacilityId) => void;
  onNavigate: (screen: 'hero' | 'expedition' | 'saga') => void;
  onIntervention: (type: InterventionType) => void;
  pendingWorldEvents?: readonly VillageWorldEvent[];
  onResolveWorldEvent?: (eventId: string, choiceId: string) => void;
  monetizationAvailable: boolean;
  adFree: boolean;
  adsToday: number;
  adFreePurchasePending?: boolean;
  instantTaskPendingFacilities?: readonly FacilityId[];
  interventionChargePending?: boolean;
  onInterventionCharge: () => void;
  onBuyAdFree: () => void;
}

const AGENT_BY_FACILITY: Partial<Record<FacilityId, SupportAgentId>> = {
  blacksmith: 'blacksmith', mudang: 'mudang', expedition: 'guide',
};

const VILLAGE_FACTION_IDS: readonly VillageFactionId[] = ['village', 'merchants', 'spirits'];
const VILLAGE_FACTION_LABELS: Record<VillageFactionId, string> = {
  village: '마을',
  merchants: '상단',
  spirits: '정령',
};
const VILLAGE_CHAIN_LABELS: Record<VillageWorldChainKind, string> = {
  weather_supply: '날씨 → 물자',
  supply_social: '물자 → 민심',
  social_omen: '민심 → 징조',
  omen_weather: '징조 → 날씨',
};

const formatNumber = (value: unknown): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '0';
  return Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(value))).toLocaleString('ko-KR');
};
const HERO_ACTION_LABELS = { rest: '마을에서 회복', train: '훈련소에서 성장', expedition: '원정 준비' } as const;

function formatResources(resources: Partial<Record<string, number>>): string {
  const entries = Object.entries(resources).filter(([, value]) =>
    typeof value === 'number' && Number.isFinite(value) && value > 0,
  );
  return entries.length > 0
    ? entries.map(([key, value]) => `${getVillageCurrencyName(key)} ${formatNumber(value)}`).join(' · ')
    : '없음';
}

function formatUpgradeCost(cost: { gold: number; materials: number } | null): string {
  if (!cost) return '강화 비용 확인 필요';
  return `강화 비용 · 금화 ${formatNumber(cost.gold)} · 재료 ${formatNumber(cost.materials)}`;
}

function formatNormalized(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '확인 필요';
  return `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`;
}

function getFacilityTaskLabel(facilityId: FacilityId, fallback: string, outputEquipmentIds: string[]): string {
  return facilityId === 'blacksmith' && outputEquipmentIds[0]
    ? `${getVillageEquipmentName(outputEquipmentIds[0])} 제작`
    : fallback;
}

function getActiveFacilityTaskLabel(facilityId: FacilityId, task: FacilityTask, fallback: string): string {
  const equipmentIds = Array.isArray(task.outputEquipmentIds)
    ? task.outputEquipmentIds.filter((id): id is string => typeof id === 'string' && Boolean(getVillageEquipmentDefinition(id)))
    : [];
  return getFacilityTaskLabel(facilityId, fallback, equipmentIds);
}

function getAgentDisplay(agent: VillageSaveEnvelope['meta']['agents'][number]): { name: string; role: string; trait: string } {
  const definition = getVillageAgentDefinition(agent.id);
  return {
    name: definition?.nameKR ?? '기록되지 않은 에이전트',
    role: definition?.roleKR ?? '지원 담당자',
    trait: definition?.trait ?? '특성 확인 필요',
  };
}

function isUsableAgentState(agent: VillageSaveEnvelope['meta']['agents'][number]): boolean {
  const definition = getVillageAgentDefinition(agent.id);
  return Boolean(definition
    && agent.nameKR === definition.nameKR
    && agent.roleKR === definition.roleKR
    && agent.trait === definition.trait
    && typeof agent.level === 'number'
    && Number.isInteger(agent.level)
    && agent.level >= 1
    && agent.level <= 3
    && typeof agent.trust === 'number'
    && Number.isFinite(agent.trust)
    && agent.trust >= 0
    && agent.trust <= 100
    && typeof agent.fatigue === 'number'
    && Number.isFinite(agent.fatigue)
    && agent.fatigue >= 0
    && agent.fatigue <= 100);
}

function remainingSeconds(completesAt: number | undefined, now: number): number {
  if (typeof completesAt !== 'number' || !Number.isFinite(completesAt) || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.ceil((completesAt - now) / 1000));
}

function normalizeInterventionCharges(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) return 0;
  return Math.min(Village_MAX_INTERVENTION_CHARGES, Math.max(0, value));
}

function canHealHero(hero: VillageSaveEnvelope['run']['hero']): boolean {
  return typeof hero.hp === 'number'
    && Number.isFinite(hero.hp)
    && typeof hero.hpMax === 'number'
    && Number.isFinite(hero.hpMax)
    && hero.hpMax > 0
    && hero.hp >= 0
    && hero.hp <= hero.hpMax
    && hero.hp < hero.hpMax;
}

function getTownObjective(save: VillageSaveEnvelope): string {
  if (save.run.expedition) {
    if (save.run.expedition.status === 'awaiting_confirmation') {
      return '원정 결과 확인이 필요합니다. 원정 화면에서 귀환을 확정하세요.';
    }
    return '원정이 진행 중입니다. 원정 화면에서 현재 단계와 예상 승률을 확인하세요.';
  }

  const lastResult = save.run.lastExpeditionResult;
  if (lastResult?.outcome === 'defeat') {
    const weakness = typeof lastResult.weaknessKR === 'string' && lastResult.weaknessKR.trim().length > 0
      ? lastResult.weaknessKR.trim()
      : '원정 결과의 준비 정보를 확인하세요.';
    return `${getVillageRealmName(lastResult.realmId)} 재도전을 준비하세요. ${weakness}`;
  }

  if (lastResult?.outcome === 'victory') {
    const nextRealmId = getNextRealmId(lastResult.realmId);
    if (nextRealmId && !save.meta.unlockedRealms.includes(nextRealmId)) {
      return `${getVillageRealmName(nextRealmId)} 기록을 먼저 확정하세요. 원정 화면에서 승리 기록을 남긴 뒤 새 원정을 출발할 수 있습니다.`;
    }
  }

  const unlocked = save.meta.unlockedRealms;
  const currentRealmId: RealmId = unlocked.includes('underworld')
    ? 'underworld'
    : unlocked.includes('deep_forest')
      ? 'deep_forest'
      : 'sacred_fields';
  const nextRealmId = getNextRealmId(currentRealmId);
  if (nextRealmId && !unlocked.includes(nextRealmId)) {
    return `${getVillageRealmName(currentRealmId)}에서 승리하면 ${getVillageRealmName(nextRealmId)}이 열립니다. 대장간에서 장비를 만든 뒤 정책을 바꿔 다음 원정의 성격을 정하세요.`;
  }

  return '저승의 사가를 완성하세요. 시설을 강화하고 정책과 장비를 조정해 영원한 영웅의 마지막 원정을 준비하세요.';
}

export function TownHubScreen({ save, now, onPolicyChange, onStartTask, onCancelTask, onRestAgent, onInstantTask, onRefresh, onUpgrade, onNavigate, onIntervention, pendingWorldEvents = [], onResolveWorldEvent, monetizationAvailable, adFree, adsToday, adFreePurchasePending = false, instantTaskPendingFacilities = [], interventionChargePending = false, onInterventionCharge, onBuyAdFree }: Props) {
  const titleRef = useVillageScreenHeadingFocus();
  const hero = save.run.hero;
  const nextAction = getHeroNextAction(save);
  const interventionCharges = normalizeInterventionCharges(save.run.interventionCharges);
  const interventionFull = interventionCharges >= Village_MAX_INTERVENTION_CHARGES;
  const hasInterventionCharge = interventionCharges > 0;
  const objective = getTownObjective(save);
  const worldFactions = save.meta.ai.world.factions;
  const worldChains = save.meta.ai.world.chains ?? [];
  return (
    <main className="village-container" data-testid="village-town-hub">
      <div className="village-town-overview" data-testid="village-town-overview">
        <section className="village-panel village-hero-card" data-testid="village-town-hero">
          <div className="village-hero-sprite" data-testid="village-hero-sprite" aria-hidden="true" />
          <div>
            <h2 ref={titleRef} tabIndex={-1} className="village-hero-name">{hero.name}</h2>
            <p className="village-hero-meta">{formatNumber(hero.age)}세 · Lv.{formatNumber(hero.level)} · {getVillageRealmName(hero.realmId)}</p>
            <div className="village-stat-line">
              <span className="village-chip">HP {formatNumber(hero.hp)}/{formatNumber(hero.hpMax)}</span>
              <span className="village-chip">⚔ {formatNumber(hero.atk)}</span>
              <span className="village-chip">🛡 {formatNumber(hero.def)}</span>
            </div>
          </div>
          <div className="village-action">현재: {hero.currentAction === 'expedition' ? '원정 중' : hero.currentAction === 'train' ? '훈련 중' : '마을 대기'}</div>
        </section>
        <section className="village-objective-callout" data-testid="village-top-objective" aria-label="가장 가까운 목표">
          <span className="village-kicker">다음 목표</span>
          <p>{objective}</p>
        </section>
      </div>

      {pendingWorldEvents.length > 0 && <section className="village-panel" data-testid="village-world-events" aria-labelledby="village-world-events-title">
        <div className="village-panel-head">
          <h2 id="village-world-events-title">마을에 일어난 일</h2>
          <span className="village-action">선택 필요</span>
        </div>
        {pendingWorldEvents.map((event) => <article key={event.id} className="village-task village-task--blocked">
          <strong>{event.title}</strong>
          {event.factionId && <p className="village-muted">원인 축 · {VILLAGE_FACTION_LABELS[event.factionId]}{event.chainStep === undefined ? '' : ` · 사건 연쇄 ${event.chainStep + 1}/${Village_MAX_WORLD_CHAIN_STEP + 1}단계`}</p>}
          <p>{event.cause}</p>
          <p>{event.prompt}</p>
          <div className="village-button-row">
            {event.choices.map((choice) => <button
              key={choice.id}
              type="button"
              className="village-btn village-btn--primary"
              onClick={() => onResolveWorldEvent?.(event.id, choice.id)}
            >{choice.title}</button>)}
          </div>
        </article>)}
        <p className="village-muted">사건을 선택하기 전에는 영웅이 다음 행동을 결정하지 않습니다.</p>
      </section>}

      <section className="village-panel" data-testid="village-world-dynamics" aria-labelledby="village-world-dynamics-title">
        <div className="village-panel-head">
          <h2 id="village-world-dynamics-title">마을의 흐름</h2>
          <span className="village-action">세계 {formatNumber(save.meta.ai.world.lastSimulatedDay)}일차</span>
        </div>
        <div className="village-agent-list">
          {VILLAGE_FACTION_IDS.map((factionId) => {
            const faction = worldFactions?.[factionId];
            return (
              <div key={factionId} className="village-agent">
                <span>
                  <span className="village-agent-role">{VILLAGE_FACTION_LABELS[factionId]}</span> 세력
                  <br /><span className="village-agent-trait">영향력 · {formatNormalized(faction?.influence)}</span>
                </span>
                <span className="village-agent-state">신뢰 {formatNormalized(faction?.trust)} · 긴장 {formatNormalized(faction?.tension)}</span>
              </div>
            );
          })}
        </div>
        {worldChains.length > 0
          ? <p className="village-muted">진행 중인 원인 연쇄 · {worldChains.map((chain) => `${VILLAGE_CHAIN_LABELS[chain.kind]} ${chain.step + 1}/${Village_MAX_WORLD_CHAIN_STEP + 1}단계 · ${chain.momentum >= 0.35 ? '확대' : chain.momentum <= -0.35 ? '완화' : '유지'}`).join(' · ')}</p>
          : <p className="village-muted">아직 이어지는 사건 연쇄가 없습니다. 선택과 시간이 다음 흐름을 만듭니다.</p>}
        <p className="village-muted">지원 에이전트는 담당 세력의 신뢰·긴장도와 사건 연쇄를 각자의 경험으로 해석해 다음 목표를 정합니다.</p>
      </section>

      <section className="village-panel">
        <h2>후원 정책</h2>
        <p>{save.run.expedition
          ? `현재 원정은 ${getVillagePolicyName(save.run.expedition.policy)}로 출발했습니다. 지금 변경하면 다음 원정부터 적용됩니다.`
          : '영웅의 다음 행동을 정합니다. HP가 35% 아래면 자동으로 회복을 우선합니다.'}<br />다음 판단 · <span className="village-action">{HERO_ACTION_LABELS[nextAction]}</span></p>
        <div className="village-policy-row">
          {(Object.keys(POLICY_LABELS) as VillagePolicy[]).map((policy) => (
            <button
              key={policy}
              type="button"
              className={`village-btn ${save.run.policy === policy ? 'village-btn--selected' : ''}`}
              aria-pressed={save.run.policy === policy}
              onClick={() => onPolicyChange(policy)}
            >
              {POLICY_LABELS[policy]}
            </button>
          ))}
        </div>
      </section>

      <div className="village-town-management" data-testid="village-town-management">
        <section className="village-panel">
          <div className="village-panel-head village-realm-head">
            <h2>마을 시설</h2>
            <button type="button" className="village-btn village-btn--quiet" onClick={() => onNavigate('expedition')}>원정 준비 →</button>
          </div>
          <div className="village-facility-grid">
          {(Object.keys(FACILITY_DEFINITIONS) as FacilityId[]).map((facilityId) => {
            const definition = FACILITY_DEFINITIONS[facilityId];
            const facility = save.meta.facilities[facilityId];
            const task = facility.activeTaskId ? save.meta.tasks[facility.activeTaskId] : undefined;
            const taskCannotBeCompletedInstantly = Boolean(
              task && (!Number.isFinite(task.completesAt) || !Number.isFinite(now) || task.completesAt <= now),
            );
            const agentId = AGENT_BY_FACILITY[facilityId];
            const assignedAgent = agentId ? save.meta.agents.find((agent) => agent.id === agentId) : undefined;
            const assignedAgentId = agentId && assignedAgent && !assignedAgent.activeTaskId && assignedAgent.fatigue < 100
              ? agentId
              : null;
            const instantTaskPending = instantTaskPendingFacilities.includes(facilityId);
            const preview = getFacilityTaskPreview(save, facilityId, assignedAgentId);
            const upgradeCost = getFacilityUpgradeCost(save, facilityId);
            const upgradeDisabled = Boolean(
              task
              || !upgradeCost
              || !Number.isFinite(facility.level)
              || !Number.isInteger(facility.level)
              || facility.level < 1
              || facility.level >= Number.MAX_SAFE_INTEGER,
            );
            return (
              <article key={facilityId} className={`village-facility ${task ? 'village-facility--active' : ''}`}>
                <div className="village-facility-head">
                  <span className="village-facility-icon" aria-hidden="true">{definition.icon}</span>
                  <span className="village-facility-name">{definition.nameKR}</span>
                  <span className="village-level">Lv.{formatNumber(facility.level)}</span>
                </div>
                <p className="village-facility-desc">{definition.description}</p>
                {task ? (
                  <div className="village-task">{getActiveFacilityTaskLabel(facilityId, task, definition.taskLabelKR)}<br />남은 시간 {remainingSeconds(task.completesAt, now)}초</div>
                ) : (
                  <div className="village-task">다음: {getFacilityTaskLabel(facilityId, definition.taskLabelKR, preview.outputEquipmentIds)}</div>
                )}
                {taskCannotBeCompletedInstantly
                  && <div className="village-task village-task--blocked">완료된 작업입니다. 진행 확인으로 결과를 정산하세요.</div>}
                {!task && agentId && !assignedAgentId && <div className="village-task">지원 담당자 없이 기본 방식으로 시작합니다.</div>}
                <div className="village-economy" aria-label={`${definition.nameKR} 작업 경제 정보`}>
                  <span>투입 · {formatResources(preview.input)}</span>
                  <span>산출 · {formatResources(preview.output)}{preview.outputEquipmentIds.length > 0 ? ` · 장비 ${preview.outputEquipmentIds.map(getVillageEquipmentName).join(', ')}` : ''}</span>
                  <span>소요 · {preview.durationSeconds}초</span>
                </div>
                <div className="village-upgrade-cost">{formatUpgradeCost(upgradeCost)}</div>
                {!task && !preview.canStart && <div className="village-task village-task--blocked">시작 불가 · {preview.error}</div>}
                <div className="village-button-row">
                  {task ? (
                    <>
                      <button type="button" className="village-btn village-btn--primary" disabled={instantTaskPending} onClick={onRefresh}>진행 확인</button>
                      <button
                        type="button"
                        className="village-btn village-btn--quiet"
                        disabled={taskCannotBeCompletedInstantly || instantTaskPending}
                        onClick={() => onCancelTask(facilityId)}
                      >취소</button>
                      {onInstantTask && <button type="button" className="village-btn village-btn--quiet" disabled={taskCannotBeCompletedInstantly || instantTaskPending || (!adFree && adsToday >= Village_DAILY_REWARDED_LIMIT)} onClick={() => onInstantTask(facilityId)}>{instantTaskPending ? '광고 처리 중' : '광고 즉시 완료'}</button>}
                    </>
                  ) : (
                    <button type="button" className="village-btn village-btn--primary" disabled={!preview.canStart} onClick={() => onStartTask(facilityId, assignedAgentId)}>작업 시작</button>
                  )}
                  <button
                    type="button"
                    className="village-btn village-btn--quiet"
                    disabled={upgradeDisabled}
                    onClick={() => onUpgrade(facilityId)}
                    aria-label={`${definition.nameKR} 강화 · 금화 ${formatNumber(upgradeCost?.gold)}, 재료 ${formatNumber(upgradeCost?.materials)}`}
                  >+</button>
                </div>
              </article>
            );
          })}
          </div>
        </section>

        <section className="village-panel">
          <h2>지원 에이전트</h2>
          <div className="village-agent-list">
            {save.meta.agents.map((agent) => {
              const display = getAgentDisplay(agent);
              const usable = isUsableAgentState(agent);
              const plan = getVillageAgentPlan(save, agent.id);
              const currentStep = plan.plan.steps[plan.plan.currentStep]?.labelKR ?? '다음 판단을 준비 중';
              return (
                <div key={agent.id} className="village-agent">
                  <span>
                    <span className="village-agent-role">{display.role}</span> {display.name} · Lv.{formatNumber(agent.level)}
                    <br /><span className="village-agent-trait">특성 · {display.trait}</span>
                  </span>
                  <span className="village-agent-state">신뢰 {formatNumber(agent.trust)} · 피로 {formatNumber(agent.fatigue)}<br /><span title={plan.rationale}>다음 목표 · {plan.goalLabel}</span><br /><span title={plan.rationale}>행동 모드 · {plan.modeLabel}</span><br /><span title={plan.rationale}>현재 단계 · {currentStep}</span><br />{!usable ? '에이전트 정보 확인 필요' : agent.activeTaskId ? '작업 중' : '대기 중'}<br /><button type="button" className="village-btn village-btn--quiet" disabled={!usable || Boolean(agent.activeTaskId) || agent.fatigue <= 0} onClick={() => onRestAgent(agent.id)}>휴식</button></span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="village-panel">
        <h2>가장 가까운 목표</h2>
        <p>{objective}</p>
        <div className="village-button-row">
          <button type="button" className="village-btn village-btn--primary" onClick={() => onNavigate('hero')}>영웅 상세</button>
          <button type="button" className="village-btn village-btn--quiet" onClick={() => onNavigate('saga')}>사가 보기</button>
        </div>
      </section>

      <section className="village-panel">
        <div className="village-panel-head">
        <h2>신의 개입</h2>
          <span className="village-action">충전 {formatNumber(interventionCharges)}/{Village_MAX_INTERVENTION_CHARGES}</span>
        </div>
        <p>자동 흐름을 바꾸는 안전장치입니다. 사용해도 장비나 영구 재화를 잃지 않습니다.</p>
        <div className="village-button-row">
          <button type="button" className="village-btn village-btn--quiet" disabled={!hasInterventionCharge || !canHealHero(hero)} onClick={() => onIntervention('heal')}>즉시 회복</button>
          {save.run.expedition && <button type="button" className="village-btn village-btn--quiet" disabled={!hasInterventionCharge} onClick={() => onIntervention('retreat')}>원정 후퇴</button>}
        </div>
      </section>

      {monetizationAvailable && <section className="village-panel">
        <h2>후원 혜택 {adFree && <span className="village-action">광고 제거 적용</span>}</h2>
        <p>{adFree ? '광고 제거 구매가 적용되었습니다. 보상 혜택을 계속 사용할 수 있습니다.' : `오늘 보상형 광고 ${formatNumber(adsToday)}/${Village_DAILY_REWARDED_LIMIT}회 · 게임 진행을 막지 않는 선택형 혜택입니다.`}</p>
        <div className="village-button-row">
          <button type="button" className="village-btn village-btn--quiet" disabled={interventionFull || interventionChargePending || (!adFree && adsToday >= Village_DAILY_REWARDED_LIMIT)} onClick={onInterventionCharge}>
            {interventionChargePending ? '충전 처리 중' : interventionFull ? '개입 충전 가득 참' : adFree ? '개입 충전' : '개입 충전 광고'}
          </button>
          {!adFree && <button type="button" className="village-btn village-btn--quiet" disabled={adFreePurchasePending} onClick={onBuyAdFree}>{adFreePurchasePending ? '구매 처리 중' : '광고 제거 구매'}</button>}
        </div>
      </section>}
    </main>
  );
}
