import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SagaScreen } from '../screens/SagaScreen';
import { createInitialVillageSave } from '../save';
import { getRealmVictoryEntry } from '../story';
import type { SagaEntry } from '../types';

describe('Village saga screen', () => {
  it('moves focus to the saga heading when the screen opens', () => {
    render(<SagaScreen entries={[]} storyChoice={null} onChooseStoryChoice={vi.fn()} onBack={vi.fn()} />);

    expect(screen.getByRole('heading', { name: '영원의 사가' })).toHaveFocus();
  });

  it('keeps the saga readable when an in-memory entry has malformed text fields', () => {
    const malformed = {
      id: 'saga-malformed',
      kind: 'milestone',
      createdAt: Date.now(),
      title: { unexpected: true },
      text: ['unexpected'],
    } as unknown as SagaEntry;

    expect(() => render(<SagaScreen entries={[malformed]} storyChoice={null} onChooseStoryChoice={vi.fn()} onBack={vi.fn()} />)).not.toThrow();
    expect(screen.getByText('기록 확인 필요')).toBeInTheDocument();
    expect(screen.getByText('내용을 확인할 수 없습니다.')).toBeInTheDocument();
  });

  it('shows both deep forest choices and sends only the selected option', () => {
    const save = createInitialVillageSave(403);
    const choice = {
      id: 'deep_forest_embers' as const,
      title: '흑송 산군의 불씨',
      prompt: '숲의 불씨를 어떻게 마을로 가져올까요?',
      options: [
        { id: 'protect_flame' as const, title: '불씨를 지킨다', text: '월령의 축원을 따른다.' },
        { id: 'release_goblin' as const, title: '도깨비를 놓아준다', text: '솔바람에게 길을 맡긴다.' },
      ],
    };
    const onChoose = vi.fn();

    render(<SagaScreen
      entries={[getRealmVictoryEntry('deep_forest', save.run.hero.name, save.updatedAt)]}
      storyChoice={choice}
      onChooseStoryChoice={onChoose}
      onBack={vi.fn()}
    />);

    expect(screen.getByRole('heading', { name: '흑송 산군의 불씨' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '불씨를 지킨다' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '도깨비를 놓아준다' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '불씨를 지킨다' }));
    expect(onChoose).toHaveBeenCalledWith('protect_flame');
  });
});
