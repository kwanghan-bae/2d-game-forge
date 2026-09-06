/**
 * chaosRiftLore.ts — C1083: Endless Chaos Rift Abyss Narrative & Milestone Lore.
 *
 * Chronicles the cosmic origins of the Endless Chaos Rift (무한 혼돈의 균열),
 * the dying gasps of procedural abyss guardians, and legendary saga milestones.
 */

export interface RiftMilestoneLore {
  depth: number;
  depthTitle: string;
  guardianDeathCry: string;
  cosmicSoliloquy: string;
  sagaRecord: string;
}

export const CHAOS_RIFT_ORIGIN_MYTH = {
  title: '차원의 균열과 심연의 태초기 (Origin of the Chaos Rift)',
  text: '시공간의 장벽이 무너지며 현실과 허무의 경계가 갈라진 곳. 끝없는 심도 아래로 내려갈수록 우주의 법칙마저 왜곡되어 무한한 파멸과 영원한 성광의 편린이 뒤엉킨 채 요동친다.',
};

export const RIFT_MILESTONES: Record<number, RiftMilestoneLore> = {
  10: {
    depth: 10,
    depthTitle: '균열의 탐색자',
    guardianDeathCry: '차원의 문턱을 넘은 필멸자여... 더 깊은 곳에는 네 영혼을 삼킬 진정한 어둠이 도사리고 있다!',
    cosmicSoliloquy: '심도 10층의 장벽이 부서지며 차원의 틈새로 흘러나온 별빛 파편들이 격렬히 공명합니다.',
    sagaRecord: '혼돈의 균열 10층을 주파하여 차원 탐색자의 칭호를 얻고 심연의 문턱을 넘어섰다.',
  },
  20: {
    depth: 20,
    depthTitle: '차원 절단자',
    guardianDeathCry: '어찌 필멸의 검이... 시공간의 법칙마저 절단한단 말인가... 크아악!',
    cosmicSoliloquy: '심도 20층의 절대 방어 결계가 깨지며 허공이 갈라지고 차원 균열석이 비처럼 쏟아집니다.',
    sagaRecord: '혼돈의 균열 20층 수호거신을 도륙하고 차원의 시공간을 베어낸 자로 기록되었다.',
  },
  30: {
    depth: 30,
    depthTitle: '심연의 지배자',
    guardianDeathCry: '우리의 패배는 끝이 아니다... 심연의 밑바닥에서 태초의 혼돈이 그대를 기다린다...',
    cosmicSoliloquy: '심도 30층의 암흑 군주가 소멸하자 심연 전체가 요동치며 영웅의 위엄 앞에 침묵합니다.',
    sagaRecord: '심도 30층의 심연 지배자들을 굴복시키고 암흑의 바다 위에 우뚝 섰다.',
  },
  50: {
    depth: 50,
    depthTitle: '무극의 초월자',
    guardianDeathCry: '불가능하다... 이 영역은 신들조차 발을 들이지 못한 금단의 성역이었거늘...!',
    cosmicSoliloquy: '심도 50층의 파멸 사도가 소멸하고, 현실의 한계를 완전히 벗어난 무극의 성광이 균열을 정화합니다.',
    sagaRecord: '신들의 금기인 심도 50층을 정복하여 무극의 초월자로서 전설의 정점에 도달하였다.',
  },
  100: {
    depth: 100,
    depthTitle: '영원의 파멸자',
    guardianDeathCry: '네가 곧 혼돈이며... 네가 곧 우주의 종말이로다...',
    cosmicSoliloquy: '심도 100층, 무한의 나선 끝에서 모든 시공간이 멈추고 영원한 절대자의 신화가 탄생합니다.',
    sagaRecord: '무한 혼돈의 균열 100층을 붕괴시키고 시공간을 초월한 영원의 지배자로 군림하였다.',
  },
};

/**
 * Retrieves milestone lore for a specific depth if defined.
 */
export function getRiftMilestoneLore(depth: number): RiftMilestoneLore | undefined {
  return RIFT_MILESTONES[depth];
}

/**
 * Returns dynamic title based on the highest cleared depth.
 */
export function getRiftDepthTitle(highestDepth: number): string {
  if (highestDepth >= 100) return '영원의 파멸자';
  if (highestDepth >= 50) return '무극의 초월자';
  if (highestDepth >= 30) return '심연의 지배자';
  if (highestDepth >= 20) return '차원 절단자';
  if (highestDepth >= 10) return '균열의 탐색자';
  if (highestDepth >= 1) return '균열의 입문자';
  return '미답의 방랑자';
}

/**
 * Returns guardian death cry for given depth.
 */
export function getGuardianDeathCry(depth: number): string {
  const milestone = RIFT_MILESTONES[depth];
  if (milestone) return milestone.guardianDeathCry;
  return `심도 ${depth}층의 수호자가 차원의 비명을 지르며 흩어집니다!`;
}

/**
 * Formats a chronicle entry for the Saga book.
 */
export function formatRiftSagaEntry(highestDepth: number): string {
  const title = getRiftDepthTitle(highestDepth);
  return `무한 혼돈의 균열 심도 ${highestDepth}층을 돌파하여 [${title}]의 위업을 달성하였다.`;
}
