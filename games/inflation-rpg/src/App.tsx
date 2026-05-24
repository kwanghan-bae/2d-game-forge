import React from 'react';
import { useGameStore } from './store/gameStore';
import { MainMenu } from './screens/MainMenu';
import { CyclePrepV2 } from './screens/CyclePrepV2';
import { OverworldRunner } from './screens/OverworldRunner';
import { CycleResultV2 } from './screens/CycleResultV2';
import type { StartGameConfig } from './types';

interface AppProps {
  config: StartGameConfig;
}

export function App({ config }: AppProps) {
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore.getState().setScreen;

  return (
    <div className="forge-ui-root" data-assets-base={config.assetsBasePath}>
      {screen === 'main-menu' && <MainMenu />}
      {screen === 'cycle-prep-v2' && (
        <CyclePrepV2
          onStart={() => setScreen('overworld')}
          onCancel={() => setScreen('main-menu')}
          onClearSnapshot={() => useGameStore.getState().clearHeroSnapshot()}
        />
      )}
      {screen === 'overworld' && (
        <OverworldRunner
          onCycleEnd={() => setScreen('cycle-result-v2')}
          onExitToMenu={() => setScreen('main-menu')}
        />
      )}
      {screen === 'cycle-result-v2' && (
        <CycleResultV2 onBackToMenu={() => setScreen('main-menu')} />
      )}
      {(screen === 'saga-gallery' || screen === 'settings') && (
        <div style={{ padding: 24, color: '#eee' }}>
          <p>이 화면은 V1b 에서 구현됩니다.</p>
          <button type="button" onClick={() => setScreen('main-menu')}>돌아가기</button>
        </div>
      )}
    </div>
  );
}
