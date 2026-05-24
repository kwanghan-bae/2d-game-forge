import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { matchesFilter, SagaBookModal, FILTER_LABEL_KR } from '../SagaBookModal';

describe('Cycle 1 F3 — SagaBookModal matchesFilter npc 매핑 확장', () => {
  it('F3.12: matchesFilter("npc", ...) 가 NPC event 4 종 + 기존 매핑 포함', () => {
    // Cycle-1 F3 신규 — npc dead-path 회수 (camelCase SagaEventType)
    expect(matchesFilter('npcEncounter', 'npc')).toBe(true);
    expect(matchesFilter('npcDeath', 'npc')).toBe(true);
    expect(matchesFilter('familyEvent', 'npc')).toBe(true);
    // 기존 매핑 회귀 가드
    expect(matchesFilter('moralChoice', 'npc')).toBe(true);
    expect(matchesFilter('shrine', 'npc')).toBe(true);
  });

  it('F3.12b: matchesFilter("npc", ...) 가 무관한 type 은 false', () => {
    expect(matchesFilter('battle', 'npc')).toBe(false);
    expect(matchesFilter('levelUp', 'npc')).toBe(false);
    expect(matchesFilter('drop', 'npc')).toBe(false);
    expect(matchesFilter('realmEnter', 'npc')).toBe(false);
    expect(matchesFilter('seasonChange', 'npc')).toBe(false);
  });

  it('all filter 회귀: 어떤 type 이든 true', () => {
    expect(matchesFilter('npcEncounter', 'all')).toBe(true);
    expect(matchesFilter('realmEnter', 'all')).toBe(true);
    expect(matchesFilter('battle', 'all')).toBe(true);
  });
});

describe('Cycle 4 B3 — SagaBookModal 필터 칩 한글화', () => {
  it('FILTER_LABEL_KR 가 11 필터 모두 한글 label 보유', () => {
    const ids = ['all', 'battle', 'drop', 'levelUp', 'realm', 'npc', 'rejuv', 'sightseeing', 'meditation', 'trial', 'season'] as const;
    for (const id of ids) {
      // 한글 한 글자 이상 + 영어 alpha 0 자
      const label = FILTER_LABEL_KR[id];
      expect(label).toMatch(/^[가-힣]+$/);
    }
  });

  it('모달 진입 시 11 필터 칩 모두 한글 label 렌더', () => {
    render(<SagaBookModal onClose={() => {}} />);
    expect(screen.getByText('전체')).toBeInTheDocument();
    expect(screen.getByText('전투')).toBeInTheDocument();
    expect(screen.getByText('획득')).toBeInTheDocument();
    expect(screen.getByText('성장')).toBeInTheDocument();
    expect(screen.getByText('영지')).toBeInTheDocument();
    expect(screen.getByText('인연')).toBeInTheDocument();
    expect(screen.getByText('회춘')).toBeInTheDocument();
    expect(screen.getByText('명소')).toBeInTheDocument();
    expect(screen.getByText('명상')).toBeInTheDocument();
    expect(screen.getByText('시련')).toBeInTheDocument();
    expect(screen.getByText('계절')).toBeInTheDocument();
  });

  it('영어 internal id 는 label 로 렌더되지 않음', () => {
    render(<SagaBookModal onClose={() => {}} />);
    // testid 는 영어 그대로지만 visible text 에는 영어 토큰이 없어야 함
    expect(screen.queryByText('battle')).toBeNull();
    expect(screen.queryByText('drop')).toBeNull();
    expect(screen.queryByText('levelUp')).toBeNull();
    expect(screen.queryByText('rejuv')).toBeNull();
  });
});
