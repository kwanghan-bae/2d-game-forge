import { describe, it, expect } from 'vitest';
import { QUEST_COMPLETE_MESSAGES, getQuestCompleteMessage } from './questMessages';

describe('questMessages', () => {
  it('has at least 5 messages', () => {
    expect(QUEST_COMPLETE_MESSAGES.length).toBeGreaterThanOrEqual(5);
  });

  it('getQuestCompleteMessage returns a string from pool', () => {
    const msg = getQuestCompleteMessage();
    expect(QUEST_COMPLETE_MESSAGES).toContain(msg);
  });
});
