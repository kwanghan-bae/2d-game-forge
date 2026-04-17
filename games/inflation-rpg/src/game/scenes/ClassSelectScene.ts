import { Scene } from 'phaser';
import { GameState } from '../GameState';
import { CLASS_CATALOG, ClassId, CharacterClass } from '../data/ClassData';
import { EventBus } from '../EventBus';
import { UI_FONTS, GameThemeColors } from '../constants/Colors';

/**
 * 게임 시작 전 플레이어의 직업을 선택하는 화면을 담당하는 씬 클래스입니다.
 * 해금된 직업 목록을 표시하고, 선택된 직업에 맞춰 초기 스탯을 설정합니다.
 */
export class ClassSelectScene extends Scene {
    /**
     * ClassSelectScene의 생성자입니다.
     */
    constructor() {
        super({ key: 'ClassSelectScene' });
    }

    /**
     * 씬의 시각적 요소(직업 카드 목록, 제목 등)를 생성하고 배치합니다.
     */
    create(): void {
        const { width, height } = this.scale;
        const gameState = GameState.getInstance();

        // 배경 색상 설정
        this.add.rectangle(0, 0, width, height, GameThemeColors.PAPER_BG).setOrigin(0);

        // 제목
        this.add.text(width / 2, 60, '직업 선택', {
            fontFamily: UI_FONTS.GOWUN_BATANG,
            fontSize: '48px',
            color: Phaser.Display.Color.IntegerToColor(GameThemeColors.TITLE_BROWN).rgba,
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // 설명 텍스트
        this.add.text(width / 2, 110, `영혼 등급: ${gameState.soulGrade}`, {
            fontFamily: UI_FONTS.GOWUN_BATANG,
            fontSize: '20px',
            color: Phaser.Display.Color.IntegerToColor(GameThemeColors.SUB_BROWN).rgba
        }).setOrigin(0.5);

        // 직업 카드들 생성
        const classes = CLASS_CATALOG;
        const cardWidth = 180;
        const cardHeight = 260;
        const spacing = 15;
        const totalWidth = cardWidth * classes.length + spacing * (classes.length - 1);
        const startX = (width - totalWidth) / 2;
        const cardY = height / 2 + 40;

        classes.forEach((classData, index) => {
            const cardX = startX + index * (cardWidth + spacing);
            this.createClassCard(cardX, cardY, cardWidth, cardHeight, classData);
        });

        EventBus.emit('current-scene-ready', this);
    }

    /**
     * 개별 직업 카드를 생성하여 화면에 표시합니다.
     * @param x 카드 중심 X 좌표
     * @param y 카드 중심 Y 좌표
     * @param width 카드 너비
     * @param height 카드 높이
     * @param classData 직업 데이터 객체
     */
    private createClassCard(
        x: number,
        y: number,
        width: number,
        height: number,
        classData: CharacterClass
    ): void {
        const gameState = GameState.getInstance();
        const isUnlocked = gameState.isClassUnlocked(classData.id);

        // 카드 배경 및 테두리 설정 (상수 직접 참조)
        const bgColor = isUnlocked ? GameThemeColors.CARD_WHITE : GameThemeColors.CARD_GRAY;
        const strokeColor = isUnlocked ? GameThemeColors.STROKE_BROWN : GameThemeColors.STROKE_GRAY;
        
        const card = this.add
            .rectangle(x, y, width, height, bgColor)
            .setStrokeStyle(2, strokeColor);

        // 직업 이름
        const nameColorInt = isUnlocked ? GameThemeColors.TITLE_BROWN : GameThemeColors.TEXT_DARK;
        this.add.text(x, y - 110, classData.nameKR, {
            fontFamily: UI_FONTS.GOWUN_BATANG,
            fontSize: '22px',
            color: Phaser.Display.Color.IntegerToColor(nameColorInt).rgba,
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // 필요 영혼 등급
        const reqColorInt = isUnlocked ? GameThemeColors.STROKE_BROWN : GameThemeColors.TEXT_MUTED;
        this.add.text(x, y - 75, `영혼 등급 ${classData.requiredSoulGrade}`, {
            fontFamily: UI_FONTS.GOWUN_BATANG,
            fontSize: '12px',
            color: Phaser.Display.Color.IntegerToColor(reqColorInt).rgba
        }).setOrigin(0.5);

        // 직업 설명
        const descColorInt = isUnlocked ? GameThemeColors.TEXT_DESC : GameThemeColors.TEXT_DISABLED;
        this.add.text(x, y - 30, classData.description, {
            fontFamily: UI_FONTS.GOWUN_BATANG,
            fontSize: '11px',
            color: Phaser.Display.Color.IntegerToColor(descColorInt).rgba,
            align: 'center',
            wordWrap: { width: width - 20 }
        }).setOrigin(0.5);

        // 기본 스탯 표시
        const statsText = `HP: ${classData.baseStats.hp} / 공: ${classData.baseStats.attack} / 방: ${classData.baseStats.defense}`;
        const statsColorInt = isUnlocked ? GameThemeColors.SUB_BROWN : GameThemeColors.GRAY_99;
        this.add.text(x, y + 40, statsText, {
            fontFamily: UI_FONTS.ARIAL,
            fontSize: '9px',
            color: Phaser.Display.Color.IntegerToColor(statsColorInt).rgba
        }).setOrigin(0.5);

        // 선택 버튼 또는 잠금 표시
        if (isUnlocked) {
            const btnColor = GameThemeColors.BTN_PRIMARY;
            const btnStroke = GameThemeColors.TITLE_BROWN;
            const btnHover = GameThemeColors.BTN_HOVER;

            const btn = this.add
                .rectangle(x, y + 100, width - 20, 40, btnColor)
                .setStrokeStyle(1, btnStroke)
                .setInteractive();

            const btnText = this.add.text(x, y + 100, '선택', {
                fontFamily: UI_FONTS.GOWUN_BATANG,
                fontSize: '16px',
                color: Phaser.Display.Color.IntegerToColor(GameThemeColors.TEXT_LIGHT).rgba,
                fontStyle: 'bold'
            }).setOrigin(0.5);

            const buttonContainer = this.add.container(x, y + 100, [btn, btnText]);

            // 호버 효과
            btn.on('pointerover', () => {
                btn.setFillStyle(btnHover);
                this.tweens.add({
                    targets: buttonContainer,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 100
                });
            });

            btn.on('pointerout', () => {
                btn.setFillStyle(btnColor);
                this.tweens.add({
                    targets: buttonContainer,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 100
                });
            });

            btn.on('pointerdown', () => {
                this.selectClass(classData.id as ClassId);
            });
        } else {
            // 잠금 표시
            this.add.text(x, y + 100, '🔒 잠김', {
                fontFamily: UI_FONTS.GOWUN_BATANG,
                fontSize: '14px',
                color: Phaser.Display.Color.IntegerToColor(GameThemeColors.GRAY_99).rgba
            }).setOrigin(0.5);
        }
    }

    /**
     * 특정 직업을 선택하고 초기 스탯을 적용한 뒤 월드 맵으로 전환합니다.
     * @param classId 선택된 직업 ID
     */
    public selectClass(classId: ClassId): void {
        const gameState = GameState.getInstance();

        // 직업 선택 저장
        gameState.setClass(classId as string);

        // 선택된 직업의 정보 가져오기
        const selectedClassData = CLASS_CATALOG.find(cls => cls.id === classId);
        if (!selectedClassData) {
            console.error(`직업을 찾을 수 없습니다: ${classId}`);
            return;
        }

        // 직업별 초기 스탯 적용
        gameState.stats.attack = selectedClassData.baseStats.attack;
        gameState.stats.defense = selectedClassData.baseStats.defense;
        gameState.stats.agi = selectedClassData.baseStats.agi;
        gameState.stats.luk = selectedClassData.baseStats.luk;
        gameState.stats.maxHp = selectedClassData.baseStats.hp;
        gameState.stats.hp = selectedClassData.baseStats.hp;

        // 월드 맵으로 전환
        this.scene.start('WorldMap');
    }
}
