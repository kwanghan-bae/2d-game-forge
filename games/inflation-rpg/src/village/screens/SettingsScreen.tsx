import { useEffect, useRef, useState } from 'react';
import type { VillageSettings } from '../types';
import type { VillageOnboardingSummary } from '../telemetry';
import { useVillageScreenHeadingFocus } from '../useVillageScreenHeadingFocus';

interface Props {
  settings: VillageSettings;
  onChange: (patch: Partial<VillageSettings>) => void;
  onBack: () => void;
  onRestorePurchases?: () => void | Promise<void>;
  onboardingSummary?: VillageOnboardingSummary;
}

const EMPTY_ONBOARDING_SUMMARY: VillageOnboardingSummary = {
  firstExpeditionSeconds: null,
  distinctDecisionKindsIn30Minutes: 0,
  firstExpeditionWithin15Minutes: false,
  twoDecisionsWithin30Minutes: false,
};

function normalizeVolume(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : 0;
}

export function SettingsScreen({ settings, onChange, onBack, onRestorePurchases, onboardingSummary = EMPTY_ONBOARDING_SUMMARY }: Props) {
  const titleRef = useVillageScreenHeadingFocus();
  const mountedRef = useRef(true);
  const [restorePending, setRestorePending] = useState(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  const music = normalizeVolume(settings.music);
  const sfx = normalizeVolume(settings.sfx);
  const muted = settings.muted === true;

  const restore = async () => {
    if (!onRestorePurchases || restorePending) return;
    setRestorePending(true);
    try {
      await onRestorePurchases();
    } catch {
      // The game hook reports provider failures to the shared status message.
      // Settings must remain usable when an external callback rejects.
    } finally {
      if (mountedRef.current) setRestorePending(false);
    }
  };

  return (
    <main className="village-container">
      <section className="village-panel">
        <div className="village-button-row">
          <button type="button" className="village-btn village-btn--quiet" onClick={onBack}>← 마을로</button>
        </div>
        <h2 ref={titleRef} tabIndex={-1} style={{ marginTop: 12 }}>설정</h2>
        <p>한국어 · 로컬 저장 · 현재 게임 전용 설정입니다.</p>
      </section>

      <section className="village-panel">
        <h2>소리</h2>
        <label className="village-setting-row" htmlFor="village-music-volume">
          <span>음악 볼륨 <strong>{Math.round(music * 100)}%</strong></span>
          <input
            id="village-music-volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={music}
            aria-label="음악 볼륨"
            onChange={(event) => onChange({ music: Number(event.target.value) })}
          />
        </label>
        <label className="village-setting-row" htmlFor="village-sfx-volume">
          <span>효과음 볼륨 <strong>{Math.round(sfx * 100)}%</strong></span>
          <input
            id="village-sfx-volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={sfx}
            aria-label="효과음 볼륨"
            onChange={(event) => onChange({ sfx: Number(event.target.value) })}
          />
        </label>
        <label className="village-setting-toggle" htmlFor="village-muted">
          <input id="village-muted" type="checkbox" checked={muted} aria-label="모든 소리 음소거" onChange={(event) => onChange({ muted: event.target.checked })} />
          <span>모든 소리 음소거</span>
        </label>
      </section>

      <section className="village-panel">
        <h2>저장 안내</h2>
        <p>이 기기의 현재 게임 저장만 자동으로 기록하고 읽습니다.</p>
        <div className="village-alert">현재 게임 전용 저장</div>
      </section>

      <section className="village-panel" aria-labelledby="village-local-launch-diagnostics">
        <h2 id="village-local-launch-diagnostics">로컬 출시 진단</h2>
        <p>진단 데이터는 이 기기에만 저장되며 외부로 전송되지 않습니다.</p>
        <dl>
          <div className="village-setting-row">
            <dt>첫 원정까지</dt>
            <dd>{onboardingSummary.firstExpeditionSeconds === null ? '미기록' : `${Math.max(0, Math.round(onboardingSummary.firstExpeditionSeconds))}초`}</dd>
          </div>
          <div className="village-setting-row">
            <dt>30분 내 서로 다른 결정</dt>
            <dd>{onboardingSummary.distinctDecisionKindsIn30Minutes}종</dd>
          </div>
          <div className="village-setting-row">
            <dt>15분 내 첫 원정</dt>
            <dd>{onboardingSummary.firstExpeditionWithin15Minutes ? '달성' : '미달성'}</dd>
          </div>
          <div className="village-setting-row">
            <dt>30분 내 2종 결정</dt>
            <dd>{onboardingSummary.twoDecisionsWithin30Minutes ? '달성' : '미달성'}</dd>
          </div>
        </dl>
      </section>

      {onRestorePurchases && <section className="village-panel">
        <h2>구매 복원</h2>
        <p>기기를 바꾸거나 앱을 다시 설치했다면 이전에 구매한 광고 제거 혜택을 복원할 수 있습니다.</p>
        <button type="button" className="village-btn village-btn--quiet" disabled={restorePending} onClick={() => { void restore(); }}>
          {restorePending ? '구매 복원 중' : '구매 복원'}
        </button>
      </section>}
    </main>
  );
}
