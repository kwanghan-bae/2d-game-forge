/**
 * petFlavor.ts — C1054: Divine Beasts Lore & Companion Dialogue Engine.
 *
 * Provides Eastern mythological lore, origin myths, and context-sensitive
 * combat dialogue for the 4 Divine Beasts (백호, 청룡, 주작, 현무).
 */

import type { PetType } from '../systems/petSystem';

export interface PetMythologyLore {
  title: string;
  origin: string;
  temperament: string;
  sacredDomain: string;
}

export const PET_MYTHOLOGY_LORE: Record<PetType, PetMythologyLore> = {
  white_tiger: {
    title: '백호 (白虎) — 서방을 호령하는 맹렬한 금(金)의 신수',
    origin: '가을의 서릿발과 강철의 기운이 응결하여 탄생한 신수로, 백수의 왕이자 절대적 용맹의 상징이다.',
    temperament: '과묵하고 호전적이나, 진정한 투지를 지닌 용사에게는 목숨을 바쳐 충성을 다한다.',
    sacredDomain: '서쪽 암벽 산맥과 백두의 험준한 봉우리',
  },
  azure_dragon: {
    title: '청룡 (靑龍) — 동방을 깨우는 번개와 목(木)의 신수',
    origin: '봄의 생명력과 동해의 천둥구름 속에서 승천한 푸른 용으로, 폭풍우와 번개를 자유자재로 다룬다.',
    temperament: '지혜롭고 기품이 넘치며, 불의를 참지 못하고 번뜩이는 벼락으로 악을 심판한다.',
    sacredDomain: '동쪽 심해와 천둥이 치는 구름바다',
  },
  vermilion_bird: {
    title: '주작 (朱雀) — 남방을 밝히는 불멸과 화(火)의 신수',
    origin: '여름의 작열하는 태양과 정화의 불길에서 태어난 불사조로, 끝없는 치유와 재생의 축복을 내린다.',
    temperament: '온화하고 자애로우며, 동행자의 상처를 자신의 날개로 감싸 치유한다.',
    sacredDomain: '남쪽 화산 지대와 불꽃이 피어나는 오동나무 숲',
  },
  black_tortoise: {
    title: '현무 (玄武) — 북방을 수호하는 난공불락의 수(水)의 신수',
    origin: '겨울의 심연과 북쪽 북극성 아래 뱀과 거북이 합일하여 태어난 수호신으로, 대지와 영겁을 상징한다.',
    temperament: '신중하고 침착하며, 어떤 파멸적인 충격도 묵묵히 받아내어 동료를 보호한다.',
    sacredDomain: '북쪽 얼어붙은 빙하 협곡과 지하 수맥',
  },
};

export interface PetDialogueSet {
  victory: string[];
  lowHp: string[];
  levelUp: string[];
}

export const PET_COMBAT_BARKS: Record<PetType, PetDialogueSet> = {
  white_tiger: {
    victory: [
      '크릉... 적들은 네 칼날 아래 먼지가 되었다. 다음 사냥감을 찾아라!',
      '좋은 일격이었다! 맹수의 기백이 네 무구에 서려 있구나.',
      '피비린내 속에서 승리를 쟁취했다. 쉬지 말고 전진하라!',
    ],
    lowHp: [
      '물러서지 마라! 내 이빨이 네 등 뒤를 지켜줄 터이니!',
      '상처 따위에 움츠러들지 마라. 쓰러지는 순간이 곧 패배다!',
      '크아앙! 아직 적의 숨통을 끊지 못했다. 힘을 내라!',
    ],
    levelUp: [
      '영혼의 유대가 더 깊어졌군. 날카로운 발톱에 서늘한 한기가 서린다!',
      '크릉, 뼈마디가 단단해지는 것이 느껴진다. 더 강한 적을 데려와라!',
    ],
  },
  azure_dragon: {
    victory: [
      '하늘을 가르는 벼락처럼 깔끔한 승리로구나. 바람이 우리를 인도한다.',
      '천벌의 뇌전 앞에 마물들이 재가 되었다. 훌륭한 솜씨로다.',
      '구름이 걷히고 승리의 빛이 비치는구나. 다음 행선지로 가자.',
    ],
    lowHp: [
      '신속의 바람을 둘러라! 아직 번개의 빛은 꺼지지 않았다!',
      '호흡을 가다듬어라, 용사여. 내 폭풍이 적의 발을 묶겠다!',
      '위기일수록 마음을 고요히 하라. 번개는 찰나에 꽂히는 법!',
    ],
    levelUp: [
      '용의 여의주가 푸른 빛을 발하는구나. 더 빠른 번개를 부를 수 있겠어.',
      '승천의 기운이 차오른다! 우리의 발걸음이 한층 가벼워질 것이다.',
    ],
  },
  vermilion_bird: {
    victory: [
      '작열하는 불꽃이 어둠을 태웠어요! 계속해서 전진해요, 용사님.',
      '불사조의 날개 아래 승리가 깃들었습니다. 당신은 진정 눈부셔요.',
      '잿더미 속에서 새로운 희망이 피어납니다. 참 잘하셨어요!',
    ],
    lowHp: [
      '상처를 태우는 불사조의 숨결을 받으세요! 절대 쓰러지지 말아요!',
      '제 깃털로 감싸 드릴게요. 불꽃은 꺼지지 않고 다시 타오를 거예요!',
      '포기하지 마세요, 제가 당신의 심장을 뛰게 만들 테니까요!',
    ],
    levelUp: [
      '불꽃의 날개가 더욱 영롱해졌어요. 용사님과의 온기가 느껴져요!',
      '신성한 화염의 정수가 차오릅니다. 더 큰 생명력으로 보답할게요.',
    ],
  },
  black_tortoise: {
    victory: [
      '적의 모든 공격은 헛된 물거품이었소. 단단한 방패가 늘 그대 곁에 있을 것이오.',
      '바위처럼 버텨내니 승리가 굴러들어오는구려. 고생 많았소.',
      '어떤 풍파도 우리를 흔들지 못했소. 평온한 마음으로 길을 떠납시다.',
    ],
    lowHp: [
      '물러서지 않아도 되오. 내 등딱지 뒤로 숨으시오, 모든 충격을 삭여내겠소.',
      '버텨내시오! 천년의 거북이 그대의 명줄을 굳건히 잡고 있소.',
      '침착하시오. 껍질이 깨지기 전까진 그대는 결코 죽지 않소.',
    ],
    levelUp: [
      '천년의 세월을 품은 껍질이 더 단단해졌소. 영원토록 그대를 지키리라.',
      '심연의 수맥이 통하였구려. 이제 어떤 거수도 우리를 뚫지 못할 것이오.',
    ],
  },
};

/**
 * Returns lore entry for a divine beast.
 */
export function getPetLore(petId: PetType): PetMythologyLore {
  return PET_MYTHOLOGY_LORE[petId];
}

/**
 * Returns a random situational bark for the active companion pet.
 */
export function getPetBark(
  petId: PetType,
  trigger: 'victory' | 'lowHp' | 'levelUp',
): string {
  const dialogSet = PET_COMBAT_BARKS[petId];
  const list = dialogSet[trigger];
  return list[Math.floor(Math.random() * list.length)];
}
