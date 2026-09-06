/**
 * primordialAscensionLore.ts — C1131: Primordial Constellation Hymns & Genesis Chronicles.
 *
 * Chronicles the ancient genesis scriptures, cosmological hymns,
 * and Hall of Sagas inscriptions for the 4 Primordial Constellations.
 */

import type { PrimordialNodeId } from '../systems/primordialAscension';

export interface PrimordialLoreEntry {
  id: PrimordialNodeId;
  nameKR: string;
  hanja: string;
  constellationTitle: string;
  scriptureHymn: string;
  awakeningQuote: string;
  sagaChronicle: string;
}

export const PRIMORDIAL_LORE: Record<PrimordialNodeId, PrimordialLoreEntry> = {
  primordial_genesis: {
    id: 'primordial_genesis',
    nameKR: '태초의 창생',
    hanja: '太初創生',
    constellationTitle: '창세의 생명목 이그드라실',
    scriptureHymn:
      '어둠뿐이던 태초의 허공에 한 줄기 빛이 움트니, 모든 살아 숨 쉬는 것들의 기원이 되는 영겁의 생명력이 온 은하에 충만하도다.',
    awakeningQuote:
      '내 혈관 속으로 우주 창세의 고동이 요동친다. 쇠하지 않는 생명력이 한계를 넘어 무한히 피어오르는구나!',
    sagaChronicle:
      '태초의 창생 성좌를 각성하여 한계 레벨을 돌파하고 불멸의 생명 원천을 영혼에 아로새겼다.',
  },
  primordial_annihilation: {
    id: 'primordial_annihilation',
    nameKR: '태초의 멸각',
    hanja: '太初滅却',
    constellationTitle: '허공을 찢는 종말의 뇌화',
    scriptureHymn:
      '존재하는 모든 법칙과 장벽을 무(無)로 돌려보내는 원초의 파멸이어라. 그 어떤 갑주도, 그 어떤 성벽도 이 절대의 칼날을 막아내지 못하리라.',
    awakeningQuote:
      '차원의 경계조차 나의 일격 앞에 산산이 부서진다. 방어란 이 파괴의 의지 앞에서 환상에 불과할 뿐.',
    sagaChronicle:
      '태초의 멸각 성좌를 각성하여 모든 방어를 분쇄하는 차원 관통의 파괴력을 손에 넣었다.',
  },
  primordial_eternity: {
    id: 'primordial_eternity',
    nameKR: '태초의 영겁',
    hanja: '太初永劫',
    constellationTitle: '마모되지 않는 시간의 결정체',
    scriptureHymn:
      '수억 년의 세월이 흘러 은하가 사그라들지라도 흔들리지 않는 영겁의 중심축. 시공간의 침식마저 튕겨내는 영원불멸의 성벽이 우뚝 서도다.',
    awakeningQuote:
      '어떤 파멸의 폭풍도 나를 꺾을 수 없다. 나의 존재는 시간의 흐름 너머 영겁의 바위에 정박하였으니.',
    sagaChronicle:
      '태초의 영겁 성좌를 각성하여 모든 침식과 타격을 무위로 돌리는 불퇴전의 방벽을 완성하였다.',
  },
  primordial_singularity: {
    id: 'primordial_singularity',
    nameKR: '태초의 특이점',
    hanja: '太初特異點',
    constellationTitle: '만유를 삼킨 궁극의 점',
    scriptureHymn:
      '우주의 종말과 시작이 맞닿는 특이점의 코어. 모든 질량과 물리 법칙이 붕괴하여 새로운 인과율의 주재자를 탄생시키는 성좌의 정점이로다.',
    awakeningQuote:
      '나는 종언의 특이점을 딛고 우주의 새로운 법칙을 빚어낸다. 방어는 곧 공격이요, 나의 전진은 곧 창세의 선언이다.',
    sagaChronicle:
      '태초의 특이점 성좌를 완전히 개화하여 방어력을 공격력으로 승화시키고 태초의 절대 주재자로 거듭났다.',
  },
};

/**
 * Returns the lore entry for a given primordial node.
 */
export function getPrimordialLore(id: PrimordialNodeId): PrimordialLoreEntry {
  return PRIMORDIAL_LORE[id];
}

/**
 * Formats a Hall of Sagas chronicle entry for awakening a primordial rank.
 */
export function formatPrimordialAwakenSaga(
  id: PrimordialNodeId,
  rank: number,
  heroName: string
): string {
  const lore = getPrimordialLore(id);
  return `[태초 성좌 각성] ${heroName}이(가) [${lore.nameKR} (${lore.hanja})] 랭크 ${rank}을(를) 개방: ${lore.sagaChronicle}`;
}

/**
 * Formats the Grand Primordial Zenith coronation chronicle when all 18 ranks are unlocked.
 */
export function formatPrimordialZenithMasterySaga(heroName: string): string {
  return `[원초적 태초 극의 달성] ${heroName}이(가) 태초의 4대 성좌 18랭크를 전원 완전 개화하여 [태초의 지배신 (Primordial Sovereign)]의 자리에 등극하였습니다!`;
}
