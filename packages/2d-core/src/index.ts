export { GameManifest, parseGameManifest } from './manifest';
export type { GameManifestInput, GameManifestValue } from './manifest';

export type { ForgeGameInstance, StartGameFn } from './game-instance';

export { exposeTestHooks } from './test-hooks';
export type { StandardTestHookSlots, TestHookSlots } from './test-hooks';

export { createSaveEnvelopeSchema, SaveEnvelopeMeta } from './save-envelope';

export type {
  IStatSystem,
  IBattlePointSystem,
  IProgressionSystem,
  CharacterClassBase,
} from './game-interfaces';

export type {
  ForgeCSSTokens,
  ForgeStatToken,
  ForgeButtonProps,
  ForgePanelProps,
  ForgeGaugeProps,
  ForgeInventoryGridProps,
  ForgeScreenProps,
} from './ui-tokens';

export { readForgeToken, resolveForgeTheme } from './theme-bridge';
export type { ForgeThemeBridge } from './theme-bridge';
