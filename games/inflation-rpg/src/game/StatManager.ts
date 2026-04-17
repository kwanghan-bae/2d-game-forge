import BigNumber from 'bignumber.js';
import { signal } from "@preact/signals-react";
import { Item, ItemType } from './data/ItemData';
import { PlayerStats } from './types/PlayerTypes';

/**
 * 플레이어의 스탯 계산 및 성장 공식 로직을 전담하는 클래스입니다.
 * 인플레이션 컨셉에 맞춰 레벨에 따른 지수적 스탯 성장을 지원합니다.
 * Signals를 기반으로 스탯 변화를 실시간으로 통지합니다.
 */
export class StatManager {
    private static _hp = signal(100);
    private static _maxHp = signal(100);
    private static _attack = signal(10);
    private static _defense = signal(5);
    private static _agi = signal(5);
    private static _luk = signal(5);

    static get hp() { return this._hp.value; }
    static set hp(val: number) { this._hp.value = val; }

    static get maxHp() { return this._maxHp.value; }
    static set maxHp(val: number) { this._maxHp.value = val; }

    static get attack() { return this._attack.value; }
    static set attack(val: number) { this._attack.value = val; }

    static get defense() { return this._defense.value; }
    static set defense(val: number) { this._defense.value = val; }

    static get agi() { return this._agi.value; }
    static set agi(val: number) { this._agi.value = val; }

    static get luk() { return this._luk.value; }
    static set luk(val: number) { this._luk.value = val; }

    /**
     * 현재 레벨과 장착한 장비를 기반으로 플레이어의 최종 스탯을 다시 계산합니다.
     * @param stats 갱신할 플레이어 스탯 객체
     * @param equipment 현재 장착 중인 아이템 목록
     */
    public static recalculate(stats: PlayerStats, equipment: { [key in ItemType]?: Item }): void {
        const growthRate = this.getGrowthRate(stats.level);
        
        // 1. 레벨 기반 기본 스탯 계산 (지수 성장)
        const base = this.calculateBaseStats(stats.level, growthRate);
        
        // 2. 장비 기반 추가 능력치 계산
        const bonus = this.calculateEquipmentBonuses(equipment);

        // 3. 최종 스탯 합산 및 적용
        this.maxHp = Math.floor(base.hp.toNumber()) + bonus.hp;
        this.attack = Math.floor(base.atk.toNumber()) + bonus.atk;
        this.defense = Math.floor(base.def.toNumber()) + bonus.def;
        this.agi = 5 + bonus.agi; 
        this.luk = 5 + bonus.luk; 

        // 하위 호환성을 위해 stats 객체도 업데이트
        stats.maxHp = this.maxHp;
        stats.attack = this.attack;
        stats.defense = this.defense;
        stats.agi = this.agi;
        stats.luk = this.luk;
    }

    /**
     * 레벨에 따른 기본 스탯(HP, 공격력, 방어력)을 계산합니다.
     */
    private static calculateBaseStats(level: number, rate: number) {
        const growthFactor = new BigNumber(rate).pow(level);
        return {
            hp: new BigNumber(100).times(growthFactor),
            atk: new BigNumber(10).times(growthFactor),
            def: new BigNumber(5).times(growthFactor)
        };
    }

    /**
     * 모든 장착 장비로부터 합산된 보너스 스탯을 추출합니다.
     */
    private static calculateEquipmentBonuses(equipment: { [key in ItemType]?: Item }) {
        let hp = 0, atk = 0, def = 0, agi = 0, luk = 0;

        Object.values(equipment).forEach(item => {
            if (item?.stats) {
                hp += item.stats.hp || 0;
                atk += item.stats.atk || 0;
                def += item.stats.def || 0;
                agi += item.stats.agi || 0;
                luk += item.stats.luk || 0;
            }
        });

        return { hp, atk, def, agi, luk };
    }

    /**
     * 플레이어의 레벨 구간에 따른 스탯 성장률을 반환합니다.
     * 레벨이 높을수록 성장 기울기가 가팔라집니다.
     * @param level 현재 플레이어 레벨
     * @returns 해당 구간의 성장률 수치
     */
    private static getGrowthRate(level: number): number {
        if (level <= 100) return 1.05;
        if (level <= 500) return 1.08;
        if (level <= 1000) return 1.12;
        return 1.15;
    }
}
