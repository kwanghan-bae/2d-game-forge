import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { I18n } from '../i18n/I18nManager';
import { SaveManager } from '../utils/SaveManager';
import { GameState } from '../GameState';
import { InflationManager } from '../utils/InflationManager';

/**
 * 게임의 메인 메뉴 화면을 담당하는 씬 클래스입니다.
 * 게임 시작, 이어하기, 언어 설정 등의 기능을 제공합니다.
 */
export class MainMenu extends Scene {
    /**
     * MainMenu의 생성자입니다.
     */
    constructor() {
        super('MainMenu');
    }

    /**
     * 씬의 시각적 요소(배경, 타이틀, 버튼 등)를 생성하고 배치합니다.
     */
    create() {
        const { width, height } = this.cameras.main;
        
        this.setupBackground(width, height);
        this.setupTitle(width, height);
        this.setupMenuButtons(width, height);
        this.createLangButton(width - 80, 50);

        EventBus.emit('current-scene-ready', this);
    }

    /** 배경 이미지 및 애니메이션 설정 */
    private setupBackground(width: number, height: number) {
        // 커스텀 마우스 커서
        this.input.setDefaultCursor('url(assets/images/UI/cursor_hand.png), pointer');

        const bg = this.add.image(width / 2, height / 2, 'title_bg');
        const scale = Math.max(width / bg.width, height / bg.height);
        bg.setScale(scale).setScrollFactor(0);

        this.tweens.add({
            targets: bg, scaleX: scale * 1.05, scaleY: scale * 1.05,
            duration: 20000, yoyo: true, repeat: -1
        });

        // 어두운 오버레이 및 중앙 패널
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.3);
        this.add.image(width / 2, height / 2 + 50, 'panel_main').setDisplaySize(400, 350).setAlpha(0.8);
    }

    /** 타이틀 텍스트 설정 */
    private setupTitle(width: number, height: number) {
        const titleText = I18n.getInstance().get('ui.title');
        this.add.text(width / 2, 150, titleText, {
            fontFamily: '"Gowun Batang", serif', fontSize: 80, color: '#FFD700',
            stroke: '#3b2f2f', strokeThickness: 8, align: 'center',
            shadow: { offsetX: 3, offsetY: 3, color: '#000', blur: 10, stroke: true, fill: true }
        }).setOrigin(0.5);
    }

    /** 게임 시작/이어하기 버튼 구성 */
    private setupMenuButtons(width: number, height: number) {
        const i18n = I18n.getInstance();
        const hasSave = SaveManager.getInstance().hasSaveData();

        if (hasSave) {
            this.createButton(width / 2, height - 220, i18n.get('ui.continue'), () => this.loadGameAndStart());
            this.createButton(width / 2, height - 150, i18n.get('ui.newGame'), () => this.startNewGame());
        } else {
            this.createButton(width / 2, height - 150, i18n.get('ui.start'), () => this.startNewGame());
        }
    }

    /** 저장된 데이터 로드 후 월드맵으로 이동 */
    private loadGameAndStart(): void {
        const saveData = SaveManager.getInstance().loadGame();
        if (saveData) {
            GameState.getInstance().fromJSON(saveData.gameState);
            InflationManager.getInstance().setStartTime(saveData.inflationManager.startTime);
            InflationManager.getInstance().setInflationRate(saveData.inflationManager.inflationRate);
            this.scene.start('WorldMap');
        } else {
            this.startNewGame();
        }
    }

    /** 상태 초기화 후 직업 선택으로 이동 */
    private startNewGame(): void {
        GameState.getInstance().reset();
        InflationManager.getInstance().reset();
        this.scene.start('ClassSelectScene');
    }

    /**
     * 공통 버튼 UI를 생성합니다.
     */
    public createButton(x: number, y: number, text: string, callback: () => void) {
        const btn = this.add.container(x, y);
        const img = this.add.image(0, 0, 'btn_beige').setDisplaySize(240, 70);
        const label = this.add.text(0, 0, text, {
            fontFamily: '"Gowun Batang", serif', fontSize: 28, color: '#4a3b2a', fontStyle: 'bold'
        }).setOrigin(0.5);

        btn.add([img, label]);
        btn.setInteractive(new Phaser.Geom.Rectangle(-120, -35, 240, 70), Phaser.Geom.Rectangle.Contains);

        this.setupButtonEvents(btn, img, label, callback);
        return btn;
    }

    /** 버튼 상호작용 이벤트 설정 */
    private setupButtonEvents(btn: Phaser.GameObjects.Container, img: Phaser.GameObjects.Image, label: Phaser.GameObjects.Text, cb: () => void) {
        btn.on('pointerdown', () => { img.setTexture('btn_beige_pressed'); label.y = 2; });
        btn.on('pointerup', () => { 
            this.sound.play('ui_click'); img.setTexture('btn_beige'); label.y = 0; cb(); 
        });
        btn.on('pointerover', () => this.tweens.add({ targets: btn, scaleX: 1.05, scaleY: 1.05, duration: 100 }));
        btn.on('pointerout', () => {
            img.setTexture('btn_beige'); label.y = 0;
            this.tweens.add({ targets: btn, scaleX: 1, scaleY: 1, duration: 100 });
        });
    }

    /** 언어 전환 버튼 생성 */
    public createLangButton(x: number, y: number) {
        const i18n = I18n.getInstance();
        const btn = this.add.container(x, y);
        const bg = this.add.rectangle(0, 0, 60, 40, 0x000000, 0.5).setStrokeStyle(2, 0xffffff);
        const text = this.add.text(0, 0, i18n.currentLang.toUpperCase(), {
            fontFamily: '"Gowun Batang", serif', fontSize: 20, color: '#ffffff'
        }).setOrigin(0.5);

        btn.add([bg, text]);
        btn.setSize(60, 40).setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => {
            this.sound.play('ui_click');
            i18n.setLanguage(i18n.currentLang === 'ko' ? 'en' : 'ko');
            this.scene.restart();
        });
    }
}
