import React, { type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ForgeGameInstance } from '@forge/core';
import type { StartGameConfig } from './types';
import './styles/game.css';

const TEST_HOOK_OWNER_KEY = '__inflation_rpg_game_config_owner__';

type GameScreen = ComponentType<{ config: StartGameConfig }>;

export interface LegacyTestHooks {
  legacyStore: unknown;
  cycleStore: unknown;
}

export function mountGame(
  config: StartGameConfig,
  Screen: GameScreen,
  legacyTestHooks?: LegacyTestHooks,
): ForgeGameInstance {
  const container = document.getElementById(config.parent);
  if (!container) throw new Error(`#${config.parent} not found`);

  const root: Root = createRoot(container);
  const hookOwner = {};
  root.render(React.createElement(Screen, { config }));

  if (config.exposeTestHooks) {
    const w = window as unknown as Record<string, unknown>;
    // A route transition can resolve an older legacy import after the V4
    // root has already mounted. Do not leave its dev-only stores available to
    // the next route's browser tests.
    if (legacyTestHooks) {
      w['__zustand_inflation_rpg_store__'] = legacyTestHooks.legacyStore;
      w['__cycle_store_v2__'] = legacyTestHooks.cycleStore;
    } else {
      delete w['__zustand_inflation_rpg_store__'];
      delete w['__cycle_store_v2__'];
    }
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
            if (legacyTestHooks) {
              delete w['__zustand_inflation_rpg_store__'];
              delete w['__cycle_store_v2__'];
            }
          }
        }
      }
    },
  };
}
