import { useEffect, useState } from 'react';

const REMOTE_URL = 'https://kwanghan-bae.github.io/2d-game-forge/privacy-policy/ko/';
const FALLBACK_URL = '/privacy-policy.html';

interface PrivacyScreenProps {
  onBack: () => void;
}

export function PrivacyScreen({ onBack }: PrivacyScreenProps) {
  const [src, setSrc] = useState(REMOTE_URL);

  useEffect(() => {
    let cancelled = false;
    fetch(REMOTE_URL, { method: 'HEAD', mode: 'no-cors' })
      .catch(() => {
        if (!cancelled) setSrc(FALLBACK_URL);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
        <button onClick={onBack} style={{ minWidth: 44, minHeight: 44 }}>←</button>
        <h2 style={{ margin: 0 }}>개인정보처리방침</h2>
      </header>
      <iframe
        src={src}
        title="개인정보처리방침"
        style={{ flex: 1, border: 0 }}
        onError={() => setSrc(FALLBACK_URL)}
      />
    </div>
  );
}
