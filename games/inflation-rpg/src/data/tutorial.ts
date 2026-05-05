import type { TutorialStep } from '../types';

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 't-1-welcome',
    screen: 'main-menu',
    textKR: '환영한다. "🏘️ 마을로" 를 눌러 모험을 시작하라.',
    ctaKR: '마을로',
  },
  {
    id: 't-2-class',
    screen: 'class-select',
    textKR: '캐릭터를 선택하라. 화랑은 처음부터 해금되어 있다. 각 캐릭터는 고유 패시브 + 액티브 스킬 2개를 가진다.',
    ctaKR: '다음',
  },
  {
    id: 't-3-floors',
    screen: 'dungeon-floors',
    textKR: '선택한 던전의 floor 1 부터 시작한다. floor 카드를 눌러 진입하라. 클리어한 floor 만 활성, 그 이상은 잠금.',
    ctaKR: '다음',
  },
  {
    id: 't-4-dungeon',
    screen: 'battle',
    textKR: '한 floor 마다 1 마리 처치 → 다음 floor 잠금 해제. 자동 전투니 지켜만 봐도 된다.',
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
    textKR: '퀘스트는 처치/수집 목표를 달성하면 보상 수령. 메뉴에서 진행도 확인.',
    ctaKR: '다음',
  },
  {
    id: 't-7-end',
    screen: 'main-menu',
    textKR: '기본은 끝났다. 사망 시 floor 1 부터 다시 시작. DR 과 강화석을 모아 다음 런에 더 깊이 도달하라.',
    ctaKR: '완료',
  },
];

export function getTutorialStep(index: number): TutorialStep | undefined {
  return TUTORIAL_STEPS[index];
}
