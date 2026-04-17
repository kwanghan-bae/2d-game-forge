/**
 * 게임 전반에서 사용되는 시각적/수치적 상수들을 정의합니다.
 */
export const VISUAL_CONSTANTS = {
    BACKGROUND_DIM_TONE: 0x666666,
    BACKGROUND_KEY: 'bg_palace',
    DEFAULT_ALPHA: 0.6,
    PLAYER_SCALE: 0.35,
    ENEMY_SCALE: 0.35,
    PANEL_KEY: 'UI_Panel_Beige',
    PLAYER_SPRITE: 'player_warrior',
    RAT_MONSTER: 'monster_rat',
    DOKKAEBI_MONSTER: 'monster_dokkaebi'
};

/**
 * 사운드 리소스 키 정의
 */
export const SOUND_KEYS = {
    IMPACT_HEAVY: 'impact_heavy_metal',
    IMPACT_WOOD: 'impact_wood',
    IMPACT_SOFT: 'impact_soft',
    NOTIFY: 'notify_major'
};

/**
 * 씬 명칭 정의
 */
export const SCENE_KEYS = {
    BATTLE: 'BattleScene',
    WORLD_MAP: 'WorldMap',
    MAIN_MENU: 'MainMenu'
};

/**
 * 전투 시스템 설정
 */
export const BATTLE_CONFIG = {
    TURN_DELAY: 1500,
    START_DELAY: 1000,
    CRIT_MULTIPLIER: 1.5,
    CRIT_CHANCE: 0.2,
    BOSS_ID_GUMIHO: 9003
};
