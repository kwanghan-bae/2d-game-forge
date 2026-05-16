interface AdFreeIndicatorProps {
  visible: boolean;
}

export function AdFreeIndicator({ visible }: AdFreeIndicatorProps) {
  if (!visible) return null;
  return (
    <div
      role="status"
      aria-label="광고가 제거되었습니다"
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        padding: '4px 8px',
        borderRadius: 6,
        background: 'rgba(212, 169, 81, 0.2)',
        color: 'var(--forge-accent, #d4a951)',
        fontSize: 12,
        fontWeight: 700,
        zIndex: 10,
      }}
    >
      AD-FREE
    </div>
  );
}
