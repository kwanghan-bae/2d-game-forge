import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ForgeGameInstance } from '@forge/core';
import type { StartGameConfig } from './types';
import { App } from './App';
import { useGameStore } from './store/gameStore';
import './styles/game.css';

export type { StartGameConfig };

export function StartGame(config: StartGameConfig): ForgeGameInstance {
  const container = document.getElementById(config.parent);
  if (!container) throw new Error(`#${config.parent} not found`);

  const root: Root = createRoot(container);
  root.render(React.createElement(App, { config }));

  if (config.exposeTestHooks) {
    const w = window as unknown as Record<string, unknown>;
    w['gameConfig'] = config;
    w['__zustand_inflation_rpg_store__'] = useGameStore;
  }

  return {
    destroy() {
      root.unmount();
    },
  };
}
