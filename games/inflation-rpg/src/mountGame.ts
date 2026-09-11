import React, { type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ForgeGameInstance } from '@forge/core';
import type { StartGameConfig } from './types';
import './styles/game.css';

const TEST_HOOK_OWNER_KEY = '__inflation_rpg_game_config_owner__';

type GameScreen = ComponentType<{ config: StartGameConfig }>;

export function mountGame(
  config: StartGameConfig,
  Screen: GameScreen,
): ForgeGameInstance {
  const container = document.getElementById(config.parent);
  if (!container) throw new Error(`#${config.parent} not found`);

  const root: Root = createRoot(container);
  const hookOwner = {};
  root.render(React.createElement(Screen, { config }));

  if (config.exposeTestHooks) {
    const w = window as unknown as Record<string, unknown>;
    w['gameConfig'] = config;
    w[TEST_HOOK_OWNER_KEY] = hookOwner;
  }

  return {
    destroy() {
      try {
        root.unmount();
      } finally {
        if (config.exposeTestHooks) {
          const w = window as unknown as Record<string, unknown>;
          // Only the active owner may clear shared test hooks. This protects a
          // newer route when an older async loader is destroyed late.
          if (w[TEST_HOOK_OWNER_KEY] === hookOwner) {
            delete w['gameConfig'];
            delete w[TEST_HOOK_OWNER_KEY];
          }
        }
      }
    },
  };
}
