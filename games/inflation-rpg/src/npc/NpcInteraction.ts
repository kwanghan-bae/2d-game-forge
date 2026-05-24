import type { NpcEntity } from '../types';
import type { PersonalitySnapshot } from '../hero/PersonalityState';
import { josa } from '../utils/josa';

export type NpcOutcomeKind =
  | 'duel' | 'cooperate' | 'evade'
  | 'skill_taught' | 'ordinary'
  | 'talk' | 'help' | 'farewell'
  | 'family_meal' | 'family_milestone';

export interface NpcOutcome {
  outcome: NpcOutcomeKind;
  narrativeKR: string;
  relationshipDelta: number;
}

export function computeNpcOutcome(npc: NpcEntity, personality: PersonalitySnapshot): NpcOutcome {
  const n = npc.nameKR;
  switch (npc.kind) {
    case 'rival': {
      if (personality.heroic >= 3 || personality.moral <= -3) {
        return { outcome: 'duel', narrativeKR: `${josa(n, '과와')} 결투했다`, relationshipDelta: -10 };
      }
      if (personality.merciful >= 3) {
        return { outcome: 'cooperate', narrativeKR: `${josa(n, '과와')} 잠시 협력했다`, relationshipDelta: 10 };
      }
      if (personality.prudent >= 3) {
        return { outcome: 'evade', narrativeKR: `${josa(n, '을를')} 회피했다`, relationshipDelta: -2 };
      }
      return { outcome: 'duel', narrativeKR: `${josa(n, '과와')} 만났다`, relationshipDelta: 0 };
    }
    case 'mentor': {
      if (personality.pious >= 3) {
        return { outcome: 'skill_taught', narrativeKR: `${josa(n, '이가')} 새 기술을 전수했다`, relationshipDelta: 15 };
      }
      return { outcome: 'ordinary', narrativeKR: `${josa(n, '과와')} 잠시 대화했다`, relationshipDelta: 3 };
    }
    case 'friend':
    case 'family_spouse': {
      if (personality.heroic >= 3) {
        return { outcome: 'help', narrativeKR: `${josa(n, '을를')} 도왔다`, relationshipDelta: 8 };
      }
      return { outcome: 'talk', narrativeKR: `${josa(n, '과와')} 잡담했다`, relationshipDelta: 3 };
    }
    case 'family_parent':
    case 'family_child': {
      return { outcome: 'family_meal', narrativeKR: `${josa(n, '과와')} 식사했다`, relationshipDelta: 5 };
    }
    default:
      return { outcome: 'talk', narrativeKR: `${josa(n, '과와')} 만났다`, relationshipDelta: 0 };
  }
}
