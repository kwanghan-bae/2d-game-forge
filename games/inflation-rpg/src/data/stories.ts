import type { Story } from '../types';

export const STORIES: Story[] = [
  // ── Region enter (10) ──
  { id: 's-region-plains', type: 'region_enter', refId: 'plains',
    textKR: '바람이 부드럽게 풀잎을 쓸어내린다. 농가의 굴뚝에서 연기가 피어오르고, 멀리서 도깨비들의 웃음소리가 들린다. 이곳 조선 평야가 너의 첫 무대다.' },
  { id: 's-region-forest', type: 'region_enter', refId: 'forest',
    textKR: '거목들이 하늘을 가리고 햇빛 한 줄기 들지 않는다. 짙은 풀냄새와 함께 짐승의 발자국이 어디론가 사라진다. 깊은 숲은 신령한 자만이 살아 나온다.' },
  { id: 's-region-mountains', type: 'region_enter', refId: 'mountains',
    textKR: '바위 절벽이 끝없이 솟아오른다. 구름 사이로 매가 활공하고, 산짐승의 그림자가 능선을 따라 움직인다. 이곳에서 약자는 단숨에 굴러 떨어진다.' },
  { id: 's-region-coast', type: 'region_enter', refId: 'coast',
    textKR: '파도가 끊임없이 절벽에 부딪힌다. 짠 바람이 옷자락을 흔들고, 수평선 너머에서 해룡의 울음소리가 메아리친다. 동해의 깊이를 헤아리지 마라.' },
  { id: 's-region-volcano', type: 'region_enter', refId: 'volcano',
    textKR: '용암이 흐르는 강이 발 아래에 있다. 뜨거운 공기에 숨이 막히고, 불꽃 정령들이 너를 노려본다. 한 발자국 잘못 디디면 끝이다.' },
  { id: 's-region-heaven-realm', type: 'region_enter', refId: 'heaven-realm',
    textKR: '구름이 발 아래에 펼쳐진다. 황금 누각이 끝없이 솟아 있고, 옥토끼와 학들이 한가로이 노닌다. 천계의 공기는 마시기만 해도 단전이 뜨거워진다.' },
  { id: 's-region-underworld', type: 'region_enter', refId: 'underworld',
    textKR: '검은 강이 흐르고, 망자의 행렬이 끝없이 이어진다. 저승사자의 시선이 너를 따라온다. 산 자가 발 들이는 곳이 아니지만, 너는 들어선다.' },
  { id: 's-region-chaos', type: 'region_enter', refId: 'chaos',
    textKR: '시간과 공간이 뒤틀린다. 어제와 내일이 동시에 존재하고, 색조차 안정되지 않는다. 혼돈계는 정상의 법칙이 통하지 않는 영역이다.' },
  { id: 's-region-demon-castle', type: 'region_enter', refId: 'demon-castle',
    textKR: '검은 성벽이 하늘을 찌른다. 마기가 자욱하고, 성문 너머에서 음산한 합창이 울린다. 마성에 들어선 자는 돌아간 적이 없다.' },
  { id: 's-region-final-realm', type: 'region_enter', refId: 'final-realm',
    textKR: '모든 것이 끝나는 곳. 또는 모든 것이 시작되는 곳. 너는 마침내 여기까지 도달했다. 이제 종말과 마주할 시간이다.' },

  // ── Boss defeat (16) — 주요 보스 ──
  { id: 's-boss-goblin-chief', type: 'boss_defeat', refId: 'goblin-chief',
    textKR: '도깨비 대장이 무릎을 꿇는다. "다시는 사람을 괴롭히지 않겠다…" 그의 마지막 말이 바람에 흩어진다.' },
  { id: 's-boss-plains-ghost', type: 'boss_defeat', refId: 'plains-ghost',
    textKR: '폐허의 망령이 빛으로 흩어진다. 오랜 세월 떠돌던 한이 마침내 풀린다.' },
  { id: 's-boss-spirit-post-guardian', type: 'boss_defeat', refId: 'spirit-post-guardian',
    textKR: '서낭당의 수호신이 너를 인정한다. "이 길을 지나가도 좋다, 인간."' },
  { id: 's-boss-cursed-plains', type: 'boss_defeat', refId: 'cursed-plains',
    textKR: '저주받은 군주가 사라지자, 들판의 시든 풀이 다시 푸르러진다.' },
  { id: 's-boss-plains-lord', type: 'boss_defeat', refId: 'plains-lord',
    textKR: '평야의 군주가 쓰러진다. 그의 왕관이 너의 발 앞에 떨어진다.' },
  { id: 's-boss-gumiho', type: 'boss_defeat', refId: 'gumiho',
    textKR: '구미호의 아홉 꼬리가 모두 사라진다. 마지막 순간 그녀는 인간의 얼굴로 돌아간다.' },
  { id: 's-boss-tree-spirit', type: 'boss_defeat', refId: 'tree-spirit',
    textKR: '신령 거목이 천천히 가지를 늘어뜨린다. 천 년의 잠에 든다.' },
  { id: 's-boss-black-tiger', type: 'boss_defeat', refId: 'black-tiger',
    textKR: '흑호가 마지막 포효를 내지른다. 그 가죽이 검에서 황금빛으로 변한다.' },
  { id: 's-boss-forest-ruler', type: 'boss_defeat', refId: 'forest-ruler',
    textKR: '숲의 통치자가 무너지자, 모든 나무가 한 번 떨고 다시 잠잠해진다.' },
  { id: 's-boss-gate-guardian', type: 'boss_defeat', refId: 'gate-guardian',
    textKR: '관문의 수호신이 머리를 숙인다. "백두로 향하는 길을 너에게 허락한다."' },
  { id: 's-boss-sea-god', type: 'boss_defeat', refId: 'sea-god',
    textKR: '해신의 거대한 몸이 깊은 바닷속으로 가라앉는다. 파도가 잠시 멈춘다.' },
  { id: 's-boss-jade-emperor', type: 'boss_defeat', refId: 'jade-emperor',
    textKR: '옥황상제가 옥좌에서 일어선다. "인간이 여기까지 올라왔다… 이는 운명인가."' },
  { id: 's-boss-death-reaper', type: 'boss_defeat', refId: 'death-reaper',
    textKR: '저승사자의 낫이 부러진다. 그는 침묵 속에서 사라진다.' },
  { id: 's-boss-chaos-god', type: 'boss_defeat', refId: 'chaos-god',
    textKR: '혼돈신의 형체가 무수한 조각으로 흩어진다. 그러나 어디선가 그 일부는 다시 모인다.' },
  { id: 's-boss-time-warden', type: 'boss_defeat', refId: 'time-warden',
    textKR: '시간의 파수꾼이 사라지자, 모든 시간이 정지한 듯 느껴진다. 잠시 후, 다시 흐른다.' },
  { id: 's-boss-final-boss', type: 'boss_defeat', refId: 'final-boss',
    textKR: '최종 보스가 천천히 무너진다. 그가 마지막으로 너를 본다. "너는… 진정 강해졌구나." 모든 것이 빛에 휩싸인다.' },
];

export function getStoryById(id: string): Story | undefined {
  return STORIES.find((s) => s.id === id);
}

export function getRegionEnterStory(regionId: string): Story | undefined {
  return STORIES.find((s) => s.type === 'region_enter' && s.refId === regionId);
}

export function getBossDefeatStory(bossId: string): Story | undefined {
  return STORIES.find((s) => s.type === 'boss_defeat' && s.refId === bossId);
}
