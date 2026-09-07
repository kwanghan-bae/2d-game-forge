import type { V4Settings } from '../types';

interface Props {
  settings: V4Settings;
  onChange: (patch: Partial<V4Settings>) => void;
  onBack: () => void;
  onRestorePurchases?: () => void;
}

export function SettingsScreen({ settings, onChange, onBack, onRestorePurchases }: Props) {
  return (
    <main className="v4-container">
      <section className="v4-panel">
        <div className="v4-button-row">
          <button type="button" className="v4-btn v4-btn--quiet" onClick={onBack}>← 마을로</button>
        </div>
        <h2 style={{ marginTop: 12 }}>설정</h2>
        <p>한국어 · 로컬 저장 · V3 Legacy 저장과 분리된 V4 설정입니다.</p>
      </section>

      <section className="v4-panel">
        <h2>소리</h2>
        <label className="v4-setting-row" htmlFor="v4-music-volume">
          <span>음악 볼륨 <strong>{Math.round(settings.music * 100)}%</strong></span>
          <input
            id="v4-music-volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.music}
            aria-label="음악 볼륨"
            onChange={(event) => onChange({ music: Number(event.target.value) })}
          />
        </label>
        <label className="v4-setting-row" htmlFor="v4-sfx-volume">
          <span>효과음 볼륨 <strong>{Math.round(settings.sfx * 100)}%</strong></span>
          <input
            id="v4-sfx-volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.sfx}
            aria-label="효과음 볼륨"
            onChange={(event) => onChange({ sfx: Number(event.target.value) })}
          />
        </label>
        <label className="v4-setting-toggle" htmlFor="v4-muted">
          <input id="v4-muted" type="checkbox" checked={settings.muted} aria-label="모든 소리 음소거" onChange={(event) => onChange({ muted: event.target.checked })} />
          <span>모든 소리 음소거</span>
        </label>
      </section>

      <section className="v4-panel">
        <h2>저장 안내</h2>
        <p>이 기기의 V4 저장은 자동으로 기록됩니다. V3 Legacy 기록은 명시적으로 가져오기를 선택하기 전까지 변경되지 않습니다.</p>
        <div className="v4-alert">V4 전용 저장</div>
      </section>

      {onRestorePurchases && <section className="v4-panel">
        <h2>구매 복원</h2>
        <p>기기를 바꾸거나 앱을 다시 설치했다면 이전에 구매한 광고 제거 혜택을 복원할 수 있습니다.</p>
        <button type="button" className="v4-btn v4-btn--quiet" onClick={onRestorePurchases}>구매 복원</button>
      </section>}
    </main>
  );
}
