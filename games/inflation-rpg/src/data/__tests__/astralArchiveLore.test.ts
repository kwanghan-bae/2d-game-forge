/**
 * astralArchiveLore.test.ts — C1138: Narrative unit tests for Astral Archive Lore.
 */

import { describe, it, expect } from 'vitest';
import {
  ARCHIVIST_GREETINGS,
  getArchivistDialogue,
  formatMilestoneClaimChronicle,
  formatGrandArchiveCompletionCertificate,
} from '../astralArchiveLore';

describe('C1138: Astral Archive Lore Tests', () => {
  it('contains dialogue tiers covering novice to grand sovereign', () => {
    expect(ARCHIVIST_GREETINGS.length).toBe(4);

    for (const g of ARCHIVIST_GREETINGS) {
      expect(g.stageTitle.length).toBeGreaterThan(0);
      expect(g.dialogue.length).toBeGreaterThan(0);
      expect(g.minMilestones).toBeGreaterThanOrEqual(0);
    }
  });

  it('selects appropriate dialogue based on milestone progress', () => {
    const d0 = getArchivistDialogue(0);
    expect(d0.stageTitle).toBe('필멸의 도전자');
    expect(d0.dialogue).toContain('발자취가 아직은 미미하구나');

    const d8 = getArchivistDialogue(8);
    expect(d8.stageTitle).toBe('성간의 개척자');
    expect(d8.dialogue).toContain('은하의 소용돌이');

    const d14 = getArchivistDialogue(14);
    expect(d14.stageTitle).toBe('우주의 대영웅');
    expect(d14.dialogue).toContain('찬란한 신화');

    const d16 = getArchivistDialogue(16);
    expect(d16.stageTitle).toBe('태초의 절대신');
    expect(d16.dialogue).toContain('만유의 지배신');
  });

  it('formats milestone claim chronicle string accurately', () => {
    const chronicle = formatMilestoneClaimChronicle('승천의 군주', 250, '아스트랄 용사');
    expect(chronicle).toContain('[성간 아카이브 전승]');
    expect(chronicle).toContain('아스트랄 용사');
    expect(chronicle).toContain('승천의 군주');
    expect(chronicle).toContain('250개');
  });

  it('formats grand completion certificate correctly', () => {
    const cert = formatGrandArchiveCompletionCertificate('궁극의 승천자');
    expect(cert).toContain('[성간 아카이브 대원만 전승]');
    expect(cert).toContain('궁극의 승천자');
    expect(cert).toContain('16대 우주적 위업');
    expect(cert).toContain('우주의 기록을 완성한 자 (Archival Sovereign)');
  });
});
