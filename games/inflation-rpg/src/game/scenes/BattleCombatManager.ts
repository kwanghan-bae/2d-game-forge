import { MonsterData, getScaledMonsterStats } from '../data/MonsterData';
import { GameState } from '../GameState';
import { SkillManager } from '../core/SkillManager';
import { BossAI } from '../core/BossAI';
import { applyPassiveEffect, Stats } from '../utils/StatCalculator';
import { ClassId } from '../data/ClassData';
import { BATTLE_CONFIG } from '../constants';

/**
 * 전투의 핵심 비즈니스 로직(데미지 계산, 턴 진행, 보상 처리 등)을 담당하는 클래스입니다.
 * Phaser의 시각적 요소와 분리되어 순수 로직을 관리합니다.
 */
export class BattleCombatManager {
    /** 현재 상대 중인 몬스터의 데이터 */
    private monster: MonsterData | undefined;
    /** 적의 현재 체력 수치 */
    private enemyHP = 0;
    /** 적의 최대 체력 수치 */
    private enemyMaxHP = 0;
    /** 현재 전투가 보스전인지 여부 */
    private isBossBattle = false;
    /** 플레이어의 스킬 상태를 관리하는 매니저 */
    private skillManager: SkillManager;
    /** 보스 몬스터의 인공지능 패턴 관리자 */
    private bossAI?: BossAI;
    /** 짐승형 몬스터에 대한 데미지 증가 배율 (패시브) */
    private beastDamageMultiplier = 1;
    /** 아이템 및 골드 획득 확률 증가 배율 (패시브) */
    private dropRateMultiplier = 1;

    /**
     * BattleCombatManager의 생성자입니다. 스킬 매니저를 초기화합니다.
     */
    constructor() {
        this.skillManager = new SkillManager();
    }

    /**
     * 전투를 시작하기 위해 몬스터 데이터를 설정하고 초기 상태를 구축합니다.
     * @param monster 상대할 몬스터 데이터 객체
     */
    public init(monster: MonsterData | undefined): void {
        this.monster = monster;
        if (monster) {
            this.enemyHP = monster.baseHP;
            this.enemyMaxHP = monster.baseHP;
            this.isBossBattle = !!monster.isBoss;
            
            if (this.isBossBattle) {
                this.enemyMaxHP *= 10;
                this.enemyHP = this.enemyMaxHP;
                this.bossAI = new BossAI();
            }
        }
        this.applyClassPassive();
    }

    /**
     * 플레이어의 현재 직업에 따른 상시 지속 효과(패시브)를 전투 스탯에 적용합니다.
     */
    private applyClassPassive(): void {
        const gameState = GameState.getInstance();
        if (!gameState.selectedClass) return;

        const currentStats: Stats = {
            hp: gameState.stats.hp,
            attack: gameState.stats.attack,
            defense: gameState.stats.defense,
            agi: gameState.stats.agi,
            luk: gameState.stats.luk
        };

        const passive = applyPassiveEffect(gameState.selectedClass as ClassId, currentStats);

        // 스탯 배율 적용
        if (passive.statMultipliers) {
            const m = passive.statMultipliers;
            gameState.stats.maxHp = Math.floor(gameState.stats.maxHp * (m.hp || 1));
            gameState.stats.hp = gameState.stats.maxHp;
            gameState.stats.attack = Math.floor(gameState.stats.attack * (m.attack || 1));
            gameState.stats.defense = Math.floor(gameState.stats.defense * (m.defense || 1));
        }

        // 공격력 보너스 적용
        if (passive.attackBonus) {
            gameState.stats.attack += passive.attackBonus;
        }

        // 특수 전투 배율 적용
        if (passive.beastDamageMultiplier && this.monster && this.isBeastType(this.monster)) {
            this.beastDamageMultiplier = passive.beastDamageMultiplier;
        }

        if (passive.dropRateMultiplier) {
            this.dropRateMultiplier = passive.dropRateMultiplier;
        }
    }

    /**
     * 현재 몬스터의 최종 방어력을 계산합니다. (보스 기믹 배율 포함)
     * @returns 계산된 최종 방어력 수치
     */
    private getMonsterDefense(): number {
        if (!this.monster) return 0;
        
        // MonsterData의 공통 스케일링 로직 사용
        const scaled = getScaledMonsterStats(
            this.monster.baseHP,
            this.monster.baseATK,
            this.monster.baseDEF,
            this.monster.zoneLv
        );
        let defense = scaled.def;

        // 구미호 기믹: 방어막 활성화 시 방어력 500% 상승
        if (this.monster.id === BATTLE_CONFIG.BOSS_ID_GUMIHO && this.bossAI?.isGimmickActive()) {
            defense *= 5;
        }

        return defense;
    }

    /**
     * 현재 플레이어의 한 턴 일반 공격 데미지를 계산합니다.
     * @returns 최종 계산된 데미지 수치와 치명타 여부를 포함한 객체
     */
    public calculatePlayerAttack(): { damage: number, isCrit: boolean } {
        let damage = GameState.getInstance().getDamage();
        
        if (this.beastDamageMultiplier > 1 && this.isBeastType(this.monster)) {
            damage = Math.floor(damage * this.beastDamageMultiplier);
        }

        const isCrit = Math.random() < BATTLE_CONFIG.CRIT_CHANCE;
        let finalDmg = isCrit ? Math.floor(damage * BATTLE_CONFIG.CRIT_MULTIPLIER) : damage;

        // 방어력 적용
        const monsterDef = this.getMonsterDefense();
        finalDmg = Math.max(1, finalDmg - monsterDef);
        
        this.enemyHP = Math.max(0, this.enemyHP - finalDmg);

        // 공격 후에 기믹 체크 (공격 전 체크하면 해당 공격이 이미 방어막의 영향을 받게 됨)
        if (this.monster && this.bossAI) {
            this.bossAI.updateGimmick(this.monster.id, this.enemyHP, this.enemyMaxHP);
        }

        return { damage: finalDmg, isCrit };
    }

    /**
     * 적(몬스터)의 공격 데미지를 계산하고 플레이어의 현재 체력을 감소시킵니다.
     * @returns 플레이어에게 가해진 최종 데미지 수치
     */
    public calculateEnemyAttack(): number {
        const expVal = this.monster ? this.monster.expReward : 10;
        const damage = Math.floor(expVal * 0.5) + GameState.getInstance().stats.level;
        
        GameState.getInstance().takeDamage(damage);

        // 몬스터 공격 턴 종료 시 기믹 지속 시간 업데이트
        if (this.bossAI) {
            this.bossAI.processGimmickTurn();
        }

        return damage;
    }

    /**
     * 보스 몬스터일 경우 특수 공격 패턴을 실행하고 그 결과를 반환합니다.
     * @returns 보스 패턴 실행 결과 객체 또는 null
     */
    public executeBossPattern() {
        if (this.bossAI && this.isBossBattle && this.monster) {
            return this.bossAI.executePattern(this.monster);
        }
        return null;
    }

    /**
     * 현재 플레이어에게 적용 중인 모든 상태 이상 효과(출혈, 버프 등)를 처리합니다.
     * @returns 상태 이상 종합 처리 결과 객체
     */
    public processStatusEffects() {
        const stats = GameState.getInstance().stats;
        return this.skillManager.processStatusEffects({
            hp: stats.hp,
            maxHp: stats.maxHp,
            attack: stats.attack,
            defense: stats.defense
        });
    }

    /**
     * 현재 상대 중인 몬스터가 짐승형(Beast)인지 여부를 판별합니다.
     * @param monster 판별할 몬스터 데이터
     * @returns 짐승형 여부
     */
    private isBeastType(monster: MonsterData | undefined): boolean {
        if (!monster) return false;
        const name = (monster.nameKR || monster.name).toLowerCase();
        return ['호랑이', 'tiger', '늑대', 'wolf'].some(k => name.includes(k));
    }

    /** 현재 적의 체력을 반환합니다. */
    public getEnemyHP() { return this.enemyHP; }
    /** 적의 최대 체력을 반환합니다. */
    public getEnemyMaxHP() { return this.enemyMaxHP; }
    /** 스킬 관리자 인스턴스를 반환합니다. */
    public getSkillManager() { return this.skillManager; }
    /** 현재 상대 중인 몬스터 데이터를 반환합니다. */
    public getMonster() { return this.monster; }
    /** 현재 전투가 보스전인지 여부를 반환합니다. */
    public isBoss() { return this.isBossBattle; }
    
    /** 적의 체력을 수동으로 감소시킵니다. (상태 이상 데미지 등 용도) */
    public subEnemyHP(amount: number) { 
        this.enemyHP = Math.max(0, this.enemyHP - amount); 
        // 수동 체력 감소 시에도 기믹 체크가 필요할 수 있음
        if (this.monster && this.bossAI) {
            this.bossAI.updateGimmick(this.monster.id, this.enemyHP, this.enemyMaxHP);
        }
    }
}
