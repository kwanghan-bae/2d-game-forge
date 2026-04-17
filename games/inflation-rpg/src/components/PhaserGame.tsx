import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { EventBus } from '../game/EventBus';
import StartGame from '../game/main';

/**
 * PhaserGame 컴포넌트에 전달되는 프로퍼티 인터페이스입니다.
 */
export interface IPhaserGameProps {
    currentActiveScene?: (scene: Phaser.Scene) => void;
}

/**
 * Phaser 게임의 초기화 및 정리 로직을 담당하는 커스텀 훅입니다.
 * @param currentActiveScene 씬 준비 시 호출될 콜백 함수
 * @returns 게임 컨테이너 ID 및 게임 인스턴스 Ref
 */
export function usePhaserGame(currentActiveScene?: (scene: Phaser.Scene) => void) {
    const game = useRef<Phaser.Game | null>(null);
    const containerId = "game-container";

    useEffect(() => {
        if (game.current) return;

        const phaserInstance = StartGame(containerId);
        game.current = phaserInstance;

        if (typeof window !== 'undefined') {
            (window as any).game = phaserInstance;
        }

        const onSceneReady = (scene: Phaser.Scene) => {
            if (typeof currentActiveScene === 'function') {
                currentActiveScene(scene);
            }
        };

        EventBus.on('current-scene-ready', onSceneReady);

        return () => {
            EventBus.removeListener('current-scene-ready', onSceneReady);
            if (game.current) {
                game.current.destroy(true);
                game.current = null;
            }
        };
    }, [currentActiveScene]);

    return { game, containerId };
}

/**
 * Phaser 게임 엔진을 React 환경에서 렌더링하고 관리하는 메인 컴포넌트입니다.
 * 컨테이너 요소를 생성하며, usePhaserGame 훅을 통해 게임 수명 주기를 제어합니다.
 * @param props 컴포넌트 프로퍼티
 */
export default function PhaserGame({ currentActiveScene }: IPhaserGameProps) {
    // 커스텀 훅을 사용하여 로직 분리 및 함수 길이 축소
    const { containerId } = usePhaserGame(currentActiveScene);

    return (
        <div id={containerId}></div>
    );
}
