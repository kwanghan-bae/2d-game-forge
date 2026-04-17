import { GameStateValidator } from '../GameStateValidator';
import { Item, ItemType } from '../data/ItemData';

/**
 * GameState의 복잡한 데이터 복원 로직을 전담하는 클래스입니다.
 * 순환 참조 방지를 위해 대상 객체를 any 타입으로 다룹니다.
 */
export class GameStateRestorer {
    /**
     * JSON 형식의 데이터를 대상 객체에 복원합니다.
     * @param target 복원 대상 객체 (GameState)
     * @param data 복원할 원본 데이터 객체
     */
    public static restore(target: any, data: any): void {
        if (!data || typeof data !== 'object') return;

        this.restoreCore(target, data);
        this.restoreMeta(target, data);
        this.restoreProgression(target, data);
    }

    private static restoreCore(target: any, obj: any): void {
        this.restoreStats(target, obj.stats);
        this.restoreInventory(target, obj.inventory);
        this.restoreEquipment(target, obj.equipment);
    }

    private static restoreStats(target: any, stats: any): void {
        if (stats && GameStateValidator.isValidPlayerStats(stats)) {
            target.stats = { ...stats };
        }
    }

    private static restoreInventory(target: any, inventory: any): void {
        if (Array.isArray(inventory)) {
            target.inventory = inventory
                .filter((item: any): item is Item => GameStateValidator.isValidItem(item))
                .map(item => ({ ...item }));
        }
    }

    private static restoreEquipment(target: any, equipment: any): void {
        if (equipment && typeof equipment === 'object') {
            target.equipment = {};
            for (const [slot, item] of Object.entries(equipment)) {
                if (GameStateValidator.isValidItem(item) && GameStateValidator.isValidEquipmentSlot(slot)) {
                    target.equipment[slot as ItemType] = { ...(item as Item) };
                }
            }
        }
    }

    private static restoreMeta(target: any, obj: any): void {
        if (typeof obj.selectedClass === 'string' || obj.selectedClass === null) {
            target.selectedClass = obj.selectedClass;
        }
        if (typeof obj.saveVersion === 'number') {
            target.saveVersion = obj.saveVersion;
        } else {
            target.saveVersion = 1;
        }
        this.restoreCooldowns(target, obj.activeSkillCooldowns);
    }

    private static restoreCooldowns(target: any, cds: any): void {
        if (cds && typeof cds === 'object') {
            target.activeSkillCooldowns = {};
            for (const [id, cd] of Object.entries(cds)) {
                if (typeof cd === 'number') target.activeSkillCooldowns[Number(id)] = cd;
            }
        }
    }

    private static restoreProgression(target: any, obj: any): void {
        if (typeof obj.soulGrade === 'number') target.soulGrade = obj.soulGrade;
        if (typeof obj.karma === 'number') target.karma = obj.karma;
        if (Array.isArray(obj.usedYaksuPoints)) {
            target.usedYaksuPoints = obj.usedYaksuPoints.filter((p: any): p is string => typeof p === 'string');
        } else {
            target.usedYaksuPoints = [];
        }
        this.restoreBossAndClasses(target, obj);
    }

    private static restoreBossAndClasses(target: any, obj: any): void {
        if (Array.isArray(obj.defeatedBosses)) {
            target.defeatedBosses = obj.defeatedBosses.filter((b: any): b is number => typeof b === 'number');
        }

        if (Array.isArray(obj.unlockedClasses)) {
            const cls = obj.unlockedClasses.filter((c: any): c is string => typeof c === 'string');
            if (!cls.includes('hwarang')) cls.push('hwarang');
            target.unlockedClasses = cls;
        }
    }
}
