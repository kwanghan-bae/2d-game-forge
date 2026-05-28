/**
 * Monster bestiary lore — 1-line descriptions for each monster.
 * Used by the Bestiary screen (kill count + lore reveal on first encounter).
 */

export const MONSTER_LORE: Record<string, string> = {
  // Common
  slime: '가장 흔한 마물. 약하지만 어디든 나타난다.',
  goblin: '장난 좋아하는 도깨비. 금화를 잘 떨군다.',
  tiger: '산중의 왕. 날카로운 발톱에 조심하라.',
  dragon: '하늘의 지배자. 전설의 존재가 눈앞에.',
  ghost: '원한을 품고 떠도는 영혼. 물리공격이 잘 안 통한다.',
  undead: '죽음을 거부한 망자. 끈질긴 생명력.',
  deity: '신의 기운을 품은 영물. 경외심이 든다.',
  chaos: '혼돈 그 자체. 형태가 계속 변한다.',

  // Plains
  'plains-imp': '평원을 배회하는 하급 도깨비 병사.',
  'plains-rat': '곡식을 훔쳐 먹는 들쥐. 재빠르다.',
  'plains-crow': '불길한 울음의 까마귀. 전장을 따라다닌다.',
  'plains-bandit': '길목에 숨어 행인을 습격하는 야적.',
  'plains-ronin': '싸움에서 진 영혼이 방황하고 있다.',

  // Forest
  'forest-fox': '꼬리 아홉 개까지는 아닌 보통 여우.',
  'forest-squirrel': '도토리를 던져 공격하는 작은 청설모.',
  'forest-bear': '숲의 터줏대감. 잠에서 깨면 무섭다.',
  'forest-spirit': '오래된 나무에 깃든 정령. 치유의 힘.',
  'forest-snake': '독니에 스치면 끝. 빠른 선제 필수.',

  // Mountains
  'mountain-goat': '절벽을 타는 산양. 의외로 단단하다.',
  'mountain-bandit': '산속 아지트의 무장 산적 두목.',
  'mountain-eagle': '하늘에서 급습하는 검독수리.',
  'mountain-miner': '폐광에서 떠도는 광부 유령.',
  'mountain-grey': '회색 가죽의 거대한 고대 곰.',

  // Coast
  'coast-eel': '전기를 내뿜는 뱀장어. 물 밖에서도 위험.',
  'coast-turtle': '등껍질이 철판급. 공격이 안 통한다.',
  'coast-crab': '집게 한 번에 갑옷이 찢긴다.',
  'coast-mermaid': '아름다운 노래로 정신을 혼미하게 한다.',
  'coast-deepfish': '심해에서 올라온 정체불명의 괴어.',

  // Cave
  'cave-bat': '동굴 천장에서 떼로 달려든다.',
  'cave-spider': '거미줄에 걸리면 이동이 봉쇄된다.',
  'cave-miner-ghost': '갱도 붕괴에 묻힌 광부들의 집단 원령.',
  'cave-golem': '마법으로 움직이는 바위 덩어리.',
  'cave-salamander': '불을 뿜는 동굴 도롱뇽. 열에 강하다.',

  // Heaven
  'heaven-immortal': '천계의 하급 선인. 구름 위를 걷는다.',
  'heaven-crane': '천년 묵은 학. 깃털 하나에 신기가 서린다.',
  'heaven-horse': '하늘을 달리는 천마. 속도를 따라잡을 수 없다.',
  'heaven-rabbit': '옥토끼. 귀여운 외모와 달리 무지 세다.',
  'heaven-phoenix': '불사조. 죽여도 재에서 되살아난다.',

  // Underworld
  'under-dead': '저승에서 떠도는 이름 없는 망자.',
  'under-reaper': '죽음의 낫을 든 사신의 부하.',
  'under-maiden': '한복 입은 처녀귀신. 원한이 깊다.',
  'under-flame': '지옥불이 형체를 이룬 존재.',
  'under-spirit': '저승과 이승 사이에 걸린 부유령.',

  // Chaos
  'chaos-shard': '혼돈의 파편이 의지를 얻었다.',
  'chaos-eroder': '만물을 부식시키는 혼돈의 산.',
  'chaos-mutant': '형태가 계속 변하는 돌연변이체.',
  'chaos-bubble': '터지면 혼돈의 에너지가 폭발한다.',
  'chaos-void': '허무 그 자체. 주변의 빛을 삼킨다.',

  // Volcano
  'volcano-sprite': '용암 속에서 태어난 불꽃 정령.',
  'volcano-golem': '마그마로 이루어진 거대 골렘.',
  'volcano-wyrm': '화산에 서식하는 불의 비룡.',
  'volcano-phoenix': '화산 불사조. 열에 면역이다.',
  'volcano-lord': '화산의 지배자. 대지를 뒤흔든다.',

  // Final
  'final-shadow': '세상 끝에 서린 그림자. 빛이 없다.',
  'final-warrior': '최강의 전사. 모든 무술을 섭렵했다.',
  'final-titan': '태초의 거인. 산 하나를 집어던진다.',

  // Demon
  'demon-imp': '마계의 말단 졸개. 수가 많다.',
  'demon-sorcerer': '어둠 마법을 쓰는 마계 술사.',
  'demon-knight': '검은 갑옷의 마계 기사. 강철 의지.',
  'demon-general': '마왕군 사대장 중 하나.',
  'demon-overlord': '마계의 지배자. 최종 보스급.',
};
