import { FACILITY_DEFINITIONS, POLICY_LABELS } from '../data';
import type { FacilityId, SupportAgentId, V4Policy, V4SaveEnvelope } from '../types';

interface Props {
  save: V4SaveEnvelope;
  now: number;
  onPolicyChange: (policy: V4Policy) => void;
  onStartTask: (facilityId: FacilityId, agentId?: SupportAgentId | null) => void;
  onCancelTask: (facilityId: FacilityId) => void;
  onInstantTask?: (facilityId: FacilityId) => void;
  onRefresh: () => void;
  onUpgrade: (facilityId: FacilityId) => void;
  onNavigate: (screen: 'hero' | 'expedition' | 'saga') => void;
  monetizationAvailable: boolean;
  adsToday: number;
  onInterventionCharge: () => void;
  onBuyAdFree: () => void;
}

const AGENT_BY_FACILITY: Partial<Record<FacilityId, SupportAgentId>> = {
  blacksmith: 'blacksmith', mudang: 'mudang', expedition: 'guide',
};

const formatNumber = (value: number) => value.toLocaleString('ko-KR');

function remainingSeconds(completesAt: number | undefined, now: number): number {
  if (!completesAt) return 0;
  return Math.max(0, Math.ceil((completesAt - now) / 1000));
}

export function TownHubScreen({ save, now, onPolicyChange, onStartTask, onCancelTask, onInstantTask, onRefresh, onUpgrade, onNavigate, monetizationAvailable, adsToday, onInterventionCharge, onBuyAdFree }: Props) {
  const hero = save.run.hero;
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
        <p>영웅의 다음 행동을 정합니다. HP가 35% 아래면 자동으로 회복을 우선합니다.</p>
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
                <div className="v4-button-row">
                  {task ? (
                    <>
                      <button type="button" className="v4-btn v4-btn--primary" onClick={onRefresh}>진행 확인</button>
                      <button type="button" className="v4-btn v4-btn--quiet" onClick={() => onCancelTask(facilityId)}>취소</button>
                      {onInstantTask && <button type="button" className="v4-btn v4-btn--quiet" onClick={() => onInstantTask(facilityId)}>광고 즉시 완료</button>}
                    </>
                  ) : (
                    <button type="button" className="v4-btn v4-btn--primary" onClick={() => onStartTask(facilityId, agentId)}>작업 시작</button>
                  )}
                  <button type="button" className="v4-btn v4-btn--quiet" onClick={() => onUpgrade(facilityId)} aria-label={`${definition.nameKR} 강화`}>+</button>
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
              <span className="v4-agent-state">신뢰 {agent.trust} · 피로 {agent.fatigue}<br />{agent.activeTaskId ? '작업 중' : '대기 중'}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="v4-panel">
        <h2>가장 가까운 목표</h2>
        <p>조선 평야에서 첫 승리를 기록하면 깊은 숲이 열립니다. 대장간에서 장비를 만든 뒤 정책을 바꿔 다음 원정의 성격을 정하세요.</p>
        <div className="v4-button-row">
          <button type="button" className="v4-btn v4-btn--primary" onClick={() => onNavigate('hero')}>영웅 상세</button>
          <button type="button" className="v4-btn v4-btn--quiet" onClick={() => onNavigate('saga')}>사가 보기</button>
        </div>
      </section>

      {monetizationAvailable && <section className="v4-panel">
        <h2>후원 혜택</h2>
        <p>오늘 보상형 광고 {adsToday}/5회 · 게임 진행을 막지 않는 선택형 혜택입니다.</p>
        <div className="v4-button-row">
          <button type="button" className="v4-btn v4-btn--quiet" disabled={adsToday >= 5} onClick={onInterventionCharge}>개입 충전 광고</button>
          <button type="button" className="v4-btn v4-btn--quiet" onClick={onBuyAdFree}>광고 제거 구매</button>
        </div>
      </section>}
    </main>
  );
}
