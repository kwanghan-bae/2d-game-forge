import { Scene } from 'phaser';

/**
 * 게임의 가장 첫 번째 진입점 씬입니다.
 * Preloader 실행에 필요한 최소한의 리소스(로딩 배경 등)를 불러옵니다.
 */
export class Boot extends Scene {
    /**
     * Boot의 생성자입니다.
     */
    constructor() {
        super('Boot');
    }

    /**
     * Preloader에서 즉시 사용할 기본 이미지를 로드합니다.
     */
    preload() {
        const base = this.game.registry.get('assetsBasePath');
        if (typeof base === 'string' && base.length > 0) {
            this.load.setBaseURL(base);
            this.load.image('background', 'images/pixel_battle_bg.png');
        } else {
            this.load.image('background', 'assets/images/pixel_battle_bg.png');
        }
    }

    /**
     * 로딩 자산 준비가 완료되면 Preloader 씬으로 전환합니다.
     */
    create() {
        this.scene.start('Preloader');
    }
}
