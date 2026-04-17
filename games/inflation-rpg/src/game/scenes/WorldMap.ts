import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { DataManager } from '../DataManager';
import { GameState } from '../GameState';
import { I18n } from '../i18n/I18nManager';
import { GridPhysics } from '../physics/GridPhysics';
import { Direction } from '../physics/Direction';
import { WorldMapGenerator } from './WorldMapGenerator';
import { WorldMapManager } from './WorldMapManager';

/**
 * 게임의 메인 월드 맵을 담당하는 씬 클래스입니다.
 * 플레이어 이동, 카메라 제어, 씬 전환 및 인카운터 오케스트레이션을 담당합니다.
 */
export class WorldMap extends Scene {
    /** 플레이어 캐릭터 스프라이트 객체 */
    private player!: Phaser.GameObjects.Sprite;
    /** 그리드 기반 이동 및 충돌 처리를 담당하는 물리 관리자 */
    private gridPhysics!: GridPhysics;
    /** 키보드 화살표 입력을 받기 위한 객체 */
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    /** 현재 씬의 타일맵 정보 객체 */
    private map!: Phaser.Tilemaps.Tilemap;
    /** 지면 타일들이 그려지는 레이어 */
    private groundLayer!: Phaser.Tilemaps.TilemapLayer;
    /** 장식용 오브젝트들이 그려지는 레이어 */
    private decorLayer!: Phaser.Tilemaps.TilemapLayer;
    /** 지형 및 랜드마크 생성을 담당하는 생성기 */
    private generator: WorldMapGenerator;
    /** 인카운터 판정 및 구역 로직을 담당하는 관리자 */
    private manager: WorldMapManager;
    /** 전투 발생을 위한 걸음 수 임계치 (가변적) */
    private encounterThreshold = 50;

    /**
     * WorldMap의 생성자입니다. 매니저 클래스들을 초기화합니다.
     */
    constructor() {
        super('WorldMap');
        this.generator = new WorldMapGenerator(this);
        this.manager = new WorldMapManager();
    }

    /**
     * 씬을 생성하고 맵, 플레이어, UI 등을 초기화합니다.
     */
    create() {
        DataManager.loadMonsterData();

        // 1. 타일맵 생성 및 레이어 초기화
        this.map = this.make.tilemap({ tileWidth: 32, tileHeight: 32, width: 100, height: 100 });
        const allTilesets = this.loadTilesets();
        this.groundLayer = this.map.createBlankLayer('Ground', allTilesets, 0, 0, 100, 100, 32, 32)!;
        this.decorLayer = this.map.createBlankLayer('Decoration', allTilesets, 0, 0, 100, 100, 32, 32)!;
        this.decorLayer.setDepth(5);

        // 2. 지형 및 오브젝트 생성 위임
        this.generator.generateTerrain(this.map, this.groundLayer);
        this.generator.buildPointsOfInterest(this.map, this.decorLayer);

        // 3. 플레이어 및 물리 설정
        this.player = this.add.sprite(1600, 1600, 'joseon_warrior_sheet', 0).setDepth(10);
        this.gridPhysics = new GridPhysics(this.player, 32);
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.createAnimations();

        // 4. 카메라 및 입력 핸들링
        this.setupCamera();
        this.setupInputs();
        this.createUI();

        EventBus.emit('current-scene-ready', this);
    }

    /**
     * 필요한 타일셋 이미지 리소스들을 맵에 로드합니다.
     * @returns 로드된 타일셋 객체 배열
     */
    private loadTilesets() {
        return [
            this.map.addTilesetImage('joseon_tileset', 'joseon_tileset', 32, 32)!,
            this.map.addTilesetImage('tileset_biome_1', 'tileset_biome_1', 32, 32)!,
            this.map.addTilesetImage('tileset_biome_2', 'tileset_biome_2', 32, 32)!,
            this.map.addTilesetImage('tileset_biome_4', 'tileset_biome_4', 32, 32)!
        ];
    }

    /**
     * 플레이어를 따라다니는 메인 카메라의 설정을 수행합니다.
     */
    private setupCamera() {
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.setZoom(2.0);
    }

    /**
     * 키보드 단축키(상점, 인벤토리 등) 기능을 활성화합니다.
     */
    private setupInputs() {
        this.input.keyboard!.on('keydown-S', () => this.scene.launch('ShopScene'));
        this.input.keyboard!.on('keydown-I', () => this.scene.launch('InventoryScene'));
    }

    /**
     * 캐릭터 이동 방향별 애니메이션 데이터를 생성합니다.
     */
    private createAnimations() {
        const config = { frameRate: 10, repeat: -1 };
        const keys = ['down', 'left', 'right', 'up'];
        keys.forEach((key, i) => {
            this.anims.create({
                key: `walk-${key}`,
                frames: this.anims.generateFrameNumbers('joseon_warrior_sheet', { start: i * 4, end: i * 4 + 3 }),
                ...config
            });
        });
    }

    /**
     * 매 프레임 플레이어의 이동 입력 및 물리 엔진을 업데이트합니다.
     */
    update(time: number, delta: number) {
        this.gridPhysics.update(delta);

        if (!this.gridPhysics.isMoving()) {
            this.handlePlayerInput();
        }
    }

    /** 키보드 입력을 확인하여 플레이어 이동 및 애니메이션 처리 */
    private handlePlayerInput() {
        const direction = this.getDesiredDirection();

        if (direction !== Direction.NONE) {
            this.startPlayerMovement(direction);
        } else {
            this.player.stop();
        }
    }

    /** 현재 눌린 키에 따른 이동 방향 반환 */
    private getDesiredDirection(): Direction {
        if (this.cursors.left.isDown) return Direction.LEFT;
        if (this.cursors.right.isDown) return Direction.RIGHT;
        if (this.cursors.up.isDown) return Direction.UP;
        if (this.cursors.down.isDown) return Direction.DOWN;
        return Direction.NONE;
    }

    /** 특정 방향으로 플레이어 이동 시작 */
    private startPlayerMovement(direction: Direction) {
        const animKeys: Record<string, string> = {
            [Direction.LEFT]: 'left',
            [Direction.RIGHT]: 'right',
            [Direction.UP]: 'up',
            [Direction.DOWN]: 'down'
        };
        this.player.play(`walk-${animKeys[direction]}`, true);
        this.gridPhysics.movePlayer(direction);
        this.onStep();
    }

    /**
     * 한 걸음 이동할 때마다 발생하는 상태 변화(걸음 수 증가, 인카운터 체크)를 처리합니다.
     */
    private onStep() {
        GameState.getInstance().addStep();
        this.playStepSound();
        this.checkYaksuPoint();
        if (GameState.getInstance().stats.steps > this.encounterThreshold) {
            this.triggerEncounter();
        }
    }

    /**
     * 현재 위치가 약수터 타일인지 확인하고, 아직 사용하지 않았다면 BP(걸음 수)를 회복합니다.
     */
    private checkYaksuPoint() {
        const tx = Math.floor(this.player.x / 32);
        const ty = Math.floor(this.player.y / 32);
        const tile = this.map.getTileAt(tx, ty, true, 'Decoration');
        
        // 타일 인덱스 25가 약수터
        if (tile && tile.index === 25) {
            const yaksuId = `yaksu_${tx}_${ty}`;
            const state = GameState.getInstance();
            
            if (state.useYaksu(yaksuId)) {
                // 메시지 표시 (임시 텍스트 연출)
                const i18n = I18n.getInstance();
                const msg = this.add.text(this.player.x, this.player.y - 40, i18n.get('locations.yaksu_message'), {
                    fontFamily: '"Gowun Batang", serif', fontSize: 14, color: '#4caf50', fontStyle: 'bold',
                    stroke: '#ffffff', strokeThickness: 2
                }).setOrigin(0.5);
                
                this.tweens.add({
                    targets: msg,
                    y: msg.y - 50,
                    alpha: 0,
                    duration: 2000,
                    onComplete: () => msg.destroy()
                });
            }
        }
    }

    /**
     * 현재 밟고 있는 지형 타일에 맞는 발소리 효과음을 재생합니다.
     */
    private playStepSound() {
        const tx = Math.floor(this.player.x / 32);
        const ty = Math.floor(this.player.y / 32);
        const tile = this.map.getTileAt(tx, ty, true, 'Ground');
        
        const type = this.manager.getStepType(tile?.index || 0, {
            b1: this.map.getTileset('tileset_biome_1')?.firstgid || 999,
            b2: this.map.getTileset('tileset_biome_2')?.firstgid || 999
        });
        
        this.sound.play(`step_${type}_${Phaser.Math.Between(0, 4)}`, { volume: 0.15 });
    }

    /**
     * 전투 인카운터를 발생시키고 BattleScene으로 전환합니다.
     */
    private triggerEncounter() {
        const tx = Math.floor(this.player.x / 32);
        const ty = Math.floor(this.player.y / 32);
        const monsterId = this.manager.getMonsterForLocation(tx, ty);
        GameState.getInstance().stats.steps = 0;
        this.encounterThreshold = Phaser.Math.Between(30, 80);
        this.scene.pause();
        this.scene.launch('BattleScene', { monsterId });
    }

    /**
     * 현재 위치한 지역 명칭 등 화면 상단 UI를 생성합니다.
     */
    private createUI() {
        const i18n = I18n.getInstance();
        const container = this.add.container(10, 10).setScrollFactor(0);
        container.add([
            this.add.image(0, 0, 'UI_Panel_Beige').setOrigin(0).setDisplaySize(200, 50),
            this.add.text(100, 25, `${i18n.get('ui.zone_prefix')}Hanyang`, {
                fontFamily: '"Gowun Batang", serif', fontSize: 20, color: '#4a3b2a', fontStyle: 'bold'
            }).setOrigin(0.5)
        ]);
    }
}
