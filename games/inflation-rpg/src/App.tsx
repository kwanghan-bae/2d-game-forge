import React from 'react';
import dynamic from 'next/dynamic';
import { useGameStore } from './store/gameStore';
import { MainMenu } from './screens/MainMenu';
import { ClassSelect } from './screens/ClassSelect';
import { WorldMap } from './screens/WorldMap';
import { Dungeon } from './screens/Dungeon';
import { Inventory } from './screens/Inventory';
import { Shop } from './screens/Shop';
import { GameOver } from './screens/GameOver';
import { Quests } from './screens/Quests';
import type { StartGameConfig } from './types';

// ssr: false prevents Phaser (imported by Battle) from being bundled into the server-side render
const Battle = dynamic(() => import('./screens/Battle').then((m) => ({ default: m.Battle })), {
  ssr: false,
  loading: () => null,
});

interface AppProps {
  config: StartGameConfig;
}

export function App({ config }: AppProps) {
  const screen = useGameStore((s) => s.screen);

  return (
    <div className="forge-ui-root" data-assets-base={config.assetsBasePath}>
      {screen === 'main-menu'    && <MainMenu />}
      {screen === 'class-select' && <ClassSelect />}
      {screen === 'world-map'    && <WorldMap />}
      {screen === 'battle'       && <Battle />}
      {screen === 'dungeon'      && <Dungeon />}
      {screen === 'inventory'    && <Inventory />}
      {screen === 'shop'         && <Shop />}
      {screen === 'game-over'    && <GameOver />}
      {screen === 'quests'       && <Quests />}
    </div>
  );
}
