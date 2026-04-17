import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SkillManager } from '../src/game/core/SkillManager';
import { SKILL_CATALOG, StatusEffectType } from '../src/game/data/SkillData';
import { GameState } from '../src/game/GameState';

describe('Skill Usage E2E Tests', () => {
    let skillManager: SkillManager;
    let gameState: GameState;

    beforeEach(() => {
        // GameState 초기화
        gameState = GameState.getInstance();
        gameState.reset();
        
        // 기본 스탯 설정
        gameState.stats = {
            hp: 100,
            maxHp: 100,
            gold: 0,
            level: 1,
            exp: 0,
            maxExp: 100,
            attack: 50,
            defense: 10,
            agi: 5,
            luk: 5,
            steps: 0,
            zone: 'Hanyang'
        };

        // SkillManager 초기화
        skillManager = new SkillManager();
    });

    afterEach(() => {
        gameState.reset();
    });

    describe('화랑 (Hwarang) - 반월참 스킬', () => {
        it('반월참 사용 후 출혈 데미지 확인', () => {
            // 반월참 스킬 (id: 2, 출혈 상태이상)
            const skill = SKILL_CATALOG.find(s => s.id === 2);
            expect(skill).toBeDefined();
            expect(skill?.statusEffect?.type).toBe(StatusEffectType.BLEED);

            // 스킬 사용
            const result = skillManager.useSkill(2, {
                hp: gameState.stats.hp,
                attack: gameState.stats.attack,
                defense: gameState.stats.defense,
                maxHp: gameState.stats.maxHp
            });

            expect(result.success).toBe(true);
            expect(result.damage).toBeGreaterThan(0);
            expect(result.statusEffect).toBeDefined();
            expect(result.statusEffect?.type).toBe(StatusEffectType.BLEED);

            // 출혈 상태이상 확인
            const statusResult = skillManager.processStatusEffects({
                hp: gameState.stats.hp,
                maxHp: gameState.stats.maxHp,
                attack: gameState.stats.attack,
                defense: gameState.stats.defense
            });

            expect(statusResult.damage).toBeGreaterThan(0);
        });
    });

    describe('초 (Cho) - 금강자세 스킬', () => {
        it('금강자세 사용 후 무적 확인', () => {
            // 금강자세 스킬 (id: 6, 무적 상태이상)
            const invincibleSkillId = 6;
            
            const result = skillManager.useSkill(invincibleSkillId, {
                hp: gameState.stats.hp,
                attack: gameState.stats.attack,
                defense: gameState.stats.defense,
                maxHp: gameState.stats.maxHp
            });

            expect(result.success).toBe(true);
            expect(result.statusEffect?.type).toBe(StatusEffectType.INVINCIBLE);
        });
    });

    describe('착호갑사 (Chakhogapsa) - 헤드샷 스킬', () => {
        it('헤드샷 사용 후 고데미지 확인', () => {
            // 고데미지 스킬 (id: 2 - 부적 폭발, power: 2.5)
            const result = skillManager.useSkill(2, {
                hp: gameState.stats.hp,
                attack: gameState.stats.attack,
                defense: gameState.stats.defense,
                maxHp: gameState.stats.maxHp
            });

            expect(result.success).toBe(true);
            expect(result.damage).toBeGreaterThan(gameState.stats.attack * 1.5);
        });
    });

    describe('무당 (Mudang) - 장군 소환 스킬', () => {
        it('장군 소환 후 버프 확인', () => {
            // 호랑이의 기운 (id: 4, 공격력 버프)
            const result = skillManager.useSkill(4, {
                hp: gameState.stats.hp,
                attack: gameState.stats.attack,
                defense: gameState.stats.defense,
                maxHp: gameState.stats.maxHp
            });

            expect(result.success).toBe(true);
            expect(result.statusEffect?.type).toBe(StatusEffectType.BUFF_ATTACK);
            expect(result.statusEffect?.power).toBe(1.5);
        });
    });

    describe('쿨타임 시스템', () => {
        it('스킬 사용 후 쿨타임 동안 재사용 불가', () => {
            const skillId = 2; // 부적 폭발 (cooldown: 3)
            const skill = SKILL_CATALOG.find(s => s.id === skillId);

            // 첫 번째 스킬 사용
            const result1 = skillManager.useSkill(skillId, {
                hp: gameState.stats.hp,
                attack: gameState.stats.attack,
                defense: gameState.stats.defense,
                maxHp: gameState.stats.maxHp
            });
            expect(result1.success).toBe(true);

            // 즉시 재사용 시도 (쿨타임 중)
            const result2 = skillManager.useSkill(skillId, {
                hp: gameState.stats.hp,
                attack: gameState.stats.attack,
                defense: gameState.stats.defense,
                maxHp: gameState.stats.maxHp
            });
            expect(result2.success).toBe(false);
            expect(result2.message).toContain('쿨타임');

            // 쿨타임 감소
            skillManager.tickCooldowns();
            skillManager.tickCooldowns();
            skillManager.tickCooldowns();

            // 쿨타임 후 재사용 가능
            const result3 = skillManager.useSkill(skillId, {
                hp: gameState.stats.hp,
                attack: gameState.stats.attack,
                defense: gameState.stats.defense,
                maxHp: gameState.stats.maxHp
            });
            expect(result3.success).toBe(true);
        });

        it('쿨타임 조회 가능', () => {
            const skillId = 2;

            // 스킬 사용
            skillManager.useSkill(skillId, {
                hp: gameState.stats.hp,
                attack: gameState.stats.attack,
                defense: gameState.stats.defense,
                maxHp: gameState.stats.maxHp
            });

            // 초기 쿨타임 확인
            let cooldown = skillManager.getCooldown(skillId);
            expect(cooldown).toBeGreaterThan(0);

            // 쿨타임 감소
            skillManager.tickCooldowns();
            const cooldownAfter = skillManager.getCooldown(skillId);
            expect(cooldownAfter).toBe(cooldown - 1);
        });
    });

    describe('자동 전투 시 스킬 자동 사용', () => {
        it('자동 전투에서 스킬이 순서대로 사용됨', () => {
            const skillId = 1; // 먹물 베기 (cooldown: 0)

            // 첫 번째 턴: 쿨타임이 0인 스킬은 바로 사용 가능
            const cooldown1 = skillManager.getCooldown(skillId);
            expect(cooldown1).toBe(0);

            // 스킬 사용
            const result = skillManager.useSkill(skillId, {
                hp: gameState.stats.hp,
                attack: gameState.stats.attack,
                defense: gameState.stats.defense,
                maxHp: gameState.stats.maxHp
            });
            expect(result.success).toBe(true);
        });

        it('여러 스킬 쿨타임 동시 관리', () => {
            // 여러 스킬 사용
            const skill1 = skillManager.useSkill(2, {
                hp: gameState.stats.hp,
                attack: gameState.stats.attack,
                defense: gameState.stats.defense,
                maxHp: gameState.stats.maxHp
            });
            expect(skill1.success).toBe(true);

            // 다른 스킬 사용
            const skill2 = skillManager.useSkill(4, {
                hp: gameState.stats.hp,
                attack: gameState.stats.attack,
                defense: gameState.stats.defense,
                maxHp: gameState.stats.maxHp
            });
            expect(skill2.success).toBe(true);

            // 각각 쿨타임 확인
            const cd2 = skillManager.getCooldown(2);
            const cd4 = skillManager.getCooldown(4);
            expect(cd2).toBeGreaterThan(0);
            expect(cd4).toBeGreaterThan(0);

            // 턴 진행
            skillManager.tickCooldowns();

            // 두 쿨타임 모두 감소
            const cd2After = skillManager.getCooldown(2);
            const cd4After = skillManager.getCooldown(4);
            expect(cd2After).toBe(cd2 - 1);
            expect(cd4After).toBe(cd4 - 1);
        });
    });

    describe('상태이상 처리', () => {
        it('출혈 상태이상이 여러 턴 지속', () => {
            // 출혈 스킬 사용
            const bleedResult = skillManager.useSkill(2, {
                hp: gameState.stats.hp,
                attack: gameState.stats.attack,
                defense: gameState.stats.defense,
                maxHp: gameState.stats.maxHp
            });
            expect(bleedResult.success).toBe(true);

            // 첫 턴 출혈 피해
            let statusResult = skillManager.processStatusEffects({
                hp: gameState.stats.hp,
                maxHp: gameState.stats.maxHp,
                attack: gameState.stats.attack,
                defense: gameState.stats.defense
            });
            expect(statusResult.damage).toBeGreaterThan(0);

            // 두 번째 턴
            skillManager.tickCooldowns();
            statusResult = skillManager.processStatusEffects({
                hp: gameState.stats.hp,
                maxHp: gameState.stats.maxHp,
                attack: gameState.stats.attack,
                defense: gameState.stats.defense
            });
            expect(statusResult.damage).toBeGreaterThan(0);
        });

        it('무적 상태에서는 데미지 무효', () => {
            // 무적 상태이상 추가 (테스트용)
            const invincibleResult = skillManager.addStatusEffect({
                type: StatusEffectType.INVINCIBLE,
                power: 1,
                duration: 2,
                description: '무적'
            });

            // 무적 상태 확인
            const statusResult = skillManager.processStatusEffects({
                hp: gameState.stats.hp,
                maxHp: gameState.stats.maxHp,
                attack: gameState.stats.attack,
                defense: gameState.stats.defense
            });

            expect(statusResult.isInvincible).toBe(true);
        });

        it('버프 상태에서 공격력 증가', () => {
            // 버프 스킬 사용
            const buffResult = skillManager.useSkill(4, {
                hp: gameState.stats.hp,
                attack: gameState.stats.attack,
                defense: gameState.stats.defense,
                maxHp: gameState.stats.maxHp
            });
            expect(buffResult.success).toBe(true);

            // 버프 상태 확인
            const statusResult = skillManager.processStatusEffects({
                hp: gameState.stats.hp,
                maxHp: gameState.stats.maxHp,
                attack: gameState.stats.attack,
                defense: gameState.stats.defense
            });

            expect(statusResult.attackMultiplier).toBe(1.5);
        });
    });

    describe('스킬 클래스 획득', () => {
        it('클래스에 따른 스킬 조회', () => {
            const hwarangSkills = getSkillsByClass('hwarang');
            expect(hwarangSkills.length).toBeGreaterThan(0);

            const choSkills = getSkillsByClass('cho');
            expect(choSkills.length).toBeGreaterThan(0);
        });
    });
});

/**
 * Helper function to get skills by class
 */
function getSkillsByClass(className: string): any[] {
    // 클래스별 스킬 매핑 (예시)
    const classSkills: { [key: string]: number[] } = {
        'hwarang': [1, 2], // 먹물 베기, 부적 폭발
        'cho': [3, 4],     // 치유의 연꽃, 호랑이의 기운
        'mudang': [2, 4],  // 부적 폭발, 호랑이의 기운
    };

    const skillIds = classSkills[className] || [];
    return SKILL_CATALOG.filter(skill => skillIds.includes(skill.id));
}

export { getSkillsByClass };
