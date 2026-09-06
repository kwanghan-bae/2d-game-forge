/**
 * astralArchiveLore.ts — C1138: Cosmic Historian Chronicles & Hall of Archives Lore.
 *
 * Chronicles the persona of Metatron the Cosmic Archivist, contextual dialogues,
 * milestone claim proclamations, and the Grand Completion Certificate inscription.
 */

export interface ArchivistGreeting {
  minMilestones: number;
  stageTitle: string;
  dialogue: string;
}

export const ARCHIVIST_GREETINGS: ArchivistGreeting[] = [
  {
    minMilestones: 16,
    stageTitle: '태초의 절대신',
    dialogue:
      '만유의 지배신이시여! 온 우주의 시공간 기록관 메타트론이 당신의 영원한 위업 앞에 무릎을 꿇나이다. 그대의 모든 발자취는 이제 새로운 우주의 불멸한 법칙이 되었습니다.',
  },
  {
    minMilestones: 12,
    stageTitle: '우주의 대영웅',
    dialogue:
      '우주의 위대한 영웅이여! 시련과 회랑을 정복한 그대의 대서사는 이미 천상과 성좌에 길이 남을 찬란한 신화가 되었도다.',
  },
  {
    minMilestones: 6,
    stageTitle: '성간의 개척자',
    dialogue:
      '은하의 소용돌이 속에서 그대의 이름이 점차 울려 퍼지기 시작했도다. 기록관의 서책에 황금빛 문장들이 새겨지고 있으니, 계속해서 전진하라.',
  },
  {
    minMilestones: 0,
    stageTitle: '필멸의 도전자',
    dialogue:
      '필멸자의 발자취가 아직은 미미하구나. 그러나 별빛의 기록관은 침묵 속에서 그대의 작은 도전을 똑똑히 지켜보고 있노라.',
  },
];

/**
 * Returns the archivist dialogue matching current unlocked milestone count.
 */
export function getArchivistDialogue(unlockedCount: number): {
  stageTitle: string;
  dialogue: string;
} {
  const match = ARCHIVIST_GREETINGS.find(g => unlockedCount >= g.minMilestones);
  return {
    stageTitle: match?.stageTitle ?? '필멸의 도전자',
    dialogue: match?.dialogue ?? ARCHIVIST_GREETINGS[ARCHIVIST_GREETINGS.length - 1].dialogue,
  };
}

/**
 * Formats a Hall of Sagas chronicle entry for claiming an archive milestone reward.
 */
export function formatMilestoneClaimChronicle(
  milestoneTitle: string,
  rewardShards: number,
  heroName: string
): string {
  return `[성간 아카이브 전승] ${heroName}이(가) [${milestoneTitle}] 전승을 기록관에 헌정하고 별빛 파편 ${rewardShards}개를 하사받았습니다.`;
}

/**
 * Formats the Grand Archive Certificate upon unlocking all 16 milestones.
 */
export function formatGrandArchiveCompletionCertificate(heroName: string): string {
  return `[성간 아카이브 대원만 전승] 용사 ${heroName}이(가) 성간 아카이브의 16대 우주적 위업을 100% 전원 달성하여 [우주의 기록을 완성한 자 (Archival Sovereign)]로 영원히 봉인되었습니다!`;
}
