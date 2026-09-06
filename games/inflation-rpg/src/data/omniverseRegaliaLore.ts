/**
 * omniverseRegaliaLore.ts — C1162: Divine Blacksmith Hymns & Regalia Scriptures.
 *
 * Chronicles the divine forge of Hephaestus, the forging hymns of the 4 Omniverse Regalia,
 * and the progressive narrative dialogue as players forge each apex artifact.
 */

import type { OmniverseRegaliaId } from '../systems/omniverseRegalia';

export interface OmniverseRegaliaLore {
  id: OmniverseRegaliaId;
  nameKR: string;
  hanja: string;
  forgingHymn: string;
  awakenedInscription: string;
}

export const OMNIVERSE_REGALIA_LORE: Record<OmniverseRegaliaId, OmniverseRegaliaLore> = {
  ouroboros_chrono_blade: {
    id: 'ouroboros_chrono_blade',
    nameKR: '시공 방직신의 세검',
    hanja: '時空織神細劍',
    forgingHymn:
      '시간의 꼬리를 무는 영겁의 용, 우로보로스의 이빨을 태초의 불길로 벼려내니, 인과의 실타래조차 절단하는 예리함이 칼날에 서린다.',
    awakenedInscription:
      '적의 어떤 견고한 방패와 절대 가호도 이 칼날 앞에서는 찰나의 허상처럼 베어져 흩어질지어다.',
  },
  ymir_primordial_heart: {
    id: 'ymir_primordial_heart',
    nameKR: '원초 거신의 심장',
    hanja: '原初巨神之心',
    forgingHymn:
      '빙하와 겁화의 대지에서 최초로 고동쳤던 거신 이미르의 심장 박동을 영겁의 주물에 담아내었노라.',
    awakenedInscription:
      '우주가 붕괴해도 결코 멎지 않을 1억의 생명력과 모든 악의를 삼켜내는 태고의 결계가 영웅을 감싸도다.',
  },
  nyx_void_eye: {
    id: 'nyx_void_eye',
    nameKR: '허무 주재자의 진안',
    hanja: '虛無主宰真眼',
    forgingHymn:
      '모든 빛이 태어나기 전 우주를 품었던 밤의 여신 닉스의 눈동자를 순수한 암흑 물질로 연마하여 진안으로 빚어냈다.',
    awakenedInscription:
      '차원의 허무와 삼라만상의 약점을 꿰뚫어보아, 필멸의 상상을 뛰어넘는 파괴적 급소를 맹타하리라.',
  },
  aion_singularity_aegis: {
    id: 'aion_singularity_aegis',
    nameKR: '특이점 대군주의 성벽',
    hanja: '特異點大君主之城壁',
    forgingHymn:
      '시작과 끝이 공존하는 특이점의 대군주 아이온의 의지를 신성한 방패로 형상화하니, 모든 혼돈의 저주가 튕겨 나간다.',
    awakenedInscription:
      '그 어떠한 악독한 디버프와 원소의 멸망조차 성역의 외벽을 흔들지 못하리니, 절대적 평온이 그대와 함께하리라.',
  },
};

export interface BlacksmithDialogue {
  title: string;
  quote: string;
}

/**
 * Returns Hephaestus' progressive dialogue based on the number of forged regalia (0 ~ 4).
 */
export function getBlacksmithDialogue(forgedCount: number): BlacksmithDialogue {
  if (forgedCount >= 4) {
    return {
      title: '우주 대장간의 창조주 (Master of the Omniverse Forge)',
      quote:
        '완성되었도다! 4대 신격 보구가 모두 모여 진정한 우주 주재신의 위용을 완성했다. 이제 삼천대천세계 그 어떤 차원도 그대의 패도를 가로막지 못할 것이다!',
    };
  }

  if (forgedCount === 3) {
    return {
      title: '영겁의 주조 장인 (Eternal Artisan)',
      quote:
        '마지막 단 하나의 보구만을 남겨두었구나! 4대 거신의 혼이 이 모루 위에서 격렬히 공명하며 최후의 신격을 기다리고 있다.',
    };
  }

  if (forgedCount === 2) {
    return {
      title: '성운의 모루지기 (Stellar Anvil Keeper)',
      quote:
        '두 개의 보구가 완벽한 대칭을 이루니 우주의 축이 진동하는구나. 그대의 그릇은 이미 필멸자의 굴레를 아득히 벗어났다.',
    };
  }

  if (forgedCount === 1) {
    return {
      title: '초월의 불씨 수호자 (Keeper of Transcendence)',
      quote:
        '첫 번째 보구의 장엄한 고동이 대장간을 울리는구나! 태초의 불길이 그대의 투지에 반응하여 더욱 뜨겁게 타오르고 있다.',
    };
  }

  return {
    title: '신성 모루의 대장장이 (Divine Blacksmith)',
    quote:
      '어둠의 대장간에 찾아온 도전자여, 만신전 거신들을 굴복시키고 얻은 문장을 내어놓아라. 우주를 지탱할 4대 신격 보구를 벼려주마.',
  };
}

/**
 * Helper to fetch lore for a specific regalia.
 */
export function getRegaliaLore(id: OmniverseRegaliaId): OmniverseRegaliaLore {
  return OMNIVERSE_REGALIA_LORE[id];
}
