import { useEffect, useRef } from 'react';
import type { OfflineSummary } from '../types';
import { getV4CurrencyName } from '../data';
import { getV4EquipmentName } from '../equipment';
import { V4_DAILY_REWARDED_LIMIT } from '../monetization';
import { V4_OFFLINE_CAP_MS } from '../save';

interface Props {
  summary: OfflineSummary;
  pendingExpeditionConfirmation?: boolean;
  onClose: () => void;
  onOpenExpedition?: () => void;
  onDoubleReward?: () => void;
  canDoubleReward?: boolean;
  adsToday?: number;
  adFree?: boolean;
}

function safePositiveResource(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  const amount = Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(value)));
  return amount > 0 ? amount : null;
}

const MAX_OFFLINE_DISPLAY_SECONDS = V4_OFFLINE_CAP_MS / 1000;

export function OfflineResultScreen({ summary, pendingExpeditionConfirmation = false, onClose, onOpenExpedition, onDoubleReward, canDoubleReward = true, adsToday = 0, adFree = false }: Props) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const activeElement = document.activeElement;
    openerRef.current = activeElement instanceof HTMLElement ? activeElement : null;
    closeButtonRef.current?.focus();

    return () => {
      const opener = openerRef.current;
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) onClose();
      if (event.key !== 'Tab' || event.defaultPrevented) return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hasAttribute('disabled'));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;
      const isInsideDialog = activeElement instanceof Node && dialog.contains(activeElement);
      if (event.shiftKey && (!isInsideDialog || activeElement === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!isInsideDialog || activeElement === last)) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const processedSeconds = typeof summary.processedSeconds === 'number' && Number.isFinite(summary.processedSeconds)
    ? Math.min(MAX_OFFLINE_DISPLAY_SECONDS, Math.max(0, Math.floor(summary.processedSeconds)))
    : 0;
  const efficiency = typeof summary.efficiency === 'number' && Number.isFinite(summary.efficiency)
    ? Math.min(1, Math.max(0, summary.efficiency))
    : 0;
  const resourcesGained = summary.resourcesGained
    && typeof summary.resourcesGained === 'object'
    && !Array.isArray(summary.resourcesGained)
    ? summary.resourcesGained
    : {};
  const completedTaskIds = Array.isArray(summary.completedTaskIds) ? summary.completedTaskIds : [];
  const equipmentGained = Array.isArray(summary.equipmentGained)
    ? summary.equipmentGained.filter((id): id is string => typeof id === 'string')
    : [];
  const equipmentUpgraded = Array.isArray(summary.equipmentUpgraded)
    ? summary.equipmentUpgraded.filter((id): id is string => typeof id === 'string')
    : [];
  const notes = Array.isArray(summary.notes) ? summary.notes : [];
  const resourceEntries = Object.entries(resourcesGained).flatMap(([key, value]) => {
    const amount = safePositiveResource(value);
    return amount === null ? [] : [[key, amount] as const];
  });
  const hasPositiveResourceReward = resourceEntries.length > 0;

  return (
    <div className="v4-overlay" role="dialog" aria-modal="true" aria-labelledby="v4-offline-result-title">
      <section ref={dialogRef} className="v4-modal" data-testid="v4-offline-result">
        <div className="v4-kicker">돌아온 후원자</div>
        <h2 id="v4-offline-result-title">마을이 당신을 기다렸습니다</h2>
        <p>{Math.floor(processedSeconds / 3600)}시간 {Math.floor((processedSeconds % 3600) / 60)}분 동안 안전한 작업을 정산했습니다. 효율 {Math.round(efficiency * 100)}%</p>
        {summary.wasClamped && <div className="v4-alert">오프라인 보상은 최대 8시간까지만 계산했습니다.</div>}
        {summary.clockAnomaly === 'backwards' && <div className="v4-alert">기기 시간이 이전 처리 시각보다 빠릅니다. 중복 보상을 막았습니다.</div>}
        {summary.clockAnomaly === 'future' && <div className="v4-alert">저장 시각이 현재보다 미래입니다. 기기 시간을 확인해 주세요.</div>}
        {summary.clockAnomaly === 'invalid' && <div className="v4-alert">기기 시각을 확인할 수 없어 보상을 정산하지 않았습니다.</div>}
        {summary.clockAnomaly === null && notes
          .filter((note) => typeof note === 'string' && note.trim().length > 0)
          .map((note, index) => <div className="v4-alert" key={`${note}-${index}`}>{note}</div>)}
        <div className="v4-detail-grid">
          {resourceEntries.length > 0
            ? resourceEntries.map(([key, value]) => <div className="v4-detail-stat" key={key}><small>{getV4CurrencyName(key)}</small><strong>+{value.toLocaleString('ko-KR')}</strong></div>)
            : <div className="v4-detail-stat"><small>정산</small><strong>획득 재화 없음</strong></div>}
        </div>
        {equipmentGained.length > 0 && <div className="v4-alert">장비 획득 · {equipmentGained.map(getV4EquipmentName).join(', ')}</div>}
        {equipmentUpgraded.length > 0 && <div className="v4-alert">장비 강화 · {equipmentUpgraded.map(getV4EquipmentName).join(', ')}</div>}
        <p>{completedTaskIds.length}개 작업 완료 · {summary.completedExpedition
          ? '원정 귀환 완료 · 원정 화면에서 결과를 확인하세요.'
            : pendingExpeditionConfirmation
            ? '위험 원정 결과 확인 필요 · 원정 화면에서 결과를 확인하세요.'
            : '선택형 사건은 보류됨'}</p>
        {onDoubleReward && <button type="button" className="v4-btn v4-btn--quiet" disabled={!hasPositiveResourceReward || !canDoubleReward || (!adFree && adsToday >= V4_DAILY_REWARDED_LIMIT)} onClick={onDoubleReward}>
          {!hasPositiveResourceReward ? '이번 정산은 2배 대상 없음' : !canDoubleReward ? '보상 2배 적용 완료' : !adFree && adsToday >= V4_DAILY_REWARDED_LIMIT ? '오늘 광고 한도 도달' : adFree ? '광고 제거 적용 · 오프라인 재화 2배' : '광고 보고 오프라인 재화 2배'}
        </button>}
        {onOpenExpedition && (summary.completedExpedition || pendingExpeditionConfirmation) && <button type="button" className="v4-btn v4-btn--quiet" onClick={() => { onOpenExpedition(); onClose(); }}>
          원정 결과 보기
        </button>}
        <button ref={closeButtonRef} type="button" className="v4-btn v4-btn--primary" onClick={onClose}>마을 확인</button>
      </section>
    </div>
  );
}
