import { Boot } from './scenes/Boot';
import { Game as MainGame } from './scenes/Game';
import { GameOver } from './scenes/GameOver';
import { MainMenu } from './scenes/MainMenu';
import { Preloader } from './scenes/Preloader';

import { AUTO, Game } from 'phaser';

import { WorldMap } from './scenes/WorldMap';
import { BattleScene } from './scenes/BattleScene';
import { InventoryScene } from './scenes/InventoryScene'; // Added
import { ClassSelectScene } from './scenes/ClassSelectScene'; // Added
import { GameState } from './GameState';
import { InflationManager } from './utils/InflationManager';
import { ReincarnationManager } from './utils/ReincarnationManager';
import { EventBus } from './EventBus';

// E2E 테스트를 위한 전역 타입 선언
declare global {
    interface Window {
        gameState?: GameState;
        inflationManager?: InflationManager;
        ReincarnationManager?: typeof ReincarnationManager;
        currentScene?: Phaser.Scene;
        phaserGame?: Game;
        E2E_AUTO_BATTLE?: boolean; // E2E 테스트 모드: 전투 자동 종료 활성화
    }
}

/**
 * Phaser 게임 엔진 설정을 정의하는 객체입니다.
 * 화면 크기, 렌더링 방식, 물리 엔진, 포함될 씬 목록 등을 설정합니다.
 */
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 1024,
    height: 768,
    parent: 'game-container',
    backgroundColor: '#028af8',
    pixelArt: true, // 픽셀 아트 스케일링을 위해 중요
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: [
        Boot,
        Preloader,
        MainMenu,
        ClassSelectScene,
        WorldMap,
        BattleScene,
        InventoryScene, // 추가됨
        MainGame,
        GameOver
    ]
};

/**
 * 게임 인스턴스를 생성하고 시작하는 메인 함수입니다.
 * @param parent 게임이 렌더링될 부모 DOM 요소의 ID
 * @returns 생성된 Phaser.Game 인스턴스
 */
const StartGame = (parent: string) => {

    const game = new Game({ ...config, parent });

    // E2E 테스트를 위해 게임 상태를 window 객체에 노출
    window.gameState = GameState.getInstance();
    window.inflationManager = InflationManager.getInstance();
    window.ReincarnationManager = ReincarnationManager;
    window.phaserGame = game;

    EventBus.on('current-scene-ready', (scene: Phaser.Scene) => {
        window.currentScene = scene;
    });

    return game;

}

export default StartGame;
