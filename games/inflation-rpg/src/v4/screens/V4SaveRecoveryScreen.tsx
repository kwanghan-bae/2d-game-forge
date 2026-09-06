import type { V4SaveLoadResult } from '../save';

interface Props {
  reason: Extract<V4SaveLoadResult, { status: 'invalid' }>['reason'];
  onStartFresh: () => void;
}

const REASON_COPY = {
  malformed_json: '저장 파일을 읽을 수 없습니다. 파일 형식이 손상되었을 수 있습니다.',
  invalid_schema: '저장 데이터의 구조 검증에 실패했습니다. 지원하지 않는 V4 저장일 수 있습니다.',
} as const;

export function V4SaveRecoveryScreen({ reason, onStartFresh }: Props) {
  return (
    <main className="v4-container" data-testid="v4-save-recovery">
      <section className="v4-panel v4-recovery-panel">
        <div className="v4-kicker">저장 복구 필요</div>
        <h2>V4 저장을 확인할 수 없습니다</h2>
        <p>{REASON_COPY[reason]}</p>
        <div className="v4-alert">
          기존 저장을 덮어쓰지 않았습니다. 새 저장을 시작하기 전까지 원본 데이터는 그대로 보존됩니다.
        </div>
        <div className="v4-button-row">
          <button type="button" className="v4-btn v4-btn--primary" onClick={onStartFresh}>
            새 V4 저장 시작
          </button>
        </div>
      </section>
    </main>
  );
}
