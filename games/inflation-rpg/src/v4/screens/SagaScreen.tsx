import type { SagaEntry } from '../types';

interface Props { entries: SagaEntry[]; onBack: () => void; }

export function SagaScreen({ entries, onBack }: Props) {
  return (
    <main className="v4-container">
      <section className="v4-panel"><button type="button" className="v4-btn v4-btn--quiet" onClick={onBack}>← 마을로</button><h2 style={{ marginTop: 12 }}>영원의 사가</h2><p>영웅의 선택과 마을의 변화를 기록합니다.</p></section>
      <section className="v4-panel">
        {entries.length === 0 ? <p>아직 기록된 사건이 없습니다.</p> : entries.map((entry) => <article className="v4-saga-item" key={entry.id}><div className="v4-saga-title">{entry.title}</div><div className="v4-saga-text">{entry.text}</div></article>)}
      </section>
    </main>
  );
}
