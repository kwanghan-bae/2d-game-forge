import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { GameState } from '../GameState';
import { ReincarnationManager } from '../utils/ReincarnationManager';

/**
 * 게임 오버 화면을 담당하는 씬 클래스입니다.
 * 플레이어의 사망 시 표시되며, 획득한 영혼석 계산 및 환생 기능을 제공합니다.
 */
export class GameOver extends Scene {
    /**
     * GameOver의 생성자입니다.
     */
    constructor() {
        super('GameOver');
    }

    /**
     * 씬의 시각적 요소(배경, 통계, 환생 버튼 등)를 생성하고 배치합니다.
     */
    create() {
        this.cameras.main.setBackgroundColor(0xff0000);

        this.add.image(512, 384, 'background').setAlpha(0.5);

        // 게임 상태와 환생 관리자 초기화
        const gameState = GameState.getInstance();
        const reincarnationMgr = ReincarnationManager.getInstance();

        // 영혼석 계산
        const earnedStones = reincarnationMgr.calculateSoulStones(
            gameState.stats.level,
            gameState.defeatedBosses
        );

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 제목
        this.add.text(width / 2, 100, 'Game Over', {
            fontFamily: 'Arial Black', fontSize: 64, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        // 영혼석 표시
        this.add.text(width / 2, 200, `영혼석 획득: ${earnedStones}`, {
            fontSize: '32px',
            color: '#FFD700',
            align: 'center'
        }).setOrigin(0.5);

        // 현재 영혼 등급 표시
        this.add.text(width / 2, 250, `현재 영혼 등급: ${gameState.soulGrade}`, {
            fontSize: '24px',
            color: '#FFFFFF',
            align: 'center'
        }).setOrigin(0.5);

        // 획득한 영혼석으로 올릴 수 있는 등급 계산
        const gradeResult = reincarnationMgr.tryIncreaseSoulGrade(
            gameState.soulGrade,
            earnedStones
        );

        if (gradeResult.newGrade > gameState.soulGrade) {
            this.add.text(width / 2, 300, `영혼 등급 상승 가능: ${gameState.soulGrade} → ${gradeResult.newGrade}`, {
                fontSize: '20px',
                color: '#00FF00',
                align: 'center'
            }).setOrigin(0.5);
        }

        // 환생 버튼
        const reincarnateBtn = this.add.text(width / 2, 400, '환생하기', {
            fontSize: '28px',
            backgroundColor: '#4a3b2a',
            color: '#FFFFFF',
            padding: { x: 30, y: 15 },
            align: 'center'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        reincarnateBtn.on('pointerdown', () => {
            // 환생 실행
            const result = reincarnationMgr.reincarnate(gameState, earnedStones);

            // 새로운 직업 해금 알림
            if (result.newSoulGrade > gameState.soulGrade - earnedStones) {
                const newClasses = result.unlockedClasses.filter(
                    cls => !gameState.unlockedClasses.includes(cls)
                );
                if (newClasses.length > 0) {
                    console.log(`새로운 직업 해금: ${newClasses.join(', ')}`);
                }
            }

            // 주 메뉴로 이동
            this.scene.start('MainMenu');
        });

        // 마우스 오버 효과
        reincarnateBtn.on('pointerover', () => {
            reincarnateBtn.setStyle({ backgroundColor: '#6b5b47' });
        });

        reincarnateBtn.on('pointerout', () => {
            reincarnateBtn.setStyle({ backgroundColor: '#4a3b2a' });
        });

        // 클릭으로도 환생 가능 (호환성)
        this.input.once('pointerdown', () => {
            // 버튼이 아닌 다른 곳 클릭 시에만 실행되도록
            // 실제로는 버튼 클릭이 우선됨
        });

        EventBus.emit('current-scene-ready', this);
    }
}

