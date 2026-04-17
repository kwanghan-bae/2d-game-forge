import { Item, ItemType } from './data/ItemData';
import { PlayerStats } from './types/PlayerTypes';

/**
 * GameState의 데이터 유효성 검사를 담당하는 헬퍼 클래스입니다.
 * 외부 JSON 데이터를 GameState 인스턴스로 복원할 때 타입 무결성을 보장합니다.
 */
export class GameStateValidator {
    /**
     * PlayerStats 객체의 유효성을 검사합니다.
     * 모든 필수 능력치 필드가 숫자로 존재해야 합니다.
     * @param stats 검사할 데이터
     */
    public static isValidPlayerStats(stats: unknown): stats is PlayerStats {
        if (!stats || typeof stats !== 'object') return false;
        const obj = stats as Record<string, any>;
        
        return this.checkRequiredFields(obj, [
            'hp', 'maxHp', 'gold', 'level', 'exp', 'maxExp', 
            'attack', 'defense', 'agi', 'luk', 'steps'
        ]) && typeof obj.zone === 'string';
    }

    /** 필수 필드들이 모두 숫자인지 확인 */
    private static checkRequiredFields(obj: any, fields: string[]): boolean {
        return fields.every(field => typeof obj[field] === 'number');
    }

    /**
     * Item 객체의 유효성을 검사합니다.
     * @param item 검사할 데이터
     */
    public static isValidItem(item: unknown): item is Item {
        if (!item || typeof item !== 'object') return false;
        const obj = item as Record<string, any>;
        
        return (
            typeof obj.id === 'number' &&
            typeof obj.name === 'string' &&
            typeof obj.type === 'string' &&
            typeof obj.description === 'string' &&
            typeof obj.stats === 'object' &&
            typeof obj.price === 'number' &&
            typeof obj.atlasKey === 'string' &&
            typeof obj.frame === 'number'
        );
    }

    /**
     * 특정 문자열이 유효한 장착 슬롯(아이템 타입)인지 확인합니다.
     * @param slot 확인할 슬롯 문자열
     */
    public static isValidEquipmentSlot(slot: string): boolean {
        const validSlots: string[] = [
            ItemType.WEAPON, ItemType.ARMOR, 
            ItemType.ACCESSORY, ItemType.CONSUMABLE
        ];
        return validSlots.includes(slot);
    }
}
