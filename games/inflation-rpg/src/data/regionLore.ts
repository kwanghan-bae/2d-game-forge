/**
 * Region discovery lore — immersive flavor text for first-time region entry.
 * Each region has 2 short lore snippets (randomly selected).
 */

const REGION_LORE: Record<string, [string, string]> = {
  plains: [
    '끝없이 펼쳐진 초원에 바람이 속삭인다. 이곳에서 수많은 모험이 시작되었다.',
    '풀잎 사이로 옛 전사의 흔적이 보인다. 평온하지만 방심은 금물.',
  ],
  forest: [
    '거대한 고목들이 하늘을 가린다. 숲의 정령이 침입자를 지켜보고 있다.',
    '이끼 낀 바위 아래 무언가 숨어 있다. 숲은 비밀을 잘 감춘다.',
  ],
  mountains: [
    '구름 위로 솟은 봉우리. 정상에 오를수록 공기가 차갑고 적이 강해진다.',
    '절벽 사이에서 울려 퍼지는 메아리. 산신령의 영역에 발을 들였다.',
  ],
  sea: [
    '짙푸른 파도가 발끝을 적신다. 해저에 잠든 용궁의 보물이 부른다.',
    '소금기 어린 바람에 옛 해적의 전설이 실려 온다.',
  ],
  volcano: [
    '대지가 붉게 달아오른다. 용암의 열기가 피부를 태울 듯하다.',
    '화산 깊은 곳에서 울리는 포효. 불의 정수를 찾는 자만이 살아남는다.',
  ],
  heaven: [
    '구름 다리를 건너니 눈부신 빛이 내리쬔다. 선계의 문이 열렸다.',
    '천상의 종소리가 울린다. 이곳의 시간은 지상과 다르게 흐른다.',
  ],
  underworld: [
    '어둠이 살아 숨 쉬는 곳. 망자의 울음이 발걸음을 따라온다.',
    '지하 깊은 곳에 잊혀진 왕국이 있다. 살아서 돌아간 자는 드물다.',
  ],
  chaos: [
    '현실의 법칙이 무너진 공간. 하늘과 땅의 경계가 뒤틀려 있다.',
    '혼돈의 균열에서 뿜어져 나오는 마력. 이성을 잃지 않는 것이 첫 번째 시련.',
  ],
  'demon-castle': [
    '검은 성벽에 붉은 눈이 번뜩인다. 마왕의 위압이 온몸을 짓누른다.',
    '성 안에서 들려오는 비명. 이곳에 발을 들인 용사는 돌아오지 못했다.',
  ],
  'final-realm': [
    '세계의 끝, 모든 것이 시작된 곳. 최후의 결전이 기다린다.',
    '하늘이 갈라지고 별이 떨어진다. 운명의 마지막 장이 펼쳐진다.',
  ],
};

export function getRegionLore(regionRef: string): string | null {
  const lore = REGION_LORE[regionRef];
  if (!lore) return null;
  return lore[Math.floor(Math.random() * lore.length)]!;
}
