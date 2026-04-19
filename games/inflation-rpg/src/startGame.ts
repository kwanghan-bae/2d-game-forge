import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ForgeGameInstance } from '@forge/core';
import { App } from './App';
import './styles/game.css';

export interface StartGameConfig {
  parent: string;
  assetsBasePath: string;
  exposeTestHooks: boolean;
}

export function StartGame(config: StartGameConfig): ForgeGameInstance {
  const container = document.getElementById(config.parent);
  if (!container) throw new Error(`#${config.parent} not found`);

  const root: Root = createRoot(container);
  root.render(React.createElement(App, { config }));

  if (config.exposeTestHooks) {
    (window as unknown as Record<string, unknown>)['gameConfig'] = config;
  }

  return {
    destroy() {
      root.unmount();
    },
  };
}
