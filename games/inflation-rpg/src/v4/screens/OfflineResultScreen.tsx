import type { OfflineSummary } from '../types';

interface Props { summary: OfflineSummary; onClose: () => void; }

export function OfflineResultScreen({ summary, onClose }: Props) {
  return (
    <div className="v4-overlay" role="dialog" aria-modal="true" aria-label="오프라인 결과">
      <section className="v4-modal" data-testid="v4-offline-result">
        <div className="v4-kicker">돌아온 후원자</div>
        <h2>마을이 당신을 기다렸습니다</h2>
        <p>{Math.floor(summary.processedSeconds / 3600)}시간 {Math.floor((summary.processedSeconds % 3600) / 60)}분 동안 안전한 작업을 정산했습니다. 효율 {Math.round(summary.efficiency * 100)}%</p>
        {summary.wasClamped && <div className="v4-alert">오프라인 보상은 최대 8시간까지만 계산했습니다.</div>}
        {summary.clockAnomaly && <div className="v4-alert">기기 시간이 이전 처리 시각과 달라 중복 보상을 막았습니다.</div>}
        <div className="v4-detail-grid">
          {Object.entries(summary.resourcesGained).map(([key, value]) => <div className="v4-detail-stat" key={key}><small>{key}</small><strong>{value && value > 0 ? `+${value.toLocaleString('ko-KR')}` : value?.toLocaleString('ko-KR')}</strong></div>)}
        </div>
        <p>{summary.completedTaskIds.length}개 작업 완료 · {summary.completedExpedition ? '원정 귀환 완료' : '선택형 사건은 보류됨'}</p>
        <button type="button" className="v4-btn v4-btn--primary" onClick={onClose}>마을 확인</button>
      </section>
    </div>
  );
}
