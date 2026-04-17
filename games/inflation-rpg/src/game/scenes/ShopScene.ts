import { Scene } from 'phaser';
import { GameState } from '@/game/GameState';
import { ITEM_CATALOG, Item } from '@/game/data/ItemData';
import { NumberFormatter } from '@/game/utils/NumberFormatter';
import { InflationManager } from '@/game/utils/InflationManager';

/**
 * 게임 내 상점 기능을 담당하는 씬입니다.
 * 플레이어는 이곳에서 장비 아이템을 골드로 구매할 수 있으며, 
 * 인플레이션 시스템에 따라 실시간으로 변하는 물가를 체감할 수 있습니다.
 */
export class ShopScene extends Scene {
    /** 게임 상태 관리 싱글톤 인스턴스 */
    private gameState!: GameState;
    /** 인플레이션 관리 싱글톤 인스턴스 */
    private inflationManager!: InflationManager;
    /** 화면에 생성된 아이템 항목 컨테이너 목록 */
    private itemContainers: Phaser.GameObjects.Container[] = [];
    /** 현재 보유 골드를 표시하는 텍스트 객체 */
    private goldText!: Phaser.GameObjects.Text;

    /**
     * ShopScene의 생성자입니다. 씬 식별자를 설정합니다.
     */
    constructor() {
        super('ShopScene');
    }

    /**
     * 씬의 UI 요소들을 생성하고 초기화합니다.
     * 패널 레이아웃, 아이템 목록, 배경 오버레이 등을 구성합니다.
     */
    create() {
        this.gameState = GameState.getInstance();
        this.inflationManager = InflationManager.getInstance();

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 배경 오버레이 (반투명 어둡게)
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
        overlay.setInteractive();

        const panelWidth = 800;
        const panelHeight = 600;
        const panelX = width / 2;
        const panelY = height / 2;

        // 상점 메인 패널
        this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x2b1810);
        this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0xffffff, 0).setStrokeStyle(3, 0xd4a574);

        // 타이틀
        this.add.text(panelX, panelY - panelHeight / 2 + 40, '상점', {
            fontFamily: '"Gowun Batang", serif',
            fontSize: 36,
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5);

        // 인플레이션 정보 표시
        const inflationRate = this.inflationManager.getCurrentInflationRate();
        this.add.text(panelX, panelY - panelHeight / 2 + 90, `인플레이션율: ${inflationRate.toFixed(1)}%/분`, {
            fontFamily: '"Gowun Batang", serif',
            fontSize: 16,
            color: '#FF6B6B',
        }).setOrigin(0.5);

        // 보유 골드 표시
        this.goldText = this.add.text(panelX, panelY - panelHeight / 2 + 120, `보유 골드: ${NumberFormatter.formatCompact(this.gameState.stats.gold)}`, {
            fontFamily: '"Gowun Batang", serif',
            fontSize: 20,
            color: '#FFD700',
        }).setOrigin(0.5);

        const itemListY = panelY - panelHeight / 2 + 180;
        const itemSpacing = 60;

        // 아이템 목록 생성
        ITEM_CATALOG.forEach((item, index) => {
            const itemY = itemListY + index * itemSpacing;
            const itemContainer = this.createItemEntry(item, panelX, itemY);
            this.itemContainers.push(itemContainer);
        });

        // 닫기 버튼
        const closeButton = this.add.text(panelX, panelY + panelHeight / 2 - 40, '닫기 (ESC)', {
            fontFamily: '"Gowun Batang", serif',
            fontSize: 20,
            color: '#FFFFFF',
            backgroundColor: '#8B4513',
            padding: { x: 20, y: 10 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        closeButton.on('pointerdown', () => {
            this.closeShop();
        });

        // ESC 키 입력 지원
        if (this.input.keyboard) {
            this.input.keyboard.once('keydown-ESC', () => {
                this.closeShop();
            });
        }
    }

    /**
     * 상점 목록 내 개별 아이템 항목을 생성합니다.
     * @param item 표시할 아이템 데이터
     * @param x 생성될 중심 X 좌표
     * @param y 생성될 중심 Y 좌표
     * @returns 생성된 UI 컨테이너
     */
    private createItemEntry(item: Item, x: number, y: number): Phaser.GameObjects.Container {
        const container = this.add.container(x - 350, y);

        const nameText = this.add.text(0, 0, item.name, {
            fontFamily: '"Gowun Batang", serif',
            fontSize: 18,
            color: '#FFFFFF',
        });

        // 인플레이션이 적용된 현재 가격 계산
        const inflatedPrice = this.inflationManager.getInflatedPrice(item.price);
        const priceText = this.add.text(200, 0, `${NumberFormatter.formatCompact(inflatedPrice)} 골드`, {
            fontFamily: '"Gowun Batang", serif',
            fontSize: 16,
            color: '#FFD700',
        });

        const statsText = this.add.text(350, 0, this.getStatsString(item), {
            fontFamily: '"Gowun Batang", serif',
            fontSize: 14,
            color: '#AAAAAA',
        });

        const buyButton = this.add.text(550, 0, '구매', {
            fontFamily: '"Gowun Batang", serif',
            fontSize: 16,
            color: '#FFFFFF',
            backgroundColor: '#4CAF50',
            padding: { x: 15, y: 5 },
        }).setInteractive({ useHandCursor: true });

        buyButton.on('pointerdown', () => {
            this.buyItem(item);
        });

        container.add([nameText, priceText, statsText, buyButton]);

        return container;
    }

    /**
     * 아이템의 능력치 정보를 가독성 있는 문자열로 변환합니다.
     * @param item 대상 아이템
     * @returns 변환된 능력치 문자열 (예: "공격 +10, HP +100")
     */
    private getStatsString(item: Item): string {
        const parts: string[] = [];
        if (item.stats.atk) parts.push(`공격 +${item.stats.atk}`);
        if (item.stats.def) parts.push(`방어 +${item.stats.def}`);
        if (item.stats.hp) parts.push(`HP +${NumberFormatter.formatCompact(item.stats.hp)}`);
        if (item.stats.agi) parts.push(`민첩 +${item.stats.agi}`);
        if (item.stats.luk) parts.push(`행운 +${item.stats.luk}`);
        return parts.join(', ');
    }

    /**
     * 아이템 구매를 시도합니다. 골드 잔액을 확인하고 인벤토리에 추가합니다.
     * @param item 구매할 아이템
     * @returns 구매 성공 여부
     */
    public buyItem(item: Item): boolean {
        const inflatedPrice = this.inflationManager.getInflatedPrice(item.price);
        
        if (this.gameState.stats.gold < inflatedPrice) {
            return false;
        }

        this.gameState.stats.gold -= inflatedPrice;
        this.gameState.addItem(item);

        this.updateGoldDisplay();

        return true;
    }

    /**
     * UI 상의 보유 골드 수치를 현재 상태로 갱신합니다.
     */
    private updateGoldDisplay() {
        this.goldText.setText(`보유 골드: ${NumberFormatter.formatCompact(this.gameState.stats.gold)}`);
    }

    /**
     * 상점 화면을 닫고 이전 씬(월드맵)으로 복귀합니다.
     */
    public closeShop() {
        this.scene.stop('ShopScene');
        this.scene.resume('WorldMap');
    }
}
