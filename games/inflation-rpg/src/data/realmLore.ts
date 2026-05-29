/**
 * Realm entry lore — shown once when the player first enters each realm during a run.
 * Provides worldbuilding context for the new area.
 */
import type { RealmId } from '../types';

export const REALM_LORE: Record<RealmId, string> = {
  base: '이곳은 시작의 대지. 옛 영웅들이 첫 발을 내딛던 평화로운 들판이 펼쳐진다.',
  sea: '심연의 바다가 저 너머로 끝없이 이어진다. 소금 바람이 전해오는 것은 전설의 파편.',
  volcano: '대지가 갈라지며 용암이 솟구친다. 고대 화룡의 심장이 아직도 뛰고 있다는 전설이.',
  underworld: '빛이 닿지 않는 세계. 망자의 속삭임이 사방에서 울려퍼진다.',
  heaven: '구름 위의 세계. 은빛 빛줄기가 쏟아지며 신성한 기운이 온몸을 감싼다.',
  chaos: '현실의 법칙이 무너진 곳. 시공간이 뒤틀리며 형형색색의 균열이 맥동한다.',
};

export function getRealmLore(realmId: RealmId): string {
  return REALM_LORE[realmId] ?? REALM_LORE.base;
}
