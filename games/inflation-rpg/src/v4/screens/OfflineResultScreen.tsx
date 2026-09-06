import type { OfflineSummary } from '../types';
import { getV4CurrencyName } from '../data';
import { getV4EquipmentName } from '../equipment';

interface Props {
  summary: OfflineSummary;
  onClose: () => void;
  onDoubleReward?: () => void;
  canDoubleReward?: boolean;
  adsToday?: number;
  adFree?: boolean;
}

export function OfflineResultScreen({ summary, onClose, onDoubleReward, canDoubleReward = true, adsToday = 0, adFree = false }: Props) {
  const resourceEntries = Object.entries(summary.resourcesGained);

  return (
    <div className="v4-overlay" role="dialog" aria-modal="true" aria-label="오프라인 결과">
      <section className="v4-modal" data-testid="v4-offline-result">
        <div className="v4-kicker">돌아온 후원자</div>
        <h2>마을이 당신을 기다렸습니다</h2>
        <p>{Math.floor(summary.processedSeconds / 3600)}시간 {Math.floor((summary.processedSeconds % 3600) / 60)}분 동안 안전한 작업을 정산했습니다. 효율 {Math.round(summary.efficiency * 100)}%</p>
        {summary.wasClamped && <div className="v4-alert">오프라인 보상은 최대 8시간까지만 계산했습니다.</div>}
        {summary.clockAnomaly === 'backwards' && <div className="v4-alert">기기 시간이 이전 처리 시각보다 빠릅니다. 중복 보상을 막았습니다.</div>}
        {summary.clockAnomaly === 'future' && <div className="v4-alert">저장 시각이 현재보다 미래입니다. 기기 시간을 확인해 주세요.</div>}
        {summary.clockAnomaly === 'invalid' && <div className="v4-alert">기기 시각을 확인할 수 없어 보상을 정산하지 않았습니다.</div>}
        <div className="v4-detail-grid">
          {resourceEntries.length > 0
            ? resourceEntries.map(([key, value]) => <div className="v4-detail-stat" key={key}><small>{getV4CurrencyName(key)}</small><strong>{value && value > 0 ? `+${value.toLocaleString('ko-KR')}` : value?.toLocaleString('ko-KR')}</strong></div>)
            : <div className="v4-detail-stat"><small>정산</small><strong>획득 재화 없음</strong></div>}
        </div>
        {summary.equipmentGained.length > 0 && <div className="v4-alert">장비 획득 · {summary.equipmentGained.map(getV4EquipmentName).join(', ')}</div>}
        <p>{summary.completedTaskIds.length}개 작업 완료 · {summary.completedExpedition ? '원정 귀환 완료 · 다음 Realm 해금은 원정 화면에서 확인' : '선택형 사건은 보류됨'}</p>
        {onDoubleReward && <button type="button" className="v4-btn v4-btn--quiet" disabled={!canDoubleReward || (!adFree && adsToday >= 5)} onClick={onDoubleReward}>
          {!canDoubleReward ? '보상 2배 적용 완료' : !adFree && adsToday >= 5 ? '오늘 광고 한도 도달' : adFree ? '광고 제거 적용 · 오프라인 재화 2배' : '광고 보고 오프라인 재화 2배'}
        </button>}
        <button type="button" className="v4-btn v4-btn--primary" onClick={onClose}>마을 확인</button>
      </section>
    </div>
  );
}
