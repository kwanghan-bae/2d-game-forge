import { Scene } from 'phaser';

/**
 * 게임 실행에 필요한 모든 에셋(이미지, 사운드, 데이터)을 미리 불러오는 씬입니다.
 * 로딩 진행 상태를 시각적인 바(Bar)로 표시합니다.
 */
export class Preloader extends Scene {
    /**
     * Preloader의 생성자입니다.
     */
    constructor() {
        super('Preloader');
    }

    /**
     * 로딩 화면의 초기 UI(배경, 진행 바)를 설정합니다.
     */
    init() {
        // 부팅 씬에서 로드한 임시 배경 표시
        this.add.image(512, 384, 'background');

        // 로딩 바 외곽선
        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

        // 실제 진행도를 나타낼 바
        const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);

        // Phaser 로더 이벤트를 통한 바 갱신
        this.load.on('progress', (progress: number) => {
            bar.width = 4 + (460 * progress);
        });
    }

    /**
     * 모든 게임 자원을 카테고리별로 나누어 로드합니다.
     */
    preload() {
        this.load.setPath('assets');

        this.loadBackgrounds();
        this.loadSpritesheets();
        this.loadTilesets();
        this.loadUIAssets();
        this.loadAudio();
        this.loadDataFiles();
    }

    /** 배경 이미지 에셋 로드 */
    private loadBackgrounds() {
        this.load.image('title_bg', 'images/title_bg.png');
        this.load.image('bg_palace', 'images/chosun_battle_bg.png');
    }

    /** 스프라이트 시트 및 애니메이션용 에셋 로드 */
    private loadSpritesheets() {
        this.load.spritesheet('terrain_joseon', 'images/terrain_joseon.png', { frameWidth: 341, frameHeight: 512 });
        this.load.spritesheet('item_joseon', 'images/item_joseon.png', { frameWidth: 256, frameHeight: 256 });
        this.load.spritesheet('skill_joseon', 'images/skill_joseon.png', { frameWidth: 256, frameHeight: 256 });
        this.load.spritesheet('joseon_warrior_sheet', 'images/joseon_warrior_sheet.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('roguelike_decor', 'images/roguelike_decor.png', { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('tiny_town_sheet', 'images/tiny_town_sheet.png', { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('tiny_battle_sheet', 'images/tiny_battle_sheet.png', { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('tiny_dungeon_sheet', 'images/tiny_dungeon_sheet.png', { frameWidth: 16, frameHeight: 16 });
    }

    /** 타일맵 및 타일셋 이미지 에셋 로드 */
    private loadTilesets() {
        this.load.image('joseon_tileset', 'images/joseon_tileset.png');
        this.load.image('joseon_fantasy_tileset', 'images/joseon_fantasy_tileset.png');
        this.load.image('joseon_building_tileset', 'images/joseon_building_tileset.png');
        this.load.image('roguelike_full_sheet', 'images/roguelike_full_sheet.png');
        this.load.image('tileset_biome_1', 'images/tileset_biome_1.jpg');
        this.load.image('tileset_biome_2', 'images/tileset_biome_2.jpg');
        this.load.image('tileset_biome_3', 'images/tileset_biome_3.jpg');
        this.load.image('tileset_biome_4', 'images/tileset_biome_4.jpg');
        this.load.image('tileset_joseon_extra', 'images/tileset_joseon_extra.jpg');
        this.load.image('pixel_tileset', 'images/pixel_tileset.png');
    }

    /** UI 관련 이미지 및 아이콘 에셋 로드 */
    private loadUIAssets() {
        this.load.image('UI_Panel_Beige', 'images/UI/ui_panel_beige.png');
        this.load.image('panel_main', 'images/UI/panel_main.png');
        this.load.image('panel_inset', 'images/UI/panel_inset.png');
        this.load.image('btn_beige', 'images/UI/ui_button_beige.png');
        this.load.image('btn_beige_pressed', 'images/UI/ui_button_beige_pressed.png');
        this.load.image('btn_beige_long', 'images/UI/btn_beige_long.png');
        this.load.image('btn_beige_long_pressed', 'images/UI/btn_beige_long_pressed.png');
        this.load.image('bar_back', 'images/UI/bar_back.png');
        this.load.image('bar_green', 'images/UI/bar_green.png');
        this.load.image('bar_red', 'images/UI/bar_red.png');
        this.load.image('bar_yellow', 'images/UI/bar_yellow.png');
        this.load.image('cursor_sword', 'images/UI/cursor_sword.png');
        this.load.image('cursor_hand', 'images/UI/cursor_hand.png');
        this.load.image('icon_check', 'images/UI/icons/check.png');
        this.load.image('icon_cross', 'images/UI/icons/cross.png');
        this.load.image('icon_circle', 'images/UI/icons/circle.png');
        this.load.image('arrow_left', 'images/UI/icons/arrow_left.png');
        this.load.image('arrow_right', 'images/UI/icons/arrow_right.png');
    }

    /** 오디오 효과음 및 배경음 에셋 로드 */
    private loadAudio() {
        this.load.audio('impact_wood', 'sounds/impact_wood.ogg');
        this.load.audio('impact_metal', 'sounds/impact_metal.ogg');
        this.load.audio('impact_punch', 'sounds/impact_punch.ogg');
        this.load.audio('impact_heavy_metal', 'sounds/impact_heavy_metal.ogg');
        this.load.audio('impact_soft', 'sounds/impact_soft.ogg');
        this.load.audio('ui_click', 'sounds/ui_click.ogg');
        this.load.audio('notify_major', 'sounds/notify_major.ogg');

        // 발소리 베리에이션 로드
        for (let i = 0; i < 5; i++) {
            this.load.audio(`step_grass_${i}`, `sounds/step_grass_${i}.ogg`);
            this.load.audio(`step_wood_${i}`, `sounds/step_wood_${i}.ogg`);
            this.load.audio(`step_snow_${i}`, `sounds/step_snow_${i}.ogg`);
            this.load.audio(`step_stone_${i}`, `sounds/step_stone_${i}.ogg`);
        }
    }

    /** JSON 데이터 및 기타 파일 로드 */
    private loadDataFiles() {
        this.load.json('tileset_mapping', 'data/tileset_mapping.json');
        this.load.image('monster_dokkaebi', 'images/monster_dokkaebi.png');
        this.load.image('player_warrior', 'images/player_warrior.png');
        this.load.image('slash_effect', 'images/slash_effect.png');
    }

    /**
     * 로딩이 완료된 후 메인 메뉴 씬으로 전환합니다.
     */
    create() {
        this.scene.start('MainMenu');
    }
}
