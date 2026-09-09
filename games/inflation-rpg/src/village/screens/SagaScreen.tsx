import type { SagaEntry, StoryChoiceDefinition, StoryChoiceOptionId } from '../types';
import { useVillageScreenHeadingFocus } from '../useVillageScreenHeadingFocus';

interface Props {
  entries: SagaEntry[];
  storyChoice?: StoryChoiceDefinition | null;
  onChooseStoryChoice?: (choice: StoryChoiceOptionId) => void;
  onBack: () => void;
}

function safeSagaText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function normalizeSagaEntries(entries: SagaEntry[]): Array<{ key: string; title: string; text: string }> {
  if (!Array.isArray(entries)) return [];
  return entries.flatMap((entry, index) => {
    if (!entry || typeof entry !== 'object') return [];
    const id = typeof entry.id === 'string' && entry.id.trim().length > 0
      ? entry.id.trim()
      : `saga-entry-${index}`;
    return [{
      key: `${id}-${index}`,
      title: safeSagaText(entry.title, '기록 확인 필요'),
      text: safeSagaText(entry.text, '내용을 확인할 수 없습니다.'),
    }];
  });
}

export function SagaScreen({ entries, storyChoice = null, onChooseStoryChoice, onBack }: Props) {
  const titleRef = useVillageScreenHeadingFocus();
  const safeEntries = normalizeSagaEntries(entries);

  return (
    <main className="village-container">
      <section className="village-panel"><button type="button" className="village-btn village-btn--quiet" onClick={onBack}>← 마을로</button><h2 ref={titleRef} tabIndex={-1} style={{ marginTop: 12 }}>영원의 사가</h2><p>영웅의 선택과 마을의 변화를 기록합니다.</p></section>
      {storyChoice && <section className="village-panel" aria-labelledby="village-story-choice-title">
        <h2 id="village-story-choice-title">{storyChoice.title}</h2>
        <p>{storyChoice.prompt}</p>
        <div className="village-button-row">
          {storyChoice.options.map((option) => <button
            type="button"
            className="village-btn village-btn--primary"
            key={option.id}
            onClick={() => onChooseStoryChoice?.(option.id)}
          >
            {option.title}
          </button>)}
        </div>
        <p className="village-muted">한 번 선택하면 되돌릴 수 없습니다. 선택 후 저승의 기록이 열립니다.</p>
      </section>}
      <section className="village-panel">
        {safeEntries.length === 0 ? <p>아직 기록된 사건이 없습니다.</p> : safeEntries.map((entry) => <article className="village-saga-item" key={entry.key}><div className="village-saga-title">{entry.title}</div><div className="village-saga-text">{entry.text}</div></article>)}
      </section>
    </main>
  );
}
