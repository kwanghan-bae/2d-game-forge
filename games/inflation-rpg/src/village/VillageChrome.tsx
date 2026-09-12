import type { CSSProperties, ReactNode } from 'react';
import type { StartGameConfig } from '../types';
import { getVillagePolicyName } from './data';
import { PRODUCT_GENRE, PRODUCT_TITLE, VILLAGE_GUARDIAN_SHEET_FILENAME, VILLAGE_TITLE_BACKGROUND_FILENAME } from './identity';
import type { VillageCurrencyKey, VillagePolicy } from './types';

export type VillageScreen = 'town' | 'hero' | 'expedition' | 'saga' | 'settings';

const RESOURCES: readonly [VillageCurrencyKey, string, string][] = [
  ['spirit', '신력', '✨'],
  ['gold', '금화', '🪙'],
  ['materials', '재료', '🧱'],
  ['rift', '균열석', '🪨'],
];

function formatHeaderResource(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '0';
  return Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(value))).toLocaleString('ko-KR');
}

interface VillageFrameProps {
  config: StartGameConfig;
  children: ReactNode;
}

export function VillageFrame({ config, children }: VillageFrameProps) {
  return (
    <div
      className="village-shell"
      data-assets-base={config.assetsBasePath}
      data-testid="village-app"
      style={{
        '--village-world-bg': `url(${config.assetsBasePath}/images/${VILLAGE_TITLE_BACKGROUND_FILENAME})`,
        '--village-hero-sprite': `url(${config.assetsBasePath}/images/${VILLAGE_GUARDIAN_SHEET_FILENAME})`,
      } as CSSProperties}
    >
      {children}
    </div>
  );
}

type VillageHeaderProps =
  | { mode: 'recovery' }
  | { mode: 'normal'; policy: VillagePolicy; onOpenSettings: () => void };

export function VillageHeader(props: VillageHeaderProps) {
  const normalProps = props.mode === 'normal' ? props : null;

  return (
    <header className="village-header">
      <div>
        <div className="village-kicker">{PRODUCT_GENRE}</div>
        <h1 className="village-title">{PRODUCT_TITLE}</h1>
        {normalProps && <p className="village-subtitle">한 명의 영웅, 일곱 시설, 끝나지 않는 사가</p>}
      </div>
      {normalProps && (
        <div className="village-header-actions">
          <div className="village-action">{getVillagePolicyName(normalProps.policy)}</div>
          <button type="button" className="village-btn village-btn--quiet" onClick={normalProps.onOpenSettings}>⚙ 설정</button>
        </div>
      )}
    </header>
  );
}

export function VillageStorageWarning({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="village-alert" role="status" data-testid="village-storage-warning">
      기기 저장을 사용할 수 없습니다. 현재 세션은 진행되지만 앱을 닫으면 진행이 보존되지 않을 수 있습니다.
    </div>
  );
}

export function VillageResourceBar({ currencies }: { currencies: Record<VillageCurrencyKey, number> }) {
  return (
    <div className="village-resource-row" aria-label="보유 재화">
      {RESOURCES.map(([key, label, icon]) => (
        <div className="village-resource" key={key}>
          <span className="village-resource-label">{icon} {label}</span>
          <strong className="village-resource-value">{formatHeaderResource(currencies[key])}</strong>
        </div>
      ))}
    </div>
  );
}

export function VillageMessage({ message, onClose }: { message: string | null; onClose: () => void }) {
  if (!message) return null;
  return (
    <div className="village-alert" role="status">
      <span>{message}</span>
      <button type="button" className="village-btn village-btn--quiet village-alert-close" onClick={onClose}>닫기</button>
    </div>
  );
}

interface VillageNavigationProps {
  screen: VillageScreen;
  onNavigate: (screen: VillageScreen) => void;
}

export function VillageNavigation({ screen, onNavigate }: VillageNavigationProps) {
  const items: readonly [VillageScreen, string][] = [
    ['town', '🏘️ 마을'],
    ['hero', '⚔️ 영웅'],
    ['expedition', '🧭 원정'],
    ['saga', '📜 사가'],
  ];

  return (
    <nav className="village-nav" aria-label="주요 메뉴">
      <div className="village-nav-inner">
        {items.map(([id, label]) => (
          <button
            type="button"
            key={id}
            className={`village-nav-btn ${screen === id ? 'village-nav-btn--active' : ''}`}
            aria-current={screen === id ? 'page' : undefined}
            onClick={() => onNavigate(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
