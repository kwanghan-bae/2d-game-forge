import { FACILITY_DEFINITIONS, getV4CurrencyName, POLICY_LABELS, REALM_DEFINITIONS } from '../data';
import { getFacilityTaskPreview, getFacilityUpgradeCost, getHeroNextAction, getNextRealmId } from '../domain';
import { getV4EquipmentName } from '../equipment';
import type { FacilityId, InterventionType, RealmId, SupportAgentId, V4Policy, V4SaveEnvelope } from '../types';

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
  onInterventionCharge: () => void;
  onBuyAdFree: () => void;
}

const AGENT_BY_FACILITY: Partial<Record<FacilityId, SupportAgentId>> = {
  blacksmith: 'blacksmith', mudang: 'mudang', expedition: 'guide',
};

const formatNumber = (value: number) => value.toLocaleString('ko-KR');
const HERO_ACTION_LABELS = { rest: '마을에서 회복', train: '훈련소에서 성장', expedition: '원정 준비' } as const;

function formatResources(resources: Partial<Record<string, number>>): string {
  const entries = Object.entries(resources).filter(([, value]) => (value ?? 0) > 0);
  return entries.length > 0
    ? entries.map(([key, value]) => `${getV4CurrencyName(key)} ${formatNumber(value ?? 0)}`).join(' · ')
    : '없음';
}

function remainingSeconds(completesAt: number | undefined, now: number): number {
  if (typeof completesAt !== 'number' || !Number.isFinite(completesAt) || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.ceil((completesAt - now) / 1000));
}

function getTownObjective(save: V4SaveEnvelope): string {
  if (save.run.expedition) {
    return '원정이 진행 중입니다. 원정 화면에서 현재 단계와 예상 승률을 확인하세요.';
  }

  const lastResult = save.run.lastExpeditionResult;
  if (lastResult?.outcome === 'defeat') {
    return `${REALM_DEFINITIONS[lastResult.realmId].nameKR} 재도전을 준비하세요. ${lastResult.weaknessKR}을 보완하면 다음 승리에 가까워집니다.`;
  }

  if (lastResult?.outcome === 'victory') {
    const nextRealmId = getNextRealmId(lastResult.realmId);
    if (nextRealmId && !save.meta.unlockedRealms.includes(nextRealmId)) {
      return `${REALM_DEFINITIONS[nextRealmId].nameKR} 기록을 먼저 확정하세요. 원정 화면에서 승리 기록을 남긴 뒤 새 원정을 출발할 수 있습니다.`;
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
    return `${REALM_DEFINITIONS[currentRealmId].nameKR}에서 승리하면 ${REALM_DEFINITIONS[nextRealmId].nameKR}이 열립니다. 대장간에서 장비를 만든 뒤 정책을 바꿔 다음 원정의 성격을 정하세요.`;
  }

  return '저승의 사가를 완성하세요. 시설을 강화하고 정책과 장비를 조정해 영원한 영웅의 마지막 원정을 준비하세요.';
}

export function TownHubScreen({ save, now, onPolicyChange, onStartTask, onCancelTask, onRestAgent, onInstantTask, onRefresh, onUpgrade, onNavigate, onIntervention, monetizationAvailable, adFree, adsToday, onInterventionCharge, onBuyAdFree }: Props) {
  const hero = save.run.hero;
  const nextAction = getHeroNextAction(save);
  const interventionFull = save.run.interventionCharges >= 3;
  return (
    <main className="v4-container" data-testid="v4-town-hub">
      <section className="v4-panel v4-hero-card">
        <div className="v4-hero-emoji" aria-hidden="true">{hero.emoji}</div>
        <div>
          <h2 className="v4-hero-name">{hero.name}</h2>
          <p className="v4-hero-meta">{hero.age}세 · Lv.{hero.level} · {hero.realmId === 'joseon_plains' ? '조선 평야' : hero.realmId === 'deep_forest' ? '깊은 숲' : '저승'}</p>
          <div className="v4-stat-line">
            <span className="v4-chip">HP {formatNumber(hero.hp)}/{formatNumber(hero.hpMax)}</span>
            <span className="v4-chip">⚔ {formatNumber(hero.atk)}</span>
            <span className="v4-chip">🛡 {formatNumber(hero.def)}</span>
          </div>
        </div>
        <div className="v4-action">현재: {hero.currentAction === 'expedition' ? '원정 중' : hero.currentAction === 'train' ? '훈련 중' : '마을 대기'}</div>
      </section>

      <section className="v4-panel">
        <h2>후원 정책</h2>
        <p>영웅의 다음 행동을 정합니다. HP가 35% 아래면 자동으로 회복을 우선합니다.<br />다음 판단 · <span className="v4-action">{HERO_ACTION_LABELS[nextAction]}</span></p>
        <div className="v4-policy-row">
          {(Object.keys(POLICY_LABELS) as V4Policy[]).map((policy) => (
            <button
              key={policy}
              type="button"
              className={`v4-btn ${save.run.policy === policy ? 'v4-btn--selected' : ''}`}
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
            const agentId = AGENT_BY_FACILITY[facilityId];
            const assignedAgent = agentId ? save.meta.agents.find((agent) => agent.id === agentId) : undefined;
            const assignedAgentId = agentId && assignedAgent && !assignedAgent.activeTaskId && assignedAgent.fatigue < 100
              ? agentId
              : null;
            const preview = getFacilityTaskPreview(save, facilityId, assignedAgentId);
            const upgradeCost = getFacilityUpgradeCost(save, facilityId);
            return (
              <article key={facilityId} className={`v4-facility ${task ? 'v4-facility--active' : ''}`}>
                <div className="v4-facility-head">
                  <span className="v4-facility-icon" aria-hidden="true">{definition.icon}</span>
                  <span className="v4-facility-name">{definition.nameKR}</span>
                  <span className="v4-level">Lv.{facility.level}</span>
                </div>
                <p className="v4-facility-desc">{definition.description}</p>
                {task ? (
                  <div className="v4-task">{task.type}<br />남은 시간 {remainingSeconds(task.completesAt, now)}초</div>
                ) : (
                  <div className="v4-task">다음: {definition.taskLabelKR}</div>
                )}
                {!task && agentId && !assignedAgentId && <div className="v4-task">지원 담당자 없이 기본 방식으로 시작합니다.</div>}
                <div className="v4-economy" aria-label={`${definition.nameKR} 작업 경제 정보`}>
                  <span>투입 · {formatResources(preview.input)}</span>
                  <span>산출 · {formatResources(preview.output)}{preview.outputEquipmentIds.length > 0 ? ` · 장비 ${preview.outputEquipmentIds.map(getV4EquipmentName).join(', ')}` : ''}</span>
                  <span>소요 · {preview.durationSeconds}초</span>
                </div>
                {!task && !preview.canStart && <div className="v4-task v4-task--blocked">시작 불가 · {preview.error}</div>}
                <div className="v4-button-row">
                  {task ? (
                    <>
                      <button type="button" className="v4-btn v4-btn--primary" onClick={onRefresh}>진행 확인</button>
                      <button type="button" className="v4-btn v4-btn--quiet" onClick={() => onCancelTask(facilityId)}>취소</button>
                      {onInstantTask && <button type="button" className="v4-btn v4-btn--quiet" disabled={!adFree && adsToday >= 5} onClick={() => onInstantTask(facilityId)}>광고 즉시 완료</button>}
                    </>
                  ) : (
                    <button type="button" className="v4-btn v4-btn--primary" disabled={!preview.canStart} onClick={() => onStartTask(facilityId, assignedAgentId)}>작업 시작</button>
                  )}
                  <button
                    type="button"
                    className="v4-btn v4-btn--quiet"
                    onClick={() => onUpgrade(facilityId)}
                    aria-label={`${definition.nameKR} 강화 · 금화 ${upgradeCost?.gold ?? 0}, 재료 ${upgradeCost?.materials ?? 0}`}
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
          {save.meta.agents.map((agent) => (
            <div key={agent.id} className="v4-agent">
              <span><span className="v4-agent-role">{agent.roleKR}</span> {agent.nameKR} · Lv.{agent.level}</span>
              <span className="v4-agent-state">신뢰 {agent.trust} · 피로 {agent.fatigue}<br />{agent.activeTaskId ? '작업 중' : '대기 중'}<br /><button type="button" className="v4-btn v4-btn--quiet" disabled={Boolean(agent.activeTaskId) || agent.fatigue <= 0} onClick={() => onRestAgent(agent.id)}>휴식</button></span>
            </div>
          ))}
        </div>
      </section>

      <section className="v4-panel">
        <h2>가장 가까운 목표</h2>
        <p>{getTownObjective(save)}</p>
        <div className="v4-button-row">
          <button type="button" className="v4-btn v4-btn--primary" onClick={() => onNavigate('hero')}>영웅 상세</button>
          <button type="button" className="v4-btn v4-btn--quiet" onClick={() => onNavigate('saga')}>사가 보기</button>
        </div>
      </section>

      <section className="v4-panel">
        <div className="v4-panel-head">
          <h2>신의 개입</h2>
          <span className="v4-action">충전 {save.run.interventionCharges}/3</span>
        </div>
        <p>자동 흐름을 바꾸는 안전장치입니다. 사용해도 장비나 영구 재화를 잃지 않습니다.</p>
        <div className="v4-button-row">
          <button type="button" className="v4-btn v4-btn--quiet" disabled={save.run.interventionCharges <= 0 || hero.hp >= hero.hpMax} onClick={() => onIntervention('heal')}>즉시 회복</button>
          {save.run.expedition && <button type="button" className="v4-btn v4-btn--quiet" disabled={save.run.interventionCharges <= 0} onClick={() => onIntervention('retreat')}>원정 후퇴</button>}
        </div>
      </section>

      {monetizationAvailable && <section className="v4-panel">
        <h2>후원 혜택 {adFree && <span className="v4-action">광고 제거 적용</span>}</h2>
        <p>{adFree ? '광고 제거 구매가 적용되었습니다. 보상 혜택을 계속 사용할 수 있습니다.' : `오늘 보상형 광고 ${adsToday}/5회 · 게임 진행을 막지 않는 선택형 혜택입니다.`}</p>
        <div className="v4-button-row">
          <button type="button" className="v4-btn v4-btn--quiet" disabled={interventionFull || (!adFree && adsToday >= 5)} onClick={onInterventionCharge}>
            {interventionFull ? '개입 충전 가득 참' : adFree ? '개입 충전' : '개입 충전 광고'}
          </button>
          {!adFree && <button type="button" className="v4-btn v4-btn--quiet" onClick={onBuyAdFree}>광고 제거 구매</button>}
        </div>
      </section>}
    </main>
  );
}
