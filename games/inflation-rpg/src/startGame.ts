import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ForgeGameInstance } from '@forge/core';
import type { StartGameConfig } from './types';
import { App } from './App';
import { useGameStore } from './store/gameStore';
import { V4App } from './v4/V4App';
import './styles/game.css';

export type { StartGameConfig };

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
  root.render(React.createElement(Screen, { config }));

  if (config.exposeTestHooks) {
    const w = window as unknown as Record<string, unknown>;
    w['gameConfig'] = config;
    if (Screen === App) {
      w['__zustand_inflation_rpg_store__'] = useGameStore;
    }
  }

  return {
    destroy() {
      root.unmount();
    },
  };
}
