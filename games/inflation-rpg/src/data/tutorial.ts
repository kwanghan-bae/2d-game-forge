import type { TutorialStep } from '../types';

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 't-1-welcome',
    screen: 'main-menu',
    textKR: '환영한다. 이제 너의 모험이 시작된다. "시작"을 눌러라.',
    ctaKR: '시작',
  },
  {
    id: 't-2-class',
    screen: 'class-select',
    textKR: '16 클래스 중 하나를 골라라. 각 클래스는 고유 패시브 + 액티브 스킬 2개를 가진다.',
    ctaKR: '다음',
  },
  {
    id: 't-3-worldmap',
    screen: 'world-map',
    textKR: '조선 평야부터 시작한다. region 을 클릭해 첫 area "마을 입구" 로 진입.',
    ctaKR: '다음',
  },
  {
    id: 't-4-dungeon',
    screen: 'dungeon',
    textKR: '던전은 5-10 stage 로 구성된다. 마지막 stage 는 보스. 자동 전투니 지켜만 봐도 된다.',
    ctaKR: '다음',
  },
  {
    id: 't-5-inventory',
    screen: 'inventory',
    textKR: '전투에서 얻은 장비는 여기서 장착한다. 같은 장비 3개로 합성해 다음 등급으로 올릴 수 있다.',
    ctaKR: '다음',
  },
  {
    id: 't-6-quests',
    screen: 'quests',
    textKR: '퀘스트는 region 마다 3-5개. 처치/수집 목표 달성 시 보상 수령.',
    ctaKR: '다음',
  },
  {
    id: 't-7-end',
    screen: 'main-menu',
    textKR: '기본은 끝났다. 사망 시 stage 1 부터 다시. BP 모이면 다음 region 해금. 모험을 즐겨라.',
    ctaKR: '완료',
  },
];

export function getTutorialStep(index: number): TutorialStep | undefined {
  return TUTORIAL_STEPS[index];
}
