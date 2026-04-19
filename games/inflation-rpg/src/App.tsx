import React from 'react';
import { useGameStore } from './store/gameStore';
import { MainMenu } from './screens/MainMenu';
import { ClassSelect } from './screens/ClassSelect';
import { WorldMap } from './screens/WorldMap';
import { Battle } from './screens/Battle';
import { Inventory } from './screens/Inventory';
import { Shop } from './screens/Shop';
import { GameOver } from './screens/GameOver';
import type { StartGameConfig } from './types';

interface AppProps {
  config: StartGameConfig;
}

export function App({ config }: AppProps) {
  const screen = useGameStore((s) => s.screen);

  return (
    <div className="game-root" data-assets-base={config.assetsBasePath}>
      {screen === 'main-menu'    && <MainMenu />}
      {screen === 'class-select' && <ClassSelect />}
      {screen === 'world-map'    && <WorldMap />}
      {screen === 'battle'       && <Battle />}
      {screen === 'inventory'    && <Inventory />}
      {screen === 'shop'         && <Shop />}
      {screen === 'game-over'    && <GameOver />}
    </div>
  );
}
