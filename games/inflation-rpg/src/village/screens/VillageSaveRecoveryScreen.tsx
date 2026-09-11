import type { VillageSaveLoadResult } from '../save';
import { useVillageScreenHeadingFocus } from '../useVillageScreenHeadingFocus';

interface Props {
  reason: Extract<VillageSaveLoadResult, { status: 'invalid' }>['reason'];
  onStartFresh: () => void;
}

const REASON_COPY = {
  malformed_json: '저장 파일을 읽을 수 없습니다. 파일 형식이 손상되었을 수 있습니다.',
  invalid_schema: '저장 데이터의 구조 검증에 실패했습니다. 지원하지 않는 현재 게임 저장일 수 있습니다.',
} as const;

export function VillageSaveRecoveryScreen({ reason, onStartFresh }: Props) {
  const titleRef = useVillageScreenHeadingFocus();

  return (
    <main className="village-container" data-testid="village-save-recovery">
      <section className="village-panel village-recovery-panel">
        <div className="village-kicker">저장 복구 필요</div>
        <h2 ref={titleRef} tabIndex={-1}>현재 게임 저장을 확인할 수 없습니다</h2>
        <p>{REASON_COPY[reason]}</p>
        <div className="village-alert">
          기존 저장을 덮어쓰지 않았습니다. 새 저장을 시작하기 전까지 원본 데이터는 그대로 보존됩니다.
        </div>
        <div className="village-button-row">
          <button type="button" className="village-btn village-btn--primary" onClick={onStartFresh}>
            새 현재 게임 저장 시작
          </button>
        </div>
      </section>
    </main>
  );
}
