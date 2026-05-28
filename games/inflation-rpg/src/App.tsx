import React, { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { MainMenu } from './screens/MainMenu';
import { CyclePrepV2 } from './screens/CyclePrepV2';
import { OverworldRunner } from './screens/OverworldRunner';
import { CycleResultV2 } from './screens/CycleResultV2';
import { StoryModal } from './components/StoryModal';
import { ScreenTransition } from './components/ScreenTransition';
import { getStoryById } from './data/stories';
import { getCharacterReaction } from './data/characterReactions';
import { getCharacterById } from './data/characters';
import { playBgm, bgmIdForScreen } from './systems/sound';
import { applyRealmAccent } from './systems/realmAccent';
import type { StartGameConfig } from './types';

interface AppProps {
  config: StartGameConfig;
}

export function App({ config }: AppProps) {
  const screen = useGameStore((s) => s.screen);
  const pendingStoryId = useGameStore((s) => s.pendingStoryId);
  const characterId = useGameStore((s) => s.run?.characterId);
  const currentRealmId = useGameStore((s) => s.run?.currentRealmId ?? 'base');
  const setScreen = useGameStore.getState().setScreen;

  useEffect(() => {
    playBgm(bgmIdForScreen(screen));
  }, [screen]);

  useEffect(() => {
    applyRealmAccent(currentRealmId);
  }, [currentRealmId]);

  const story = pendingStoryId ? getStoryById(pendingStoryId) : null;
  const char = characterId ? getCharacterById(characterId) : null;
  const reaction = (story && characterId)
    ? getCharacterReaction(characterId, story.type as 'region_enter' | 'boss_defeat', story.id)
    : null;

  return (
    <div className="forge-ui-root" data-assets-base={config.assetsBasePath}>
      <ScreenTransition transitionKey={screen}>
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
      </ScreenTransition>
      {story && (
        <StoryModal
          title={story.type === 'boss_defeat' ? '승리!' : '새로운 지역'}
          emoji={char?.emoji}
          textKR={reaction ? `${story.textKR}\n\n${char?.nameKR ?? ''}: "${reaction}"` : story.textKR}
          onClose={() => useGameStore.getState().setPendingStory(null)}
        />
      )}
    </div>
  );
}
