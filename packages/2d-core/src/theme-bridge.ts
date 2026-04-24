// packages/2d-core/src/theme-bridge.ts
import type { ForgeCSSTokens } from './ui-tokens';

/**
 * Read a CSS custom property from :root and parse as 0xRRGGBB.
 * Phaser Graphics / Text 객체의 fillColor / color 속성에 바로 주입 가능.
 * Client-only — Phaser Scene.create() 시점에서만 호출.
 *
 * 제약: CSS 변수 값은 6자리 hex (#RRGGBB) 전제.
 *       3자리 hex / rgb() / hsl() 등은 지원하지 않는다.
 *       토큰 테마 CSS 작성 시 이 제약을 준수해야 한다.
 */
export function readForgeToken(name: keyof ForgeCSSTokens): number {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return parseInt(raw.replace('#', ''), 16);
}

/**
 * Phaser Scene 에서 소비할 토큰 묶음.
 * 키는 스텟 심볼 (bg/panel/hp 등) 이며, 값은 0xRRGGBB number.
 */
export interface ForgeThemeBridge {
  bg: number;       // --forge-bg-base
  panel: number;    // --forge-bg-panel
  card: number;     // --forge-bg-card
  border: number;   // --forge-border
  accent: number;   // --forge-accent
  text: number;     // --forge-text-primary
  hp: number;       // --forge-stat-hp
  atk: number;      // --forge-stat-atk
  def: number;      // --forge-stat-def
  agi: number;      // --forge-stat-agi
  luc: number;      // --forge-stat-luc
  bp: number;       // --forge-stat-bp
  danger: number;   // --forge-danger
}

/**
 * 편의 팩토리: Phaser Scene 이 한 번에 여러 토큰 소비할 때 사용.
 * 내부적으로 readForgeToken 을 여러 번 호출하는 얇은 wrapper.
 */
export function resolveForgeTheme(): ForgeThemeBridge {
  return {
    bg: readForgeToken('--forge-bg-base'),
    panel: readForgeToken('--forge-bg-panel'),
    card: readForgeToken('--forge-bg-card'),
    border: readForgeToken('--forge-border'),
    accent: readForgeToken('--forge-accent'),
    text: readForgeToken('--forge-text-primary'),
    hp: readForgeToken('--forge-stat-hp'),
    atk: readForgeToken('--forge-stat-atk'),
    def: readForgeToken('--forge-stat-def'),
    agi: readForgeToken('--forge-stat-agi'),
    luc: readForgeToken('--forge-stat-luc'),
    bp: readForgeToken('--forge-stat-bp'),
    danger: readForgeToken('--forge-danger'),
  };
}
