import { useCycleStore } from '../cycle/cycleSlice';

interface Props {
  onBackToMenu: () => void;
}

export function CycleResult({ onBackToMenu }: Props) {
  const result = useCycleStore(s => s.result);
  const reset = useCycleStore(s => s.reset);

  if (!result) {
    return <div>결과가 없습니다.</div>;
  }

  const handleBack = () => {
    reset();
    onBackToMenu();
  };

  return (
    <div data-testid="cycle-result" style={{ padding: 16 }}>
      <h2>사이클 종료</h2>
      <div data-testid="result-reason">사유: {result.reason}</div>
      <div data-testid="result-max-level">최대 레벨: {result.maxLevel}</div>
      <div data-testid="result-duration">진행 시간: {(result.durationMs / 1000).toFixed(1)}초</div>
      <div data-testid="result-kills">처치 수: {result.kills.total}</div>
      <h3 style={{ marginTop: 16 }}>레벨 곡선 (inflation)</h3>
      <div style={{ maxHeight: 180, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12 }}>
        {result.levelCurve.map((p, i) => (
          <div key={i}>t={p.t.toString().padStart(6, '0')}ms — LV {p.lv}</div>
        ))}
      </div>
      <button type="button" onClick={handleBack} style={{ marginTop: 16 }}>
        메인 메뉴로
      </button>
    </div>
  );
}
