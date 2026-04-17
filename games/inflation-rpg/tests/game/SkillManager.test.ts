import { describe, it, expect, beforeEach } from 'vitest';
import { SkillManager, SkillUseResult } from '../../src/game/core/SkillManager';
import { StatusEffectType, StatusEffect } from '../../src/game/data/SkillData';

describe('SkillManager', () => {
    let skillManager: SkillManager;
    const mockCasterStats = {
        hp: 200,
        attack: 100,
        defense: 50,
        maxHp: 200
    };
    const mockTargetStats = {
        hp: 150,
        maxHp: 200,
        attack: 80,
        defense: 40
    };

    beforeEach(() => {
        skillManager = new SkillManager();
    });

    describe('useSkill', () => {
        it('useSkill() 성공 시나리오 (쿨타임 0, 사용 가능)', () => {
            const result = skillManager.useSkill(1, mockCasterStats);
            expect(result.success).toBe(true);
            expect(result.damage).toBeGreaterThan(0);
            expect(result.damage).toBe(120);
        });

        it('useSkill() 실패 시나리오 (쿨타임 중)', () => {
            const result1 = skillManager.useSkill(2, mockCasterStats);
            expect(result1.success).toBe(true);

            const result2 = skillManager.useSkill(2, mockCasterStats);
            expect(result2.success).toBe(false);
            expect(result2.message).toContain('쿨타임');
        });

        it('존재하지 않는 스킬은 실패', () => {
            const result = skillManager.useSkill(999, mockCasterStats);
            expect(result.success).toBe(false);
        });

        it('스킬 사용 후 상태이상이 적용되어야 함', () => {
            const result = skillManager.useSkill(2, mockCasterStats);
            expect(result.success).toBe(true);
            expect(result.statusEffect).toBeDefined();
            expect(result.statusEffect?.type).toBe(StatusEffectType.BLEED);
            expect(result.statusEffect?.duration).toBe(3);
        });
    });

    describe('tickCooldowns', () => {
        it('tickCooldowns() 쿨타임 감소', () => {
            skillManager.useSkill(2, mockCasterStats);
            expect(skillManager.getCooldown(2)).toBe(3);
            skillManager.tickCooldowns();
            expect(skillManager.getCooldown(2)).toBe(2);
            skillManager.tickCooldowns();
            skillManager.tickCooldowns();
            expect(skillManager.getCooldown(2)).toBe(0);
        });

        it('쿨타임이 0 아래로 가지 않음', () => {
            skillManager.useSkill(2, mockCasterStats);
            for(let i=0; i<5; i++) skillManager.tickCooldowns();
            expect(skillManager.getCooldown(2)).toBe(0);
        });
    });

    describe('applyStatusEffect', () => {
        it('출혈 효과', () => {
            const effect: StatusEffect = { type: StatusEffectType.BLEED, power: 0.1, duration: 3, description: '' };
            skillManager.addStatusEffect(effect);
            expect(skillManager.getActiveStatusEffects()).toHaveLength(1);
            expect(skillManager.getActiveStatusEffects()[0].type).toBe(StatusEffectType.BLEED);
        });

        it('무적 효과', () => {
            const effect: StatusEffect = { type: StatusEffectType.INVINCIBLE, power: 1, duration: 2, description: '' };
            skillManager.addStatusEffect(effect);
            expect(skillManager.getActiveStatusEffects()).toHaveLength(1);
        });

        it('버프는 중복 가능', () => {
            const effect1: StatusEffect = { type: StatusEffectType.BUFF_ATTACK, power: 1.5, duration: 3, description: '' };
            const effect2: StatusEffect = { type: StatusEffectType.BUFF_ATTACK, power: 1.5, duration: 3, description: '' };
            skillManager.addStatusEffect(effect1);
            skillManager.addStatusEffect(effect2);
            expect(skillManager.getActiveStatusEffects()).toHaveLength(2);
        });
    });

    describe('processStatusEffects', () => {
        it('상태이상 처리 및 삭제', () => {
            const effect: StatusEffect = { type: StatusEffectType.BLEED, power: 0.1, duration: 1, description: '' };
            skillManager.addStatusEffect(effect);
            expect(skillManager.getActiveStatusEffects()).toHaveLength(1);
            
            skillManager.processStatusEffects(mockTargetStats);
            expect(skillManager.getActiveStatusEffects()).toHaveLength(0);
        });

        it('중첩 테스트', () => {
            const bleed: StatusEffect = { type: StatusEffectType.BLEED, power: 0.1, duration: 2, description: '' };
            const buff: StatusEffect = { type: StatusEffectType.BUFF_ATTACK, power: 1.5, duration: 2, description: '' };
            skillManager.addStatusEffect(bleed);
            skillManager.addStatusEffect(buff);

            const result = skillManager.processStatusEffects(mockTargetStats);
            expect(result.damage).toBe(20);
            expect(result.attackMultiplier).toBe(1.5);
            expect(skillManager.getActiveStatusEffects()).toHaveLength(2);
            
            skillManager.processStatusEffects(mockTargetStats);
            expect(skillManager.getActiveStatusEffects()).toHaveLength(0);
        });
    });

    describe('초기화 테스트', () => {
        it('상태 초기화', () => {
            skillManager.useSkill(2, mockCasterStats);
            expect(skillManager.getCooldown(2)).toBe(3);
            expect(skillManager.getActiveStatusEffects()).toHaveLength(1);

            skillManager.resetAllCooldowns();
            skillManager.clearStatusEffects();

            expect(skillManager.getCooldown(2)).toBe(0);
            expect(skillManager.getActiveStatusEffects()).toHaveLength(0);
        });
    });
});