import { chooseStoryChoice as chooseStoryChoiceEntry } from '../../story';
import type { StoryDomainResult } from '../../story';
import type { StoryChoiceOptionId, VillageSaveEnvelope } from '../../types';

/** Explicitly records the one irreversible story choice before the underworld. */
export function chooseStoryChoice(
  source: VillageSaveEnvelope,
  choice: StoryChoiceOptionId,
  now: number,
): StoryDomainResult {
  return chooseStoryChoiceEntry(source, choice, now);
}
