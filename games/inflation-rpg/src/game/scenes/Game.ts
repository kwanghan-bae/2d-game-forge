import { Scene } from 'phaser';
import { EventBus } from '../EventBus';

/**
 * 게임의 메인 테스트 또는 샌드박스 역할을 하는 씬입니다.
 * (현재는 실제 게임 루프보다는 자산 확인 및 씬 전환 테스트용으로 사용됩니다)
 */
export class Game extends Scene {
    /** 메인 카메라 객체 */
    camera!: Phaser.Cameras.Scene2D.Camera;
    /** 배경 이미지 객체 */
    background!: Phaser.GameObjects.Image;
    /** 화면 중앙 메시지 텍스트 */
    msg_text!: Phaser.GameObjects.Text;

    /**
     * Game의 생성자입니다.
     */
    constructor() {
        super('Game');
    }

    /**
     * 씬의 시각적 요소들을 배치합니다.
     */
    create() {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x00ff00);

        this.background = this.add.image(512, 384, 'background');
        this.background.setAlpha(0.5);

        this.msg_text = this.add.text(512, 384, '즐거운 개발 되세요!', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        });
        this.msg_text.setOrigin(0.5);

        // 자산 로드 확인용 더미 이미지
        this.add.image(200, 300, 'monster_dokkaebi').setScale(2);

        EventBus.emit('current-scene-ready', this);
    }

    /**
     * 특정 조건 발생 시 다른 씬으로 전환합니다.
     */
    changeScene() {
        this.scene.start('GameOver');
    }
}
