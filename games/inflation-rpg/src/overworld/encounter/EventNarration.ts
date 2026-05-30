/**
 * C786: Event narration registry — flavor text for event trigger/accept/decline.
 * Pure data, no side effects.
 */

export interface EventNarrationEntry {
  trigger: string; // shown when event appears
  accept: string;  // shown on accept
  decline: string; // shown on decline
}

export const EVENT_NARRATION: Record<string, EventNarrationEntry> = {
  colosseum: {
    trigger: '투기장의 문이 열렸다. 강적들이 기다리고 있다.',
    accept: '투기장에 입장했다. 영광을 향해!',
    decline: '투기장을 뒤로 하고 길을 이어간다.',
  },
  trial_grounds: {
    trigger: '시련의 땅이 눈앞에 펼쳐졌다.',
    accept: '시련을 받아들였다. 성장의 기회!',
    decline: '아직 때가 아니다. 시련을 피해간다.',
  },
  storm_nexus: {
    trigger: '폭풍의 핵이 소용돌이치고 있다. 힘이 넘쳐흐른다.',
    accept: '폭풍 속으로 돌진했다. 힘을 끌어모은다!',
    decline: '폭풍이 너무 위험하다. 물러선다.',
  },
  rain_sanctuary: {
    trigger: '비의 성소가 모습을 드러냈다. 치유의 기운이 느껴진다.',
    accept: '성소의 비를 맞으며 상처를 치유한다.',
    decline: '성소를 지나친다. 금화가 아깝다.',
  },
  fog_ambush: {
    trigger: '짙은 안개 속에서 적의 기척이 느껴진다.',
    accept: '안개 속으로 뛰어들었다. 위험하지만 보상도 크다!',
    decline: '안개를 피해 우회한다.',
  },
  wind_gale: {
    trigger: '강풍이 몰아치고 있다. 바람을 타면 빠르게 움직일 수 있다.',
    accept: '바람을 타고 질주한다! 금화가 흩날린다.',
    decline: '바람이 너무 세다. 기다린다.',
  },
  snow_drift: {
    trigger: '눈보라가 몰아친다. 적도 느려지지만 시야가 흐려진다.',
    accept: '눈보라 속으로 전진한다. 적이 둔해졌다.',
    decline: '눈보라를 피해 은신한다.',
  },
  void_rift: {
    trigger: '공허의 균열이 공간을 찢고 있다. 강대한 힘이 느껴진다.',
    accept: '균열 속으로 뛰어들었다. 유물이 공명한다!',
    decline: '균열을 외면한다. 아직 준비가 안 됐다.',
  },
  abyssal_convergence: {
    trigger: '심연의 기운이 수렴하고 있다. 엄청난 경험치가 느껴지지만 위험하다.',
    accept: '심연에 뛰어든다! 적이 강해지고 생명력이 빠져나간다.',
    decline: '심연의 유혹을 뿌리친다.',
  },
  temporal_fissure: {
    trigger: '시간의 균열이 열렸다. 경험을 저축하면 두 배로 돌려준다고 한다.',
    accept: '시간에 경험을 맡긴다. 5전투 후 두 배로 돌아올 것이다.',
    decline: '시간을 건드리는 건 위험하다. 지나친다.',
  },
  titan_arena: {
    trigger: '타이탄의 투기장이 나타났다. 강한 적과 싸워 큰 경험을 얻을 수 있다.',
    accept: '타이탄의 도전을 받아들인다. 4전투 동안 적 HP×1.5, ATK×1.3, EXP×2.0!',
    decline: '타이탄의 도전을 거부한다. 아직은 이르다.',
  },
};
