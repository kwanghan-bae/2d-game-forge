/**
 * chronoLoomLore.ts — C1150: Spacetime Weaver Chronicles & Loom Scripture Lore.
 *
 * Chronicles the ancient hymns of Verdandi the Spacetime Weaver, the Loom of the Norns,
 * and node mastery scriptures for the Chrono Loom tree.
 */

import type { ChronoLoomNodeId } from '../systems/chronoLoom';

export interface ChronoLoomNodeLore {
  nodeId: ChronoLoomNodeId;
  nameKR: string;
  hanja: string;
  weavingScripture: string;
  masteryEpilogue: string;
}

export const CHRONO_LOOM_NODE_LORE: Record<ChronoLoomNodeId, ChronoLoomNodeLore> = {
  warp_accelerant: {
    nodeId: 'warp_accelerant',
    nameKR: '시공 가속',
    hanja: '時空加速',
    weavingScripture:
      '흩어지는 찰나의 순간들을 황금빛 날실로 엮어내니, 영웅의 발걸음이 시간의 흐름 그 자체보다 앞서 달리도다.',
    masteryEpilogue:
      '영웅의 일격과 보법이 광속을 초월하여, 적이 눈을 깜빡이기도 전에 인과의 결말이 도출된다.',
  },
  singularity_aegis: {
    nodeId: 'singularity_aegis',
    nameKR: '특이점 결계',
    hanja: '特異點結界',
    weavingScripture:
      '무한한 중력의 특이점으로 차원의 직물을 왜곡하여, 모든 파괴적 인과를 허공의 침묵 속으로 흡수하노라.',
    masteryEpilogue:
      '어떠한 치명적인 재앙조차 특이점 결계의 벽을 뚫지 못하며, 단 한 번의 죽음조차 인과율의 가호로 무효화된다.',
  },
  chrono_duplication: {
    nodeId: 'chrono_duplication',
    nameKR: '인과 복제',
    hanja: '因果複製',
    weavingScripture:
      '평행하게 흐르는 무수한 가능성의 강줄기에서 승리의 결실만을 겹쳐 짜내니, 기적이 현실 위에 두 배로 직조되리라.',
    masteryEpilogue:
      '쓰러진 강적의 보물이 차원의 틈새에서 두 겹으로 영체화되어, 필멸자가 감당치 못할 보물창고를 이룩하도다.',
  },
  temporal_sovereign: {
    nodeId: 'temporal_sovereign',
    nameKR: '시간 주재',
    hanja: '時間主宰',
    weavingScripture:
      '과거, 현재, 미래의 삼세(三世)를 한 올의 은빛 씨실로 엮어 영혼의 중심에 새기니, 필멸의 육신이 우주적 주재신으로 변모하도다.',
    masteryEpilogue:
      '존재 자체가 시간의 축과 일체화되어, 모든 숨결마다 50%의 초월적 신격이 우주 전역으로 진동한다.',
  },
};

export interface VerdandiDialogue {
  title: string;
  quote: string;
}

/**
 * Returns Verdandi's progressive dialogue based on total weaving ranks achieved (0 ~ 20).
 */
export function getVerdandiDialogue(totalRanks: number): VerdandiDialogue {
  if (totalRanks >= 20) {
    return {
      title: '무한 윤회의 직조신 (Weaver of Eternity)',
      quote:
        '찬란하도다! 4대 인과의 실타래가 모두 완벽한 조화를 이루었으니, 그대는 이제 시간의 굴레를 딛고 선 영원한 직조신입니다.',
    };
  }
  if (totalRanks >= 10) {
    return {
      title: '시공의 마에스트로 (Chrono Maestro)',
      quote:
        '베틀 위에서 춤추는 그대의 손길이 느껴집니다. 우주의 법칙이 그대의 박자에 맞춰 숨을 고르고 있군요.',
    };
  }
  if (totalRanks >= 5) {
    return {
      title: '인과율의 조율자 (Causal Harmonizer)',
      quote:
        '실타래가 점차 굵직한 인과의 맥락을 형성하고 있습니다. 이제 평범한 필멸의 운명 따위는 그대를 구속하지 못합니다.',
    };
  }
  return {
    title: '직조의 입문자 (Initiate Weaver)',
    quote:
      '어서 오십시오, 방랑자여. 환생으로 모아온 시공 정수를 내어놓으십시오. 그대의 운명을 새로이 짜 드리겠습니다.',
  };
}

/**
 * Returns lore information for a specific Chrono Loom node.
 */
export function getChronoLoomNodeLore(nodeId: ChronoLoomNodeId): ChronoLoomNodeLore {
  return CHRONO_LOOM_NODE_LORE[nodeId];
}
