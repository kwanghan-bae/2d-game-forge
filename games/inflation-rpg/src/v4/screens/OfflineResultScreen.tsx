import { useEffect, useRef } from 'react';
import type { OfflineSummary } from '../types';
import { getV4CurrencyName } from '../data';
import { getV4EquipmentName } from '../equipment';
import { V4_DAILY_REWARDED_LIMIT } from '../monetization';

interface Props {
  summary: OfflineSummary;
  pendingExpeditionConfirmation?: boolean;
  onClose: () => void;
  onDoubleReward?: () => void;
  canDoubleReward?: boolean;
  adsToday?: number;
  adFree?: boolean;
}

export function OfflineResultScreen({ summary, pendingExpeditionConfirmation = false, onClose, onDoubleReward, canDoubleReward = true, adsToday = 0, adFree = false }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const processedSeconds = typeof summary.processedSeconds === 'number' && Number.isFinite(summary.processedSeconds)
    ? Math.max(0, summary.processedSeconds)
    : 0;
  const efficiency = typeof summary.efficiency === 'number' && Number.isFinite(summary.efficiency)
    ? Math.min(1, Math.max(0, summary.efficiency))
    : 0;
  const resourceEntries = Object.entries(summary.resourcesGained)
    .filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value > 0);
  const hasPositiveResourceReward = resourceEntries.some(([, value]) => Number.isFinite(value) && value > 0);

  return (
    <div className="v4-overlay" role="dialog" aria-modal="true" aria-labelledby="v4-offline-result-title">
      <section className="v4-modal" data-testid="v4-offline-result">
        <div className="v4-kicker">돌아온 후원자</div>
        <h2 id="v4-offline-result-title">마을이 당신을 기다렸습니다</h2>
        <p>{Math.floor(processedSeconds / 3600)}시간 {Math.floor((processedSeconds % 3600) / 60)}분 동안 안전한 작업을 정산했습니다. 효율 {Math.round(efficiency * 100)}%</p>
        {summary.wasClamped && <div className="v4-alert">오프라인 보상은 최대 8시간까지만 계산했습니다.</div>}
        {summary.clockAnomaly === 'backwards' && <div className="v4-alert">기기 시간이 이전 처리 시각보다 빠릅니다. 중복 보상을 막았습니다.</div>}
        {summary.clockAnomaly === 'future' && <div className="v4-alert">저장 시각이 현재보다 미래입니다. 기기 시간을 확인해 주세요.</div>}
        {summary.clockAnomaly === 'invalid' && <div className="v4-alert">기기 시각을 확인할 수 없어 보상을 정산하지 않았습니다.</div>}
        <div className="v4-detail-grid">
          {resourceEntries.length > 0
            ? resourceEntries.map(([key, value]) => <div className="v4-detail-stat" key={key}><small>{getV4CurrencyName(key)}</small><strong>+{value.toLocaleString('ko-KR')}</strong></div>)
            : <div className="v4-detail-stat"><small>정산</small><strong>획득 재화 없음</strong></div>}
        </div>
        {summary.equipmentGained.length > 0 && <div className="v4-alert">장비 획득 · {summary.equipmentGained.map(getV4EquipmentName).join(', ')}</div>}
        <p>{summary.completedTaskIds.length}개 작업 완료 · {summary.completedExpedition
          ? '원정 귀환 완료 · 다음 Realm 해금은 원정 화면에서 확인'
          : pendingExpeditionConfirmation
            ? '위험 원정 결과 확인 필요 · 원정 화면에서 보스 결과를 확인하세요.'
            : '선택형 사건은 보류됨'}</p>
        {onDoubleReward && <button type="button" className="v4-btn v4-btn--quiet" disabled={!hasPositiveResourceReward || !canDoubleReward || (!adFree && adsToday >= V4_DAILY_REWARDED_LIMIT)} onClick={onDoubleReward}>
          {!hasPositiveResourceReward ? '이번 정산은 2배 대상 없음' : !canDoubleReward ? '보상 2배 적용 완료' : !adFree && adsToday >= V4_DAILY_REWARDED_LIMIT ? '오늘 광고 한도 도달' : adFree ? '광고 제거 적용 · 오프라인 재화 2배' : '광고 보고 오프라인 재화 2배'}
        </button>}
        <button ref={closeButtonRef} type="button" className="v4-btn v4-btn--primary" onClick={onClose}>마을 확인</button>
      </section>
    </div>
  );
}
