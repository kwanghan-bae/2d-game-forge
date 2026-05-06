import React from 'react';
import dynamic from 'next/dynamic';
import { useGameStore } from './store/gameStore';
import { MainMenu } from './screens/MainMenu';
import { Town } from './screens/Town';
import { DungeonFloors } from './screens/DungeonFloors';
import { ClassSelect } from './screens/ClassSelect';
import { Inventory } from './screens/Inventory';
import { Shop } from './screens/Shop';
import { GameOver } from './screens/GameOver';
import { Quests } from './screens/Quests';
import { Ascension } from './screens/Ascension';
import { TutorialOverlay } from './components/TutorialOverlay';
import { DungeonFinalClearedModal } from './screens/DungeonFinalClearedModal';
import { playBgm, bgmIdForScreen, setVolumes } from './systems/sound';
import type { StartGameConfig } from './types';

// ssr: false prevents Phaser (imported by Battle) from being bundled into the server-side render.
// IMPORTANT: Battle MUST NOT be imported statically from anywhere else in the tree —
// any static path bypasses this dynamic boundary and pulls Phaser into the SSR bundle,
// which fails next build with "Export default doesn't exist in target module phaser.esm.js".
// (Pre-β2 Dungeon.tsx had `import { Battle } from './Battle'` which broke build for weeks.)
const Battle = dynamic(() => import('./screens/Battle').then((m) => ({ default: m.Battle })), {
  ssr: false,
  loading: () => null,
});

interface AppProps {
  config: StartGameConfig;
}

export function App({ config }: AppProps) {
  const screen = useGameStore((s) => s.screen);
  const meta = useGameStore((s) => s.meta);

  React.useEffect(() => {
    setVolumes(meta.musicVolume, meta.sfxVolume, meta.muted);
  }, [meta.musicVolume, meta.sfxVolume, meta.muted]);

  React.useEffect(() => {
    playBgm(bgmIdForScreen(screen));
  }, [screen]);

  return (
    <div className="forge-ui-root" data-assets-base={config.assetsBasePath}>
      {screen === 'main-menu'      && <MainMenu />}
      {screen === 'town'           && <Town />}
      {screen === 'dungeon-floors' && <DungeonFloors />}
      {screen === 'class-select'   && <ClassSelect />}
      {screen === 'battle'       && <Battle />}
      {screen === 'inventory'    && <Inventory />}
      {screen === 'shop'         && <Shop />}
      {screen === 'game-over'    && <GameOver />}
      {screen === 'quests'       && <Quests />}
      {screen === 'ascension'    && <Ascension />}
      {screen === 'skill-progression' && (
        <div data-testid="skill-progression-placeholder">SkillProgression placeholder (T23)</div>
      )}
      <TutorialOverlay />
      <DungeonFinalClearedModal />
    </div>
  );
}
