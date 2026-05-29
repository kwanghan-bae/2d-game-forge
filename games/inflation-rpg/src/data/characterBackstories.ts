/** Character backstory one-liners for selection screen flavor text */
export const CHARACTER_BACKSTORIES: Record<string, string> = {
  hwarang: '신라의 마지막 화랑. 멸망한 조국의 검술을 잇는다.',
  mudang: '산신령의 계시를 받은 영매. 운명의 실을 볼 수 있다.',
  choeui: '금강산 폭포 아래 수행한 승려. 몸이 곧 방패.',
  geomgaek: '한 자루 칼에 모든 것을 건 검사. 빠르고 치명적.',
  tiger_hunter: '백보 밖의 파리도 꿰뚫는 명궁. 맹수 사냥이 업.',
  dosa: '비밀 결사의 도인. 부적 하나로 천지를 뒤흔든다.',
  yacha: '저승에서 돌아온 귀신. 그림자처럼 빠르고 잔혹하다.',
  gungsu: '전국을 떠도는 궁수. 침착함이 곧 무기.',
  uinyeo: '궁궐을 나온 의녀. 치유의 손길 뒤에 독침이 숨었다.',
  jangsu: '철벽 방어의 장수. 전장에서 물러섬을 모른다.',
  seungbyeong: '승병의 길을 택한 수도승. 불심이 갑옷.',
  geosa: '무거운 갑옷에 의지하는 거사. 느리지만 무너지지 않는다.',
  cheongwan: '하늘의 별을 읽는 천문가. 운명을 거스른다.',
  yongnyeo: '용의 피를 이은 여인. 비늘 아래 불꽃이 흐른다.',
  gwisin: '두 얼굴의 귀신. 웃음 뒤에 칼날이 숨었다.',
  seonin: '깨달음을 얻은 선인. 모든 것을 초월했으나 아직 갈 길이 있다.',
};

export function getBackstory(characterId: string): string | null {
  return CHARACTER_BACKSTORIES[characterId] ?? null;
}
