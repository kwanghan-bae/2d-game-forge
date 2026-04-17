import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { InflationEventManager, InflationEventType } from '../src/game/utils/InflationEventManager';

describe('InflationEventManager - Auto Trigger', () => {
    let eventManager: InflationEventManager;
    
    beforeEach(() => {
        eventManager = InflationEventManager.getInstance();
        eventManager.reset();
        vi.useFakeTimers();
    });
    
    afterEach(() => {
        vi.useRealTimers();
    });
    
    describe('자동 트리거 확률', () => {
        it('자동 트리거가 활성화되어 있음', () => {
            expect(eventManager.isAutoTriggerEnabled()).toBe(true);
        });
        
        it('자동 트리거 활성화/비활성화', () => {
            eventManager.setAutoTriggerEnabled(false);
            expect(eventManager.isAutoTriggerEnabled()).toBe(false);
            
            eventManager.setAutoTriggerEnabled(true);
            expect(eventManager.isAutoTriggerEnabled()).toBe(true);
        });
        
        it('트리거 확률 설정 및 조회', () => {
            const probability = 0.05;
            eventManager.setTriggerProbability(probability);
            expect(eventManager.getTriggerProbability()).toBe(probability);
        });
        
        it('트리거 확률은 0과 1 사이', () => {
            eventManager.setTriggerProbability(-0.1);
            expect(eventManager.getTriggerProbability()).toBeGreaterThanOrEqual(0);
            
            eventManager.setTriggerProbability(1.5);
            expect(eventManager.getTriggerProbability()).toBeLessThanOrEqual(1);
        });
    });
    
    describe('자동 트리거 실행', () => {
        it('활성 이벤트 없을 때만 자동 트리거 가능', () => {
            eventManager.triggerEvent(InflationEventType.WAR);
            const result = eventManager.attemptAutoTrigger();
            
            expect(result).toBe(false);
        });
        
        it('쿨다운 중에는 자동 트리거 불가', () => {
            const startTime = Date.now();
            vi.setSystemTime(startTime);
            
            eventManager.triggerEvent(InflationEventType.HARVEST);
            
            vi.setSystemTime(startTime + 3 * 60000 + 1000);
            eventManager.update();
            
            expect(eventManager.hasActiveEvent()).toBe(false);
            
            const result = eventManager.attemptAutoTrigger();
            expect(result).toBe(false);
        });
        
        it('쿨다운 이후에는 자동 트리거 가능', () => {
            const startTime = Date.now();
            vi.setSystemTime(startTime);
            
            eventManager.triggerEvent(InflationEventType.TRADE);
            
            vi.setSystemTime(startTime + 3 * 60000 + 1000);
            eventManager.update();
            
            vi.setSystemTime(startTime + 4 * 60000);
            
            vi.spyOn(Math, 'random').mockReturnValue(0.001);
            const result = eventManager.attemptAutoTrigger();
            
            expect(result).toBe(true);
            expect(eventManager.hasActiveEvent()).toBe(true);
        });
        
        it('자동 트리거 비활성화 시 실행 안됨', () => {
            eventManager.setAutoTriggerEnabled(false);
            
            vi.spyOn(Math, 'random').mockReturnValue(0.001);
            const result = eventManager.attemptAutoTrigger();
            
            expect(result).toBe(false);
            expect(eventManager.hasActiveEvent()).toBe(false);
        });
    });
    
    describe('쿨다운 시스템', () => {
        it('쿨다운 시간 설정 및 조회', () => {
            const cooldownMinutes = 2;
            eventManager.setCooldownMinutes(cooldownMinutes);
            expect(eventManager.getCooldownMinutes()).toBe(cooldownMinutes);
        });
        
        it('쿨다운 중인지 확인', () => {
            const startTime = Date.now();
            vi.setSystemTime(startTime);
            
            eventManager.triggerEvent(InflationEventType.FAMINE);
            
            vi.setSystemTime(startTime + 4 * 60000 + 1000);
            eventManager.update();
            
            expect(eventManager.isInCooldown()).toBe(true);
            
            vi.setSystemTime(startTime + 5 * 60000);
            
            expect(eventManager.isInCooldown()).toBe(false);
        });
        
        it('첫 실행 시에는 쿨다운 없음', () => {
            expect(eventManager.isInCooldown()).toBe(false);
        });
        
        it('쿨다운 남은 시간 계산', () => {
            const startTime = Date.now();
            vi.setSystemTime(startTime);
            
            eventManager.triggerEvent(InflationEventType.PLAGUE);
            
            vi.setSystemTime(startTime + 5 * 60000 + 1000);
            eventManager.update();
            
            vi.setSystemTime(startTime + 5 * 60000 + 30000);
            const remaining = eventManager.getCooldownRemainingSeconds();
            
            expect(remaining).toBeCloseTo(30, 0);
        });
    });
    
    describe('자동 트리거 통계', () => {
        it('트리거 시도 횟수 추적', () => {
            eventManager.attemptAutoTrigger();
            eventManager.attemptAutoTrigger();
            eventManager.attemptAutoTrigger();
            
            expect(eventManager.getAutoTriggerAttempts()).toBe(3);
        });
        
        it('성공한 트리거 횟수 추적', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.001);
            
            eventManager.attemptAutoTrigger();
            
            expect(eventManager.getSuccessfulAutoTriggers()).toBe(1);
        });
        
        it('리셋 시 통계 초기화', () => {
            eventManager.attemptAutoTrigger();
            eventManager.reset();
            
            expect(eventManager.getAutoTriggerAttempts()).toBe(0);
            expect(eventManager.getSuccessfulAutoTriggers()).toBe(0);
        });
    });
});
