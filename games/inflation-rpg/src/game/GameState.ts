import { Item, ItemType } from './data/ItemData';
import { StatManager } from './StatManager';
import { PlayerStats } from './types/PlayerTypes';
import { GameStateRestorer } from './state/GameStateRestorer';

/**
 * 게임의 전반적인 상태를 관리하는 클래스입니다.
 * 플레이어의 스탯, 인벤토리, 장착 아이템, 해금된 직업 등을 관리하며 싱글톤 패턴으로 구현되었습니다.
 */
export class GameState {
    /** GameState의 싱글톤 인스턴스 */
    private static instance: GameState;
    /** 플레이어의 현재 능력치 및 상태 정보 */
    public stats: PlayerStats;
    /** 플레이어가 보유 중인 아이템 목록 */
    public inventory: Item[] = [];
    /** 부위별로 장착 중인 아이템 정보 */
    public equipment: { [key in ItemType]?: Item } = {};

    /** 현재 선택된 직업 ID */
    public selectedClass: string | null = null;
    /** 플레이어의 영혼 등급 (환생 등을 통해 상승) */
    public soulGrade: number = 0;
    /** 플레이어의 업보 수치 */
    public karma: number = 0;
    /** 활성화된 스킬들의 남은 재사용 대기시간 (초) */
    public activeSkillCooldowns: { [skillId: number]: number } = {};
    /** 격파한 보스 몬스터들의 ID 목록 */
    public defeatedBosses: number[] = [];
    /** 해금된 직업 ID 목록 */
    public unlockedClasses: string[] = ['hwarang']; // 화랑은 기본 해금
    /** 세이브 데이터 버전 */
    public saveVersion: number = 1;
    /** 사용한 약수터 ID 목록 */
    public usedYaksuPoints: string[] = [];

    /**
     * GameState의 생성자입니다. 초기 스탯을 설정합니다.
     */
    private constructor() {
        this.stats = {
            hp: 100,
            maxHp: 100,
            gold: 0,
            level: 1,
            exp: 0,
            maxExp: 100,
            attack: 10,
            defense: 5,
            agi: 5,
            luk: 5,
            steps: 0,
            zone: 'Hanyang'
        };
    }

    /**
     * GameState의 싱글톤 인스턴스를 반환합니다.
     * @returns GameState 인스턴스
     */
    public static getInstance(): GameState {
        if (!GameState.instance) {
            GameState.instance = new GameState();
        }
        return GameState.instance;
    }

    /**
     * 테스트용 싱글톤 초기화 메서드입니다.
     */
    public static resetInstance(): void {
        GameState.instance = null as any;
    }

    public reset() {
        this.inventory = [];
        this.equipment = {};
        this.stats = {
            hp: 100,
            maxHp: 100,
            gold: 0,
            level: 1,
            exp: 0,
            maxExp: 100,
            attack: 10,
            defense: 5,
            agi: 5,
            luk: 5,
            steps: 0,
            zone: 'Hanyang'
        };
        this.selectedClass = null;
        this.soulGrade = 0;
        this.karma = 0;
        this.activeSkillCooldowns = {};
        this.defeatedBosses = [];
        this.saveVersion = 1;
        this.usedYaksuPoints = [];
        this.updateUnlockedClassesBySoulGrade();
    }

    /** 플레이어에게 골드를 추가합니다. */
    public addGold(amount: number) { this.stats.gold += amount; }
    /** 플레이어의 체력을 회복시킵니다. */
    public heal(amount: number) { 
        this.stats.hp = Math.min(this.stats.hp + amount, this.stats.maxHp); 
        StatManager.hp = this.stats.hp;
    }
    /** 플레이어에게 데미지를 입힙니다. */
    public takeDamage(amount: number) { 
        this.stats.hp = Math.max(0, this.stats.hp - amount); 
        StatManager.hp = this.stats.hp;
    }
    /** 플레이어의 이동 걸음 수를 1 증가시킵니다. */
    public addStep() { this.stats.steps++; }

    /** 안전 지대에서 상태를 부분적으로 초기화합니다. */
    public softReset() {
        this.stats.hp = this.stats.maxHp;
        this.stats.steps = 0;
    }

    /** 공격력의 +/- 10% 분산이 적용된 데미지를 계산합니다. */
    public getDamage(): number {
        const variance = Math.floor(this.stats.attack * 0.1);
        const randomVar = Math.floor(Math.random() * (variance * 2 + 1)) - variance;
        return this.stats.attack + randomVar;
    }

    /** 경험치를 획득하고 레벨업을 처리합니다. */
    public gainExp(amount: number) {
        this.stats.exp += amount;
        if (this.stats.exp >= this.stats.maxExp) {
            this.levelUp();
        }
    }

    /** 골드를 획득합니다. */
    public gainGold(amount: number) { this.stats.gold += amount; }

    /** 레벨업 처리 및 스탯 재계산 */
    private levelUp() {
        this.stats.level++;
        this.stats.exp -= this.stats.maxExp;
        this.stats.maxExp = Math.floor(this.stats.maxExp * 1.5);
        this.recalculateStats();
        this.stats.hp = this.stats.maxHp;
    }

    /** 인벤토리에 아이템을 추가합니다. */
    public addItem(item: Item) { this.inventory.push(item); }

    /** 아이템을 장착하고 기존 장비는 인벤토리로 되돌립니다. */
    public equipItem(item: Item) {
        const slot = item.type;
        if (slot === ItemType.CONSUMABLE) return;

        const oldItem = this.equipment[slot];
        if (oldItem) this.inventory.push(oldItem);

        this.equipment[slot] = item;
        const index = this.inventory.findIndex(i => i.id === item.id);
        if (index > -1) this.inventory.splice(index, 1);
        
        this.recalculateStats();
    }

    /** 장착된 아이템을 해제하여 인벤토리로 이동시킵니다. */
    public unequipItem(slot: ItemType) {
        const item = this.equipment[slot];
        if (item) {
            this.inventory.push(item);
            delete this.equipment[slot];
            this.recalculateStats();
        }
    }

    /** 레벨과 장비를 기반으로 스탯을 재계산합니다. */
    private recalculateStats() {
        StatManager.recalculate(this.stats, this.equipment);
    }

    /** 게임 상태를 JSON 객체로 직렬화합니다. */
    public toJSON() {
        return {
            stats: { ...this.stats },
            inventory: this.inventory.map(item => ({ ...item })),
            equipment: Object.fromEntries(
                Object.entries(this.equipment).map(([slot, item]) => [slot, item ? { ...item } : null])
            ),
            selectedClass: this.selectedClass,
            soulGrade: this.soulGrade,
            karma: this.karma,
            activeSkillCooldowns: { ...this.activeSkillCooldowns },
            defeatedBosses: [...this.defeatedBosses],
            unlockedClasses: [...this.unlockedClasses],
            saveVersion: this.saveVersion,
            usedYaksuPoints: [...this.usedYaksuPoints]
        };
    }

    /** 저장된 데이터로부터 게임 상태를 복원합니다. */
    public fromJSON(data: unknown): void {
        if (!data || typeof data !== 'object') return;
        GameStateRestorer.restore(this, data);
        this.recalculateStats();
    }

    /** 플레이어의 직업을 설정합니다. */
    public setClass(classId: string | null): void { this.selectedClass = classId; }
    /** 특정 직업의 해금 여부를 확인합니다. */
    public isClassUnlocked(classId: string): boolean { return this.unlockedClasses.includes(classId); }
    /** 격파한 보스 목록에 보스 ID를 추가합니다. */
    public addDefeatedBoss(bossId: number): void { this.defeatedBosses.push(bossId); }
    /** 특정 보스를 격파했는지 확인합니다. */
    public isBossDefeated(bossId: number): boolean { return this.defeatedBosses.includes(bossId); }

    /** 약수터를 사용하여 발걸음 수를 차감하고 사용 기록을 남깁니다. */
    public useYaksu(yaksuId: string): boolean {
        if (this.isYaksuPointUsed(yaksuId)) return false;
        
        this.addUsedYaksuPoint(yaksuId);
        this.stats.steps = Math.max(0, this.stats.steps - 50);
        return true;
    }

    /** 사용한 약수터 목록에 추가합니다. */
    public addUsedYaksuPoint(yaksuId: string): void {
        if (!this.usedYaksuPoints.includes(yaksuId)) {
            this.usedYaksuPoints.push(yaksuId);
        }
    }

    /** 특정 약수터를 사용했는지 확인합니다. */
    public isYaksuPointUsed(yaksuId: string): boolean {
        return this.usedYaksuPoints.includes(yaksuId);
    }

    /** 영혼 등급에 따라 해금 가능한 직업 목록을 갱신합니다. */
    public updateUnlockedClassesBySoulGrade(): void {
        this.unlockedClasses = ['hwarang'];
        if (this.soulGrade >= 3) this.unlockedClasses.push('tiger_hunter');
        if (this.soulGrade >= 4) this.unlockedClasses.push('mudang');
        if (this.soulGrade >= 5) this.unlockedClasses.push('choeui');
    }
}
