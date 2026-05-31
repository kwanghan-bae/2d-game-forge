import { useEffect, useState, type ReactNode } from 'react';

export interface TimedChoiceOption {
  id: string;
  label: string;
  sublabel?: string;
  icon: string;
  color: string;
}

interface Props {
  title: string;
  titleIcon: string;
  description: ReactNode;
  subdescription?: string;
  options: TimedChoiceOption[];
  timeoutMs: number;
  defaultOptionId: string;
  accentColor: string;
  onChoose: (optionId: string) => void;
}

/**
 * C879: Generic timed choice modal — reusable for all player decisions.
 * Shows options with countdown timer. Auto-picks default on timeout (idle-friendly).
 */
export function TimedChoiceModal({
  title, titleIcon, description, subdescription,
  options, timeoutMs, defaultOptionId, accentColor, onChoose,
}: Props) {
  const [timeLeft, setTimeLeft] = useState(timeoutMs);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 100) {
          onChoose(defaultOptionId);
          return 0;
        }
        return t - 100;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [onChoose, defaultOptionId]);

  const progress = timeLeft / timeoutMs;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#1a1a2e', border: `2px solid ${accentColor}`, borderRadius: 12,
        padding: 24, maxWidth: 360, width: '90%', textAlign: 'center',
      }}>
        <div style={{ fontSize: 24, marginBottom: 12 }}>{titleIcon} {title}</div>
        <div style={{ color: '#ddd', marginBottom: 8 }}>{description}</div>
        {subdescription && (
          <p style={{ color: '#aaa', fontSize: 12, marginBottom: 16 }}>{subdescription}</p>
        )}
        {/* Timer bar */}
        <div style={{
          height: 4, background: '#333', borderRadius: 2, marginBottom: 16, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', background: accentColor, width: `${progress * 100}%`,
            transition: 'width 0.1s linear',
          }} />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {options.map(opt => (
            <button key={opt.id} onClick={() => onChoose(opt.id)} style={{
              padding: '10px 16px', background: opt.color, border: 'none',
              borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer',
              minWidth: 90, minHeight: 44,
            }}>
              {opt.icon} {opt.label}
              {opt.sublabel && <><br/><span style={{ fontSize: 11, opacity: 0.8 }}>{opt.sublabel}</span></>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
