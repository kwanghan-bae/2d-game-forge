import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { DataManager } from '../DataManager';
import { GameState } from '../GameState';
import { BattleUIManager } from './BattleUIManager';
import { BattleCombatManager } from './BattleCombatManager';
import { InflationManager } from '../utils/InflationManager';
import { KarmaManager } from '../utils/KarmaManager';
import { VISUAL_CONSTANTS, BATTLE_CONFIG, SOUND_KEYS, SCENE_KEYS } from '../constants';

/**
 * 전투 화면을 담당하는 씬 클래스입니다.
 */
export class BattleScene extends Scene {
    /** 시각적 UI 요소를 전담 관리하는 매니저 */
    private uiManager: BattleUIManager;
    /** 전투의 수치 계산 및 논리 로직을 전담 관리하는 매니저 */
    private combatManager: BattleCombatManager;
    /** 현재 전투가 진행 중인지 여부 */
    private isBattleActive = false;
    /** 자동 전투의 한 턴을 주기적으로 실행하는 타이머 이벤트 */
    private battleLoopTimer?: Phaser.Time.TimerEvent;

    /**
     * BattleScene의 생성자입니다.
     */
    constructor() {
        super(SCENE_KEYS.BATTLE);
        this.uiManager = new BattleUIManager(this);
        this.combatManager = new BattleCombatManager();
    }

    /**
     * 씬 시작 시 데이터를 초기화합니다.
     * @param data 몬스터 ID 정보를 포함한 초기 데이터
     */
    init(data: { monsterId: number }) {
        const monster = DataManager.getMonster(data.monsterId);
        this.combatManager.init(monster);
        this.isBattleActive = true;
    }

    /**
     * 씬의 시각적 요소들을 생성합니다.
     */
    create() {
        this.createBackgroundElements();
        
        const playerSprite = this.createPlayerSprite();
        const monster = this.combatManager.getMonster();
        const enemySprite = this.createEnemySprite(monster);

        this.uiManager.createHUD(monster);
        this.uiManager.createSkillButtons(this.combatManager.getSkillManager(), (id) => this.onSkillUsed(id));
        
        if (this.combatManager.isBoss()) {
            this.uiManager.setupBossUI(monster);
        }

        this.startBattleLoop(playerSprite, enemySprite);
        EventBus.emit('current-scene-ready', this);
    }

    /**
     * 배경 이미지와 장식 요소들을 생성합니다.
     */
    private createBackgroundElements() {
        this.add.image(512, 384, VISUAL_CONSTANTS.BACKGROUND_KEY)
            .setDisplaySize(1024, 768)
            .setTint(VISUAL_CONSTANTS.BACKGROUND_DIM_TONE);
        
        this.add.image(300, 400, VISUAL_CONSTANTS.PANEL_KEY)
            .setDisplaySize(350, 450)
            .setAlpha(VISUAL_CONSTANTS.DEFAULT_ALPHA);
        
        this.add.image(724, 400, VISUAL_CONSTANTS.PANEL_KEY)
            .setDisplaySize(350, 450)
            .setAlpha(VISUAL_CONSTANTS.DEFAULT_ALPHA)
            .setFlipX(true);
    }

    /**
     * 플레이어 캐릭터 스프라이트를 생성합니다.
     * @returns 플레이어 이미지 객체
     */
    private createPlayerSprite(): Phaser.GameObjects.Image {
        return this.add.image(300, 400, VISUAL_CONSTANTS.PLAYER_SPRITE)
            .setScale(VISUAL_CONSTANTS.PLAYER_SCALE);
    }

    /**
     * 적 몬스터 스프라이트를 생성합니다.
     * @param monster 몬스터 데이터
     * @returns 적 이미지 객체
     */
    private createEnemySprite(monster: any): Phaser.GameObjects.Image {
        let monsterKey = monster ? monster.name : VISUAL_CONSTANTS.RAT_MONSTER;
        if (!this.textures.exists(monsterKey)) monsterKey = VISUAL_CONSTANTS.DOKKAEBI_MONSTER;
        
        return this.add.image(724, 400, monsterKey)
            .setScale(VISUAL_CONSTANTS.ENEMY_SCALE);
    }

    /**
     * 전투 루프 타이머를 시작합니다.
     * @param playerSprite 플레이어 이미지
     * @param enemySprite 적 이미지
     */
    private startBattleLoop(playerSprite: Phaser.GameObjects.Image, enemySprite: Phaser.GameObjects.Image) {
        this.time.delayedCall(BATTLE_CONFIG.START_DELAY, () => {
            this.battleLoopTimer = this.time.addEvent({
                delay: BATTLE_CONFIG.TURN_DELAY,
                callback: () => this.executeTurn(playerSprite, enemySprite),
                loop: true
            });
        });
    }

    /** 한 턴 실행 */
    private executeTurn(player: Phaser.GameObjects.Image, enemy: Phaser.GameObjects.Image) {
        if (!this.isBattleActive) return;

        if (this.checkBossDeath()) return;
        this.applyStatusEffects(enemy);

        this.tweens.add({
            targets: player, x: 400, duration: 150, yoyo: true,
            onComplete: () => this.handlePlayerAttackHit(player, enemy)
        });
    }

    /**
     * 보스의 패턴을 실행하고 특수 처사(즉사 등)를 체크합니다.
     * @returns 보스 패턴 실행 결과
     */
    private checkBossDeath(): boolean {
        const bossResult = this.combatManager.executeBossPattern();
        if (bossResult?.playerInstantDeath) {
            this.endBattle(false);
            return true;
        }
        return false;
    }

    /**
     * 현재 적용 중인 상태 효과(출혈 등)의 데미지를 처리합니다.
     * @param enemy 적 이미지 객체 (데미지 텍스트 팝업용)
     */
    private applyStatusEffects(enemy: Phaser.GameObjects.Image) {
        const status = this.combatManager.processStatusEffects();
        if (status.damage > 0) {
            this.combatManager.subEnemyHP(status.damage);
            this.uiManager.spawnDamageText(enemy.x, enemy.y, status.damage, false);
        }
    }

    /**
     * 플레이어의 공격 애니메이션 완료 시 실제 데미지를 계산하고 UI를 갱신합니다.
     */
    private handlePlayerAttackHit(player: Phaser.GameObjects.Image, enemy: Phaser.GameObjects.Image) {
        const atk = this.combatManager.calculatePlayerAttack();
        this.uiManager.updateHP(this.combatManager.getEnemyHP(), this.combatManager.getEnemyMaxHP());
        this.uiManager.spawnDamageText(enemy.x, enemy.y, atk.damage, atk.isCrit);
        
        if (atk.isCrit) {
            this.cameras.main.shake(100, 0.02);
            this.hitStop(50);
        } else {
            this.cameras.main.shake(100, 0.01);
        }
        
        this.sound.play(atk.isCrit ? SOUND_KEYS.IMPACT_HEAVY : SOUND_KEYS.IMPACT_WOOD);

        if (this.combatManager.getEnemyHP() <= 0) {
            this.endBattle(true);
        } else {
            this.time.delayedCall(500, () => this.enemyTurn(player, enemy));
        }
    }

    /**
     * 타격감을 강조하기 위해 게임의 시간 척도를 아주 잠깐 멈춥니다.
     * @param duration 멈출 시간 (밀리초)
     */
    private hitStop(duration: number) {
        this.time.timeScale = 0;
        this.time.delayedCall(duration, () => {
            this.time.timeScale = 1;
        });
    }

    /** 적 턴 실행 */
    private enemyTurn(p: Phaser.GameObjects.Image, e: Phaser.GameObjects.Image) {
        if (!this.isBattleActive) return;
        this.tweens.add({
            targets: e, x: 624, duration: 150, yoyo: true,
            onComplete: () => {
                const dmg = this.combatManager.calculateEnemyAttack();
                this.uiManager.updateHP(this.combatManager.getEnemyHP(), this.combatManager.getEnemyMaxHP());
                this.uiManager.spawnDamageText(p.x, p.y, dmg, false, true);
                this.sound.play(SOUND_KEYS.IMPACT_SOFT);
                if (GameState.getInstance().stats.hp <= 0) this.endBattle(false);
            }
        });
    }

    /** 스킬 사용 */
    private onSkillUsed(id: number) {
        const stats = GameState.getInstance().stats;
        const res = this.combatManager.getSkillManager().useSkill(id, {
            hp: stats.hp, maxHp: stats.maxHp, attack: stats.attack, defense: stats.defense
        });
        if (res.success && res.damage) {
            this.combatManager.subEnemyHP(res.damage);
            this.uiManager.spawnDamageText(this.scale.width * 0.7, this.scale.height * 0.5, res.damage, true);
            this.uiManager.updateHP(this.combatManager.getEnemyHP(), this.combatManager.getEnemyMaxHP());
            this.uiManager.updateSkillCooldowns(this.combatManager.getSkillManager());
        }
    }

    /**
     * 전투를 종료하고 결과에 따라 화면을 전환합니다.
     * @param win 플레이어 승리 여부
     */
    private endBattle(win: boolean) {
        this.isBattleActive = false;
        this.battleLoopTimer?.remove();
        
        if (win) {
            this.handleBattleWin();
        } else {
            this.handleBattleLoss();
        }
        
        this.sound.play(SOUND_KEYS.NOTIFY);
    }

    /** 전투 승리 시 처리 (보상 지급 및 씬 전환) */
    private handleBattleWin() {
        this.processRewards();
        this.scene.stop();
        this.scene.resume(SCENE_KEYS.WORLD_MAP);
    }

    /** 전투 패배 시 처리 (메인 메뉴로 이동 등) */
    private handleBattleLoss() {
        this.scene.stop();
        this.scene.resume(SCENE_KEYS.MAIN_MENU);
    }

    /**
     * 전투 승리 보상(경험치, 골드)을 계산하여 게임 상태에 반영합니다.
     */
    private processRewards() {
        const monster = this.combatManager.getMonster();
        if (!monster) return;

        const gs = GameState.getInstance();
        const gold = this.calculateFinalGold(monster);

        gs.gainExp(monster.expReward);
        gs.gainGold(gold);
        KarmaManager.getInstance().increaseKarma(1);

        if (this.combatManager.isBoss()) {
            gs.addDefeatedBoss(monster.id);
        }
    }

    /** 보스 여부와 인플레이션을 고려한 최종 골드 보상을 계산합니다. */
    private calculateFinalGold(monster: any): number {
        const baseGold = monster.baseGold * (this.combatManager.isBoss() ? 10 : 1);
        return Math.floor(InflationManager.getInstance().getInflatedPrice(baseGold));
    }
}
