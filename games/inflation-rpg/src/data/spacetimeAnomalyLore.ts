/**
 * spacetimeAnomalyLore.ts — C1114: Spacetime Anomaly Observer Chronicles & Tactical Lore.
 *
 * Chronicles the observational logs of ancient cosmic astromancers,
 * the mystical mantras of tactical decision-making, and Hall of Sagas inscriptions.
 */

import type { SpacetimeAnomalyType, AnomalyTactic } from '../systems/spacetimeAnomaly';

export interface AnomalyObserverLog {
  type: SpacetimeAnomalyType;
  observerName: string;
  fieldNotes: string;
  phenomenonHypothesis: string;
}

export const ANOMALY_OBSERVER_LOGS: Record<SpacetimeAnomalyType, AnomalyObserverLog> = {
  chrono_surge: {
    type: 'chrono_surge',
    observerName: '시간의 점성술사 카이로스',
    fieldNotes:
      '초침의 간격이 무너지며 과거와 미래의 파동이 한꺼번에 육신을 관통한다. 움직임은 빛보다 빨라지나 상처 또한 가속되어 파고든다.',
    phenomenonHypothesis:
      '차원 틈새에서 유출된 타키온 입자가 국소적 시공간을 가속시켜 엔트로피의 흐름을 왜곡시키는 것으로 추정된다.',
  },
  gravity_well: {
    type: 'gravity_well',
    observerName: '성간 역학자 바리온',
    fieldNotes:
      '발밑의 대지가 우주의 심연으로 꺼져내리는 듯한 척력과 인력의 교차. 어떤 단단한 갑옷도 이 왜곡된 질량장 앞에서는 종잇장처럼 구겨진다.',
    phenomenonHypothesis:
      '특이점의 질량이 공간을 짓누르며 물질의 결합력을 약화시키는 동시에, 원소 마력의 집중도를 극대화하고 있다.',
  },
  quantum_phase: {
    type: 'quantum_phase',
    observerName: '양자 도사 슈뢰딩거',
    fieldNotes:
      '눈앞의 적이 존재하는 동시에 존재하지 않는다. 검날이 허공을 가르는 순간에도, 보이지 않는 차원 너머에서 적의 급소를 꿰뚫는다.',
    phenomenonHypothesis:
      '차원 간섭으로 인해 생명체의 양자 상태가 중첩되어, 물리적 충돌 판정이 확률적 위상 터널링으로 치환되는 현상이다.',
  },
  singularity_core: {
    type: 'singularity_core',
    observerName: '암흑 성운의 현자 아펙스',
    fieldNotes:
      '빛조차 도망칠 수 없는 절대 붕괴의 심연. 우주의 법칙이 완전히 정지된 이곳에서 살아남는 자만이 태초의 차원 정수를 손에 쥘 수 있다.',
    phenomenonHypothesis:
      '시공간의 곡률이 무한대로 수렴하여 모든 인과율이 파괴되는 지점. 극도의 생존 위험을 감수하는 대가로 막대한 우주적 정수가 응축된다.',
  },
};

export const TACTICAL_MANTRAS: Record<AnomalyTactic, { nameKR: string; mantra: string }> = {
  stabilize: {
    nameKR: '시공간 안정화',
    mantra: '별빛의 질서로 뒤틀린 차원을 가다듬고, 순수한 조화의 힘으로 전장을 지배하라.',
  },
  harness: {
    nameKR: '왜곡 수용',
    mantra: '폭풍을 거스르지 않고 그 흐름에 몸을 실어, 혼돈의 파도를 칼끝에 담아내라.',
  },
  collapse: {
    nameKR: '강제 붕괴',
    mantra: '차원의 벽을 부수고 특이점을 폭발시켜, 극한의 파멸 속에서 불멸의 정수를 쟁취하라!',
  },
};

/**
 * Returns observer log for a given anomaly type.
 */
export function getAnomalyObserverLog(type: SpacetimeAnomalyType): AnomalyObserverLog {
  return ANOMALY_OBSERVER_LOGS[type];
}

/**
 * Returns tactical mantra for a chosen response tactic.
 */
export function getTacticalMantra(tactic: AnomalyTactic): { nameKR: string; mantra: string } {
  return TACTICAL_MANTRAS[tactic];
}

/**
 * Formats a chronicle record for the Hall of Sagas upon conquering an anomaly.
 */
export function formatAnomalySagaEntry(
  anomalyType: SpacetimeAnomalyType,
  tactic: AnomalyTactic,
  heroName: string
): string {
  const log = getAnomalyObserverLog(anomalyType);
  const tacticInfo = getTacticalMantra(tactic);
  return `[차원 왜곡] 용사 ${heroName}이(가) ${log.type} 현상을 마주하여 [${tacticInfo.nameKR}] 방침을 결단하고 돌파하였다. "${tacticInfo.mantra}"`;
}
