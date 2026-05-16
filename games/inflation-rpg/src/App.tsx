import React from 'react';
import { useGameStore } from './store/gameStore';
import { MainMenu } from './screens/MainMenu';
import type { StartGameConfig } from './types';

interface AppProps {
  config: StartGameConfig;
}

export function App({ config }: AppProps) {
  const screen = useGameStore((s) => s.screen);

  return (
    <div className="forge-ui-root" data-assets-base={config.assetsBasePath}>
      {screen === 'main-menu' && <MainMenu />}
      {screen === 'cycle-prep-v2' && <div data-testid="screen-cycle-prep-v2">CyclePrepV2 — T19 에서 구현</div>}
      {screen === 'overworld' && <div data-testid="screen-overworld">OverworldRunner — T20 에서 구현</div>}
      {screen === 'cycle-result-v2' && <div data-testid="screen-cycle-result-v2">CycleResultV2 — T21 에서 구현</div>}
      {(screen === 'saga-gallery' || screen === 'settings') && (
        <div style={{ padding: 24, color: '#eee' }}>
          <p>이 화면은 V1b 에서 구현됩니다.</p>
          <button type="button" onClick={() => useGameStore.getState().setScreen('main-menu')}>돌아가기</button>
        </div>
      )}
    </div>
  );
}
