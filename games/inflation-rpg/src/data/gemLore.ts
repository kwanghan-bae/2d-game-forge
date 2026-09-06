/**
 * gemLore.ts — C1090: Four-Elemental Celestial Gem Origin Myths & Artisan Mantras.
 *
 * Chronicles the mythic origins of the 4 Celestial Gems, master artisan carving mantras,
 * and battle trigger chants etched into eternal saga memories.
 */

import type { GemType, GemTier } from '../systems/celestialGemCarving';

export interface GemMythology {
  type: GemType;
  titleKR: string;
  originMyth: string;
  elementalPoem: string;
}

export const CELESTIAL_GEM_MYTHS: Record<GemType, GemMythology> = {
  fire_ruby: {
    type: 'fire_ruby',
    titleKR: '홍련의 겁화석 (Crimson Lotus Calamity Ruby)',
    originMyth:
      '태초의 불사조가 열반에 들 때 심장 한가운데 응축시킨 영겁의 불씨. 꺼지지 않는 업화가 깃들어 있어, 타격 시 원소의 폭발을 일으킨다.',
    elementalPoem: '타오르는 홍련이 심연의 어둠을 사르고, 한 번의 일격에 만 겁의 불길이 피어나리라.',
  },
  water_sapphire: {
    type: 'water_sapphire',
    titleKR: '창해의 빙정석 (Abyssal Glacial Sapphire)',
    originMyth:
      '만 년 동안 빛이 닿지 않은 해연의 절대영도 지대에서 태고의 빙룡(氷龍)이 흘린 눈물이 굳어 만들어진 결정. 어떤 흉포한 공격도 얼려 무위로 돌린다.',
    elementalPoem: '고요한 심해가 칼날을 감싸 안으니, 차가운 빙벽 뒤에서 새로운 생명이 솟아나노라.',
  },
  lightning_topaz: {
    type: 'lightning_topaz',
    titleKR: '뇌정의 벽력석 (Nine-Heavens Thunder Topaz)',
    originMyth:
      '구천(九天)의 뇌신이 천벌의 벼락을 허공에 내리꽂았을 때 갈라진 대지에서 채취한 황금빛 보옥. 깃든 자의 칼끝에 영구적인 감전의 궤적을 남긴다.',
    elementalPoem: '하늘을 찢는 벽력이 찰나에 번뜩이니, 벼락을 맞은 적은 온몸이 굳어 흩어지도다.',
  },
  dark_amethyst: {
    type: 'dark_amethyst',
    titleKR: '극야의 명혼석 (Polar Night Void Amethyst)',
    originMyth:
      '별이 사멸하고 남은 극야의 성운 핵에서 추출한 심연의 보석. 살아 숨 쉬는 모든 존재의 생명력을 흡수하여 주인에게 바친다.',
    elementalPoem: '어둠의 심연이 입을 벌려 영혼을 삼키고, 빼앗은 생기로 불멸의 결계를 세우리라.',
  },
};

export const ARTISAN_CARVING_MANTRAS: Record<GemTier, string> = {
  normal: '원석의 탁한 불순물을 망치로 쪼아내고, 숨겨진 원소의 맥을 조심스레 짚어낸다.',
  rare: '보옥의 결을 따라 정교한 정을 대고 진기를 불어넣으니, 투명한 영광(靈光)이 피어오른다.',
  legendary: '원소의 정령이 보옥 중심에서 눈을 뜨며, 손끝에서 우주의 원소 파동이 고동친다.',
  mythic: '하늘과 땅의 섭리가 보옥 안에 응축되어, 영원히 부서지지 않는 완전무결한 초월의 보석이 탄생한다!',
};

/**
 * Returns origin myth for given gem type.
 */
export function getGemMyth(gemType: GemType): GemMythology {
  return CELESTIAL_GEM_MYTHS[gemType];
}

/**
 * Returns artisan carving mantra for given tier.
 */
export function getArtisanMantra(tier: GemTier): string {
  return ARTISAN_CARVING_MANTRAS[tier];
}

/**
 * Returns battle chant when gem trigger activates.
 */
export function getGemTriggerShout(gemType: GemType): string {
  switch (gemType) {
    case 'fire_ruby':
      return '겁화의 불꽃이여, 적을 잿더미로 만들어라!';
    case 'water_sapphire':
      return '창해의 빙벽이여, 상처를 봉인하고 나를 지켜라!';
    case 'lightning_topaz':
      return '구천의 번개여, 적의 방비를 무너뜨려라!';
    case 'dark_amethyst':
      return '심연의 명혼이여, 적의 생명력을 바쳐라!';
  }
}
