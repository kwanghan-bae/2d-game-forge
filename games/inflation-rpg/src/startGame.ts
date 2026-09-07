import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ForgeGameInstance } from '@forge/core';
import type { StartGameConfig } from './types';
import { App } from './App';
import { useGameStore } from './store/gameStore';
import { useCycleStoreV2 } from './overworld/cycleSliceV2';
import { V4App } from './v4/V4App';
import './styles/game.css';

export type { StartGameConfig };

const TEST_HOOK_OWNER_KEY = '__inflation_rpg_game_config_owner__';

export function StartGame(config: StartGameConfig): ForgeGameInstance {
  return mount(config, V4App);
}

/** Explicit V3 entry point. It keeps the legacy store and save key untouched. */
export function StartLegacyGame(config: StartGameConfig): ForgeGameInstance {
  return mount(config, App);
}

function mount(
  config: StartGameConfig,
  Screen: typeof App | typeof V4App,
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
    if (Screen === V4App) {
      delete w['__zustand_inflation_rpg_store__'];
      delete w['__cycle_store_v2__'];
    }
    w['gameConfig'] = config;
    w[TEST_HOOK_OWNER_KEY] = hookOwner;
    if (Screen === App) {
      w['__zustand_inflation_rpg_store__'] = useGameStore;
      // Legacy E2E only: expose the active controller so long natural-death
      // smoke tests can fast-forward the hero without changing production
      // timing or bypassing the real arrival/result pipeline.
      w['__cycle_store_v2__'] = useCycleStoreV2;
    }
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
            if (Screen === App) {
              delete w['__zustand_inflation_rpg_store__'];
              delete w['__cycle_store_v2__'];
            }
          }
        }
      }
    },
  };
}
