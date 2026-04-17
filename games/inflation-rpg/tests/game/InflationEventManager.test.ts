import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { InflationEventManager, InflationEvent, InflationEventType } from '../../src/game/utils/InflationEventManager';
import { InflationManager } from '../../src/game/utils/InflationManager';

describe('InflationEventManager', () => {
    let eventManager: InflationEventManager;
    let inflationManager: InflationManager;
    
    beforeEach(() => {
        eventManager = InflationEventManager.getInstance();
        inflationManager = InflationManager.getInstance();
        eventManager.reset();
        inflationManager.reset();
        inflationManager.setInflationRate(0.02);
        vi.useFakeTimers();
    });
    
    afterEach(() => {
        vi.useRealTimers();
    });
    
     describe('이벤트 생성 및 속성', () => {
         it('전쟁 이벤트는 +50% 인플레이션', () => {
             const event = eventManager.getEventDefinition(InflationEventType.WAR)!;
             expect(event.type).toBe(InflationEventType.WAR);
             expect(event.rateModifier).toBe(0.5);
             expect(event.durationMinutes).toBe(5);
         });
         
         it('풍년 이벤트는 -20% 인플레이션', () => {
             const event = eventManager.getEventDefinition(InflationEventType.HARVEST)!;
             expect(event.type).toBe(InflationEventType.HARVEST);
             expect(event.rateModifier).toBe(-0.2);
             expect(event.durationMinutes).toBe(3);
         });
         
         it('흉년 이벤트는 +30% 인플레이션', () => {
             const event = eventManager.getEventDefinition(InflationEventType.FAMINE)!;
             expect(event.type).toBe(InflationEventType.FAMINE);
             expect(event.rateModifier).toBe(0.3);
             expect(event.durationMinutes).toBe(4);
         });
         
         it('교역 이벤트는 -10% 인플레이션', () => {
             const event = eventManager.getEventDefinition(InflationEventType.TRADE)!;
             expect(event.type).toBe(InflationEventType.TRADE);
             expect(event.rateModifier).toBe(-0.1);
             expect(event.durationMinutes).toBe(3);
         });
         
         it('역병 이벤트는 +40% 인플레이션', () => {
             const event = eventManager.getEventDefinition(InflationEventType.PLAGUE)!;
             expect(event.type).toBe(InflationEventType.PLAGUE);
             expect(event.rateModifier).toBe(0.4);
             expect(event.durationMinutes).toBe(5);
         });
     });
    
    describe('이벤트 트리거 및 상태', () => {
        it('이벤트 트리거 시 활성화됨', () => {
            const startTime = Date.now();
            vi.setSystemTime(startTime);
            
            eventManager.triggerEvent(InflationEventType.WAR);
            
            expect(eventManager.hasActiveEvent()).toBe(true);
            const active = eventManager.getActiveEvent();
            expect(active).toBeDefined();
            expect(active!.type).toBe(InflationEventType.WAR);
        });
        
        it('이벤트 없을 때는 비활성화 상태', () => {
            expect(eventManager.hasActiveEvent()).toBe(false);
            expect(eventManager.getActiveEvent()).toBeUndefined();
        });
        
        it('이벤트 트리거 시 시작 시간 기록', () => {
            const startTime = Date.now();
            vi.setSystemTime(startTime);
            
            eventManager.triggerEvent(InflationEventType.HARVEST);
            const active = eventManager.getActiveEvent();
            
            expect(active!.startTime).toBe(startTime);
        });
        
        it('중복 이벤트는 트리거되지 않음', () => {
            eventManager.triggerEvent(InflationEventType.WAR);
            const firstEvent = eventManager.getActiveEvent();
            
            eventManager.triggerEvent(InflationEventType.FAMINE);
            const secondEvent = eventManager.getActiveEvent();
            
            expect(secondEvent!.type).toBe(firstEvent!.type);
        });
    });
    
    describe('이벤트 만료 및 종료', () => {
        it('지속시간 경과 시 이벤트 만료', () => {
            const startTime = Date.now();
            vi.setSystemTime(startTime);
            
            eventManager.triggerEvent(InflationEventType.HARVEST);
            
            vi.setSystemTime(startTime + 3 * 60000 + 1000);
            eventManager.update();
            
            expect(eventManager.hasActiveEvent()).toBe(false);
        });
        
        it('지속시간 이내에는 이벤트 유지', () => {
            const startTime = Date.now();
            vi.setSystemTime(startTime);
            
            eventManager.triggerEvent(InflationEventType.WAR);
            
            vi.setSystemTime(startTime + 4 * 60000);
            eventManager.update();
            
            expect(eventManager.hasActiveEvent()).toBe(true);
        });
        
        it('수동 종료 가능', () => {
            eventManager.triggerEvent(InflationEventType.PLAGUE);
            expect(eventManager.hasActiveEvent()).toBe(true);
            
            eventManager.endCurrentEvent();
            expect(eventManager.hasActiveEvent()).toBe(false);
        });
    });
    
    describe('인플레이션 매니저 통합', () => {
        it('이벤트 발생 시 인플레이션율 조정', () => {
            const baseRate = 0.02;
            inflationManager.setInflationRate(baseRate);
            
            eventManager.triggerEvent(InflationEventType.WAR);
            const modifiedRate = eventManager.getEffectiveInflationRate(baseRate);
            
            expect(modifiedRate).toBe(baseRate * 1.5);
        });
        
        it('이벤트 없을 때는 기본 인플레이션율', () => {
            const baseRate = 0.02;
            const effectiveRate = eventManager.getEffectiveInflationRate(baseRate);
            
            expect(effectiveRate).toBe(baseRate);
        });
        
        it('감소 이벤트는 인플레이션율 낮춤', () => {
            const baseRate = 0.02;
            
            eventManager.triggerEvent(InflationEventType.HARVEST);
            const modifiedRate = eventManager.getEffectiveInflationRate(baseRate);
            
            expect(modifiedRate).toBe(baseRate * 0.8);
        });
        
        it('인플레이션율은 최소 0 이상', () => {
            const baseRate = 0.01;
            
            eventManager.triggerEvent(InflationEventType.HARVEST);
            const modifiedRate = eventManager.getEffectiveInflationRate(baseRate);
            
            expect(modifiedRate).toBeGreaterThanOrEqual(0);
        });
    });
    
    describe('이벤트 정보 조회', () => {
        it('남은 시간 계산', () => {
            const startTime = Date.now();
            vi.setSystemTime(startTime);
            
            eventManager.triggerEvent(InflationEventType.WAR);
            
            vi.setSystemTime(startTime + 2 * 60000);
            const remainingMinutes = eventManager.getRemainingMinutes();
            
            expect(remainingMinutes).toBeCloseTo(3, 1);
        });
        
        it('이벤트 없을 때 남은 시간은 0', () => {
            const remainingMinutes = eventManager.getRemainingMinutes();
            expect(remainingMinutes).toBe(0);
        });
        
        it('경과 시간 계산', () => {
            const startTime = Date.now();
            vi.setSystemTime(startTime);
            
            eventManager.triggerEvent(InflationEventType.FAMINE);
            
            vi.setSystemTime(startTime + 90000);
            const elapsedMinutes = eventManager.getElapsedMinutes();
            
            expect(elapsedMinutes).toBeCloseTo(1.5, 1);
        });
    });
    
     describe('리셋 및 초기화', () => {
         it('리셋 시 모든 이벤트 종료', () => {
             eventManager.triggerEvent(InflationEventType.WAR);
             expect(eventManager.hasActiveEvent()).toBe(true);
             
             eventManager.reset();
             expect(eventManager.hasActiveEvent()).toBe(false);
         });
     });
     
     describe('알 수 없는 이벤트 타입 처리', () => {
         it('알 수 없는 이벤트 타입은 null 반환', () => {
             const unknownType = 'UNKNOWN_EVENT' as InflationEventType;
             const definition = eventManager.getEventDefinition(unknownType);
             
             expect(definition).toBeNull();
         });
         
         it('알 수 없는 이벤트 타입 트리거는 이벤트 생성 안 됨', () => {
             const unknownType = 'INVALID_EVENT' as InflationEventType;
             
             eventManager.triggerEvent(unknownType);
             
             expect(eventManager.hasActiveEvent()).toBe(false);
         });
         
         it('유효한 이벤트 후 알 수 없는 이벤트 트리거 시도', () => {
             eventManager.triggerEvent(InflationEventType.WAR);
             expect(eventManager.hasActiveEvent()).toBe(true);
             
             const unknownType = 'FAKE_TYPE' as InflationEventType;
             eventManager.triggerEvent(unknownType);
             
             expect(eventManager.hasActiveEvent()).toBe(true);
             const active = eventManager.getActiveEvent();
             expect(active!.type).toBe(InflationEventType.WAR);
         });
     });
});
