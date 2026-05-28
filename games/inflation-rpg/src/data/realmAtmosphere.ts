import type { RealmId } from '../types';

/** 각 영역별 분위기 한 줄 텍스트. 던전 진입 시 랜덤 표시. */
export const REALM_ATMOSPHERE: Record<RealmId, readonly string[]> = {
  base: [
    '풀 냄새가 진하게 풍긴다.',
    '저 멀리 늑대 울음소리가 들린다.',
    '바람이 들판을 스쳐 지나간다.',
    '길가에 부서진 마차가 보인다.',
  ],
  sea: [
    '짠 내음이 코끝을 자극한다.',
    '파도가 거세게 부딪힌다.',
    '수평선 너머 번개가 번쩍인다.',
    '갑판 아래서 무언가 꿈틀거린다.',
  ],
  volcano: [
    '발밑에서 열기가 올라온다.',
    '용암이 붉게 맥동하고 있다.',
    '유황 냄새가 목을 태운다.',
    '먼 곳에서 폭발음이 울린다.',
  ],
  underworld: [
    '차가운 안개가 발목을 감싼다.',
    '망자의 속삭임이 귓가에 맴돈다.',
    '빛 한 줄기 들지 않는 어둠이다.',
    '뼈가 부딪히는 소리가 울려퍼진다.',
  ],
  heaven: [
    '눈부신 빛이 온 몸을 감싼다.',
    '구름 위를 걷는 기분이다.',
    '천사의 노래가 멀리서 들린다.',
    '순수한 기운이 몸 속을 채운다.',
  ],
  chaos: [
    '현실이 찢어지는 소리가 들린다.',
    '모든 것이 뒤틀려 보인다.',
    '시간의 흐름이 멈춘 듯하다.',
    '허공에서 눈이 이쪽을 노려보고 있다.',
  ],
};

export function getAtmosphereText(realmId: RealmId): string {
  const pool = REALM_ATMOSPHERE[realmId];
  return pool[Math.floor(Math.random() * pool.length)]!;
}
