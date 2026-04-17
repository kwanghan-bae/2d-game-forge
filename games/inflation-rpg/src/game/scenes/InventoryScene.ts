import { Scene } from 'phaser';
import { GameState } from '../GameState';
import { ITEM_CATALOG, Item, ItemType } from '../data/ItemData';
import { I18n } from '../i18n/I18nManager';
import { NumberFormatter } from '../utils/NumberFormatter';

/**
 * 플레이어의 인벤토리 및 장착 정보를 보여주는 씬 클래스입니다.
 * 보유 아이템 목록을 격자 형태로 표시하며, 아이템 장착 및 해제 기능을 제공합니다.
 */
export class InventoryScene extends Scene {
    /** 현재 게임 상태 인스턴스 */
    private gameState: GameState;
    /** 아이템 목록을 담는 컨테이너 */
    private itemGridContainer!: Phaser.GameObjects.Container;
    /** 아이템 상세 정보를 표시하는 텍스트 */
    private tooltipText!: Phaser.GameObjects.Text;

    /**
     * InventoryScene의 생성자입니다.
     */
    constructor() {
        super('InventoryScene');
        this.gameState = GameState.getInstance();
    }

    /**
     * 인벤토리 화면의 시각적 요소(패널, 장착 슬롯, 인벤토리 격자 등)를 생성합니다.
     */
    create() {
        // 배경 오버레이 (클릭 차단)
        this.add.rectangle(512, 384, 1024, 768, 0x000000, 0.7).setInteractive();

        // 메인 패널 (학자 책상 스타일)
        const panel = this.add.image(512, 384, 'UI_Panel_Beige').setDisplaySize(800, 600);

        // 제목 표시
        this.add.text(512, 130, '보관함 (Inventory)', {
            fontFamily: '"Gowun Batang", serif', fontSize: '32px', color: '#4a3b2a', fontStyle: 'bold'
        }).setOrigin(0.5);

        // 닫기 버튼
        const closeBtn = this.add.text(880, 110, 'X', {
            fontFamily: '"Gowun Batang", serif', fontSize: '32px', color: '#4a3b2a'
        }).setInteractive().setOrigin(0.5);
        closeBtn.on('pointerdown', () => {
            this.scene.stop();
            this.scene.resume('WorldMap');
        });

        // 현재 장착 장비 표시 (좌측)
        this.createEquipmentSlot(200, 250, ItemType.WEAPON, '무기');
        this.createEquipmentSlot(200, 380, ItemType.ARMOR, '방어구');
        this.createEquipmentSlot(200, 510, ItemType.ACCESSORY, '장신구');

        // 보유 아이템 그리드 표시 (우측)
        this.itemGridContainer = this.add.container(400, 200);
        this.renderInventoryGrid();

        // 툴팁 / 설명 영역 (하단)
        this.tooltipText = this.add.text(512, 650, '아이템을 선택하세요.', {
            fontFamily: '"Gowun Batang", serif', fontSize: '18px', color: '#4a3b2a', align: 'center', wordWrap: { width: 700 }
        }).setOrigin(0.5);

        // 디버그용: 인벤토리가 비어있을 경우 테스트 아이템 추가
        if (this.gameState.inventory.length === 0 && Object.keys(this.gameState.equipment).length === 0) {
            this.gameState.addItem(ITEM_CATALOG[0]);
            this.gameState.addItem(ITEM_CATALOG[6]);
            this.renderInventoryGrid();
        }
    }

    /**
     * 특정 부위의 장착 슬롯을 생성합니다.
     * @param x X 좌표
     * @param y Y 좌표
     * @param type 아이템 종류 (무기, 방어구 등)
     * @param label 슬롯 라벨 (한글 명칭)
     */
    private createEquipmentSlot(x: number, y: number, type: ItemType, label: string) {
        // 슬롯 배경
        this.add.rectangle(x, y, 80, 80, 0x000000, 0.1).setStrokeStyle(1, 0x4a3b2a);
        this.add.text(x, y - 50, label, {
            fontFamily: '"Gowun Batang", serif', fontSize: '20px', color: '#4a3b2a'
        }).setOrigin(0.5);

        // 장착된 아이템 아이콘 표시
        const equippedItem = this.gameState.equipment[type];
        if (equippedItem) {
            const icon = this.add.image(x, y, equippedItem.atlasKey, equippedItem.frame).setDisplaySize(64, 64);
            icon.setInteractive();
            icon.on('pointerdown', () => {
                this.gameState.unequipItem(type);
                this.scene.restart(); // 화면 갱신
            });
            icon.on('pointerover', () => {
                this.updateTooltip(equippedItem);
            });
        } else {
            this.add.text(x, y, '비어있음', {
                fontFamily: '"Gowun Batang", serif', fontSize: '14px', color: '#888'
            }).setOrigin(0.5);
        }
    }

    /**
     * 보유 중인 아이템 목록을 5열 격자 형태로 렌더링합니다.
     */
    private renderInventoryGrid() {
        this.itemGridContainer.removeAll(true);

        const cols = 5;
        const spacing = 80;

        this.gameState.inventory.forEach((item, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = col * spacing;
            const y = row * spacing;

            // 아이템 슬롯 배경
            const bg = this.add.rectangle(x, y, 64, 64, 0x000000, 0.05).setStrokeStyle(1, 0x4a3b2a);

            // 아이템 아이콘
            const icon = this.add.image(x, y, item.atlasKey, item.frame).setDisplaySize(48, 48);
            icon.setInteractive();

            icon.on('pointerover', () => {
                this.updateTooltip(item);
                bg.setFillStyle(0x000000, 0.2);
            });
            icon.on('pointerout', () => {
                bg.setFillStyle(0x000000, 0.05);
            });
            icon.on('pointerdown', () => {
                if (item.type !== ItemType.CONSUMABLE) {
                    this.gameState.equipItem(item);
                    this.scene.restart(); // 화면 갱신
                }
            });

            this.itemGridContainer.add([bg, icon]);
        });
    }

    /**
     * 아이템 상세 정보(이름, 설명, 스탯)를 툴팁 영역에 업데이트합니다.
     * @param item 정보를 표시할 아이템 객체
     */
    private updateTooltip(item: Item) {
        let statsStr = '';
        if (item.stats.atk) statsStr += `공격력 +${NumberFormatter.formatCompact(item.stats.atk)} `;
        if (item.stats.def) statsStr += `방어력 +${NumberFormatter.formatCompact(item.stats.def)} `;
        if (item.stats.hp) statsStr += `체력 +${NumberFormatter.formatCompact(item.stats.hp)} `;
        if (item.stats.luk) statsStr += `운 +${NumberFormatter.formatCompact(item.stats.luk)} `;

        this.tooltipText.setText(`[${item.name}]\n${item.description}\n${statsStr}`);
    }
}
