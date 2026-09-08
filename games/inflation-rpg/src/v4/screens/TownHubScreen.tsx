import { FACILITY_DEFINITIONS, getV4AgentDefinition, getV4CurrencyName, getV4PolicyName, getV4RealmName, POLICY_LABELS, REALM_DEFINITIONS } from '../data';
import { getFacilityTaskPreview, getFacilityUpgradeCost, getHeroNextAction, getNextRealmId } from '../domain';
import { getV4EquipmentDefinition, getV4EquipmentName } from '../equipment';
import { V4_DAILY_REWARDED_LIMIT } from '../monetization';
import { useV4ScreenHeadingFocus } from '../useV4ScreenHeadingFocus';
import type { FacilityId, FacilityTask, InterventionType, RealmId, SupportAgentId, V4Policy, V4SaveEnvelope } from '../types';
import { V4_MAX_INTERVENTION_CHARGES } from '../types';

interface Props {
  save: V4SaveEnvelope;
  now: number;
  onPolicyChange: (policy: V4Policy) => void;
  onStartTask: (facilityId: FacilityId, agentId?: SupportAgentId | null) => void;
  onCancelTask: (facilityId: FacilityId) => void;
  onRestAgent: (agentId: SupportAgentId) => void;
  onInstantTask?: (facilityId: FacilityId) => void;
  onRefresh: () => void;
  onUpgrade: (facilityId: FacilityId) => void;
  onNavigate: (screen: 'hero' | 'expedition' | 'saga') => void;
  onIntervention: (type: InterventionType) => void;
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
    ? entries.map(([key, value]) => `${getV4CurrencyName(key)} ${formatNumber(value)}`).join(' · ')
    : '없음';
}

function formatUpgradeCost(cost: { gold: number; materials: number } | null): string {
  if (!cost) return '강화 비용 확인 필요';
  return `강화 비용 · 금화 ${formatNumber(cost.gold)} · 재료 ${formatNumber(cost.materials)}`;
}

function getFacilityTaskLabel(facilityId: FacilityId, fallback: string, outputEquipmentIds: string[]): string {
  return facilityId === 'blacksmith' && outputEquipmentIds[0]
    ? `${getV4EquipmentName(outputEquipmentIds[0])} 제작`
    : fallback;
}

function getActiveFacilityTaskLabel(facilityId: FacilityId, task: FacilityTask, fallback: string): string {
  const equipmentIds = Array.isArray(task.outputEquipmentIds)
    ? task.outputEquipmentIds.filter((id): id is string => typeof id === 'string' && Boolean(getV4EquipmentDefinition(id)))
    : [];
  return getFacilityTaskLabel(facilityId, fallback, equipmentIds);
}

function getAgentDisplay(agent: V4SaveEnvelope['meta']['agents'][number]): { name: string; role: string; trait: string } {
  const definition = getV4AgentDefinition(agent.id);
  return {
    name: definition?.nameKR ?? '기록되지 않은 에이전트',
    role: definition?.roleKR ?? '지원 담당자',
    trait: definition?.trait ?? '특성 확인 필요',
  };
}

function remainingSeconds(completesAt: number | undefined, now: number): number {
  if (typeof completesAt !== 'number' || !Number.isFinite(completesAt) || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.ceil((completesAt - now) / 1000));
}

function normalizeInterventionCharges(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) return 0;
  return Math.min(V4_MAX_INTERVENTION_CHARGES, Math.max(0, value));
}

function canHealHero(hero: V4SaveEnvelope['run']['hero']): boolean {
  return typeof hero.hp === 'number'
    && Number.isFinite(hero.hp)
    && typeof hero.hpMax === 'number'
    && Number.isFinite(hero.hpMax)
    && hero.hpMax > 0
    && hero.hp >= 0
    && hero.hp <= hero.hpMax
    && hero.hp < hero.hpMax;
}

function getTownObjective(save: V4SaveEnvelope): string {
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
    return `${getV4RealmName(lastResult.realmId)} 재도전을 준비하세요. ${weakness}`;
  }

  if (lastResult?.outcome === 'victory') {
    const nextRealmId = getNextRealmId(lastResult.realmId);
    if (nextRealmId && !save.meta.unlockedRealms.includes(nextRealmId)) {
      return `${getV4RealmName(nextRealmId)} 기록을 먼저 확정하세요. 원정 화면에서 승리 기록을 남긴 뒤 새 원정을 출발할 수 있습니다.`;
    }
  }

  const unlocked = save.meta.unlockedRealms;
  const currentRealmId: RealmId = unlocked.includes('underworld')
    ? 'underworld'
    : unlocked.includes('deep_forest')
      ? 'deep_forest'
      : 'joseon_plains';
  const nextRealmId = getNextRealmId(currentRealmId);
  if (nextRealmId && !unlocked.includes(nextRealmId)) {
    return `${getV4RealmName(currentRealmId)}에서 승리하면 ${getV4RealmName(nextRealmId)}이 열립니다. 대장간에서 장비를 만든 뒤 정책을 바꿔 다음 원정의 성격을 정하세요.`;
  }

  return '저승의 사가를 완성하세요. 시설을 강화하고 정책과 장비를 조정해 영원한 영웅의 마지막 원정을 준비하세요.';
}

export function TownHubScreen({ save, now, onPolicyChange, onStartTask, onCancelTask, onRestAgent, onInstantTask, onRefresh, onUpgrade, onNavigate, onIntervention, monetizationAvailable, adFree, adsToday, adFreePurchasePending = false, instantTaskPendingFacilities = [], interventionChargePending = false, onInterventionCharge, onBuyAdFree }: Props) {
  const titleRef = useV4ScreenHeadingFocus();
  const hero = save.run.hero;
  const nextAction = getHeroNextAction(save);
  const interventionCharges = normalizeInterventionCharges(save.run.interventionCharges);
  const interventionFull = interventionCharges >= V4_MAX_INTERVENTION_CHARGES;
  const hasInterventionCharge = interventionCharges > 0;
  const objective = getTownObjective(save);
  return (
    <main className="v4-container" data-testid="v4-town-hub">
      <section className="v4-panel v4-hero-card">
        <div className="v4-hero-emoji" aria-hidden="true">{hero.emoji}</div>
        <div>
          <h2 ref={titleRef} tabIndex={-1} className="v4-hero-name">{hero.name}</h2>
          <p className="v4-hero-meta">{formatNumber(hero.age)}세 · Lv.{formatNumber(hero.level)} · {getV4RealmName(hero.realmId)}</p>
          <div className="v4-stat-line">
            <span className="v4-chip">HP {formatNumber(hero.hp)}/{formatNumber(hero.hpMax)}</span>
            <span className="v4-chip">⚔ {formatNumber(hero.atk)}</span>
            <span className="v4-chip">🛡 {formatNumber(hero.def)}</span>
          </div>
        </div>
        <div className="v4-action">현재: {hero.currentAction === 'expedition' ? '원정 중' : hero.currentAction === 'train' ? '훈련 중' : '마을 대기'}</div>
      </section>
      <section className="v4-objective-callout" data-testid="v4-top-objective" aria-label="가장 가까운 목표">
        <span className="v4-kicker">다음 목표</span>
        <p>{objective}</p>
      </section>

      <section className="v4-panel">
        <h2>후원 정책</h2>
        <p>{save.run.expedition
          ? `현재 원정은 ${getV4PolicyName(save.run.expedition.policy)}로 출발했습니다. 지금 변경하면 다음 원정부터 적용됩니다.`
          : '영웅의 다음 행동을 정합니다. HP가 35% 아래면 자동으로 회복을 우선합니다.'}<br />다음 판단 · <span className="v4-action">{HERO_ACTION_LABELS[nextAction]}</span></p>
        <div className="v4-policy-row">
          {(Object.keys(POLICY_LABELS) as V4Policy[]).map((policy) => (
            <button
              key={policy}
              type="button"
              className={`v4-btn ${save.run.policy === policy ? 'v4-btn--selected' : ''}`}
              aria-pressed={save.run.policy === policy}
              onClick={() => onPolicyChange(policy)}
            >
              {POLICY_LABELS[policy]}
            </button>
          ))}
        </div>
      </section>

      <section className="v4-panel">
        <div className="v4-panel-head v4-realm-head">
          <h2>마을 시설</h2>
          <button type="button" className="v4-btn v4-btn--quiet" onClick={() => onNavigate('expedition')}>원정 준비 →</button>
        </div>
        <div className="v4-facility-grid">
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
              <article key={facilityId} className={`v4-facility ${task ? 'v4-facility--active' : ''}`}>
                <div className="v4-facility-head">
                  <span className="v4-facility-icon" aria-hidden="true">{definition.icon}</span>
                  <span className="v4-facility-name">{definition.nameKR}</span>
                  <span className="v4-level">Lv.{formatNumber(facility.level)}</span>
                </div>
                <p className="v4-facility-desc">{definition.description}</p>
                {task ? (
                  <div className="v4-task">{getActiveFacilityTaskLabel(facilityId, task, definition.taskLabelKR)}<br />남은 시간 {remainingSeconds(task.completesAt, now)}초</div>
                ) : (
                  <div className="v4-task">다음: {getFacilityTaskLabel(facilityId, definition.taskLabelKR, preview.outputEquipmentIds)}</div>
                )}
                {taskCannotBeCompletedInstantly
                  && <div className="v4-task v4-task--blocked">완료된 작업입니다. 진행 확인으로 결과를 정산하세요.</div>}
                {!task && agentId && !assignedAgentId && <div className="v4-task">지원 담당자 없이 기본 방식으로 시작합니다.</div>}
                <div className="v4-economy" aria-label={`${definition.nameKR} 작업 경제 정보`}>
                  <span>투입 · {formatResources(preview.input)}</span>
                  <span>산출 · {formatResources(preview.output)}{preview.outputEquipmentIds.length > 0 ? ` · 장비 ${preview.outputEquipmentIds.map(getV4EquipmentName).join(', ')}` : ''}</span>
                  <span>소요 · {preview.durationSeconds}초</span>
                </div>
                <div className="v4-upgrade-cost">{formatUpgradeCost(upgradeCost)}</div>
                {!task && !preview.canStart && <div className="v4-task v4-task--blocked">시작 불가 · {preview.error}</div>}
                <div className="v4-button-row">
                  {task ? (
                    <>
                      <button type="button" className="v4-btn v4-btn--primary" disabled={instantTaskPending} onClick={onRefresh}>진행 확인</button>
                      <button
                        type="button"
                        className="v4-btn v4-btn--quiet"
                        disabled={taskCannotBeCompletedInstantly || instantTaskPending}
                        onClick={() => onCancelTask(facilityId)}
                      >취소</button>
                      {onInstantTask && <button type="button" className="v4-btn v4-btn--quiet" disabled={taskCannotBeCompletedInstantly || instantTaskPending || (!adFree && adsToday >= V4_DAILY_REWARDED_LIMIT)} onClick={() => onInstantTask(facilityId)}>{instantTaskPending ? '광고 처리 중' : '광고 즉시 완료'}</button>}
                    </>
                  ) : (
                    <button type="button" className="v4-btn v4-btn--primary" disabled={!preview.canStart} onClick={() => onStartTask(facilityId, assignedAgentId)}>작업 시작</button>
                  )}
                  <button
                    type="button"
                    className="v4-btn v4-btn--quiet"
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

      <section className="v4-panel">
        <h2>지원 에이전트</h2>
        <div className="v4-agent-list">
          {save.meta.agents.map((agent) => {
            const display = getAgentDisplay(agent);
            return (
              <div key={agent.id} className="v4-agent">
                <span>
                  <span className="v4-agent-role">{display.role}</span> {display.name} · Lv.{formatNumber(agent.level)}
                  <br /><span className="v4-agent-trait">특성 · {display.trait}</span>
                </span>
                <span className="v4-agent-state">신뢰 {formatNumber(agent.trust)} · 피로 {formatNumber(agent.fatigue)}<br />{agent.activeTaskId ? '작업 중' : '대기 중'}<br /><button type="button" className="v4-btn v4-btn--quiet" disabled={Boolean(agent.activeTaskId) || agent.fatigue <= 0} onClick={() => onRestAgent(agent.id)}>휴식</button></span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="v4-panel">
        <h2>가장 가까운 목표</h2>
        <p>{objective}</p>
        <div className="v4-button-row">
          <button type="button" className="v4-btn v4-btn--primary" onClick={() => onNavigate('hero')}>영웅 상세</button>
          <button type="button" className="v4-btn v4-btn--quiet" onClick={() => onNavigate('saga')}>사가 보기</button>
        </div>
      </section>

      <section className="v4-panel">
        <div className="v4-panel-head">
        <h2>신의 개입</h2>
          <span className="v4-action">충전 {formatNumber(interventionCharges)}/{V4_MAX_INTERVENTION_CHARGES}</span>
        </div>
        <p>자동 흐름을 바꾸는 안전장치입니다. 사용해도 장비나 영구 재화를 잃지 않습니다.</p>
        <div className="v4-button-row">
          <button type="button" className="v4-btn v4-btn--quiet" disabled={!hasInterventionCharge || !canHealHero(hero)} onClick={() => onIntervention('heal')}>즉시 회복</button>
          {save.run.expedition && <button type="button" className="v4-btn v4-btn--quiet" disabled={!hasInterventionCharge} onClick={() => onIntervention('retreat')}>원정 후퇴</button>}
        </div>
      </section>

      {monetizationAvailable && <section className="v4-panel">
        <h2>후원 혜택 {adFree && <span className="v4-action">광고 제거 적용</span>}</h2>
        <p>{adFree ? '광고 제거 구매가 적용되었습니다. 보상 혜택을 계속 사용할 수 있습니다.' : `오늘 보상형 광고 ${formatNumber(adsToday)}/${V4_DAILY_REWARDED_LIMIT}회 · 게임 진행을 막지 않는 선택형 혜택입니다.`}</p>
        <div className="v4-button-row">
          <button type="button" className="v4-btn v4-btn--quiet" disabled={interventionFull || interventionChargePending || (!adFree && adsToday >= V4_DAILY_REWARDED_LIMIT)} onClick={onInterventionCharge}>
            {interventionChargePending ? '충전 처리 중' : interventionFull ? '개입 충전 가득 참' : adFree ? '개입 충전' : '개입 충전 광고'}
          </button>
          {!adFree && <button type="button" className="v4-btn v4-btn--quiet" disabled={adFreePurchasePending} onClick={onBuyAdFree}>{adFreePurchasePending ? '구매 처리 중' : '광고 제거 구매'}</button>}
        </div>
      </section>}
    </main>
  );
}
