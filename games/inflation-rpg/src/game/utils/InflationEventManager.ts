/**
 * 인플레이션 이벤트의 종류를 정의하는 열거형입니다.
 */
export enum InflationEventType {
    /** 전쟁: 물가 급등 */
    WAR = 'WAR',
    /** 풍년: 물가 하락 */
    HARVEST = 'HARVEST',
    /** 흉년: 식량 가격 상승 */
    FAMINE = 'FAMINE',
    /** 교역: 물가 소폭 하락 */
    TRADE = 'TRADE',
    /** 역병: 노동력 부족으로 인한 물가 상승 */
    PLAGUE = 'PLAGUE',
}

/**
 * 인플레이션 이벤트의 정적 정의를 담는 인터페이스입니다.
 */
export interface InflationEventDefinition {
    /** 이벤트 타입 */
    type: InflationEventType;
    /** 한글 이름 */
    nameKo: string;
    /** 한글 설명 */
    descriptionKo: string;
    /** 인플레이션율에 가산/감산될 변동치 */
    rateModifier: number;
    /** 지속 시간 (분) */
    durationMinutes: number;
}

/**
 * 현재 실행 중인 인플레이션 이벤트의 런타임 정보입니다.
 */
export interface InflationEvent {
    /** 실행 중인 이벤트 타입 */
    type: InflationEventType;
    /** 이벤트 시작 타임스탬프 */
    startTime: number;
    /** 이벤트 종료 타임스탬프 */
    endTime: number;
    /** 적용 중인 변동치 */
    rateModifier: number;
}

/**
 * 돌발적인 경제 이벤트(전쟁, 기근 등)를 관리하는 매니저 클래스입니다.
 * 특정 확률로 이벤트를 발생시키거나 현재 활성화된 이벤트의 효과를 계산합니다.
 */
export class InflationEventManager {
    /** InflationEventManager의 싱글톤 인스턴스 */
    private static instance: InflationEventManager;
    /** 현재 활성화된 이벤트 정보 (없으면 undefined) */
    private activeEvent: InflationEvent | undefined;
    
    /** 자동 이벤트 발생 활성화 여부 */
    private autoTriggerEnabled: boolean = true;
    /** 매 업데이트 시 이벤트가 발생할 확률 */
    private triggerProbability: number = 0.01;
    /** 이벤트 종료 후 다음 이벤트 발생까지의 최소 대기 시간 (분) */
    private cooldownMinutes: number = 1;
    /** 마지막 이벤트가 종료된 타임스탬프 */
    private lastEventEndTime: number = 0;
    /** 자동 발생 시도 횟수 카운터 */
    private autoTriggerAttempts: number = 0;
    /** 성공적으로 발생한 자동 이벤트 횟수 카운터 */
    private successfulAutoTriggers: number = 0;
    
    /** 미리 정의된 이벤트 카탈로그 */
    private eventDefinitions: Map<InflationEventType, InflationEventDefinition> = new Map([
        [InflationEventType.WAR, {
            type: InflationEventType.WAR,
            nameKo: '전쟁 발발',
            descriptionKo: '물자 부족으로 인플레이션 급등',
            rateModifier: 0.5,
            durationMinutes: 5,
        }],
        [InflationEventType.HARVEST, {
            type: InflationEventType.HARVEST,
            nameKo: '풍년',
            descriptionKo: '풍족한 수확으로 물가 안정',
            rateModifier: -0.2,
            durationMinutes: 3,
        }],
        [InflationEventType.FAMINE, {
            type: InflationEventType.FAMINE,
            nameKo: '흉년',
            descriptionKo: '농작물 실패로 식량 가격 상승',
            rateModifier: 0.3,
            durationMinutes: 4,
        }],
        [InflationEventType.TRADE, {
            type: InflationEventType.TRADE,
            nameKo: '교역 번창',
            descriptionKo: '활발한 무역으로 경제 활성화',
            rateModifier: -0.1,
            durationMinutes: 3,
        }],
        [InflationEventType.PLAGUE, {
            type: InflationEventType.PLAGUE,
            nameKo: '역병',
            descriptionKo: '인구 감소로 노동력 부족',
            rateModifier: 0.4,
            durationMinutes: 5,
        }],
    ]);
    
    /** 싱글톤 패턴 생성을 방지하기 위한 private 생성자 */
    private constructor() {}
    
    /**
     * 싱글톤 인스턴스를 반환합니다.
     * @returns InflationEventManager 인스턴스
     */
    public static getInstance(): InflationEventManager {
        if (!InflationEventManager.instance) {
            InflationEventManager.instance = new InflationEventManager();
        }
        return InflationEventManager.instance;
    }
    
    /**
     * 매니저의 상태를 초기화합니다.
     */
    public reset(): void {
        this.activeEvent = undefined;
        this.autoTriggerAttempts = 0;
        this.successfulAutoTriggers = 0;
        this.lastEventEndTime = 0;
        this.autoTriggerEnabled = true;
        this.triggerProbability = 0.01;
        this.cooldownMinutes = 1;
    }
    
    /**
     * 특정 타입의 이벤트 정의를 조회합니다.
     * @param type 조회할 이벤트 타입
     * @returns 이벤트 정의 객체 또는 null
     */
    public getEventDefinition(type: InflationEventType): InflationEventDefinition | null {
        return this.eventDefinitions.get(type) || null;
    }
    
    /**
     * 수동으로 특정 이벤트를 발생시킵니다. 이미 이벤트가 실행 중이면 무시됩니다.
     * @param type 발생시킬 이벤트 타입
     */
    public triggerEvent(type: InflationEventType): void {
        if (this.activeEvent) return;
        
        const definition = this.getEventDefinition(type);
        if (!definition) return;
        
        const startTime = Date.now();
        const endTime = startTime + definition.durationMinutes * 60000;
        
        this.activeEvent = {
            type: definition.type,
            startTime,
            endTime,
            rateModifier: definition.rateModifier,
        };
    }
    
    /**
     * 현재 활성화된 이벤트가 있는지 여부를 반환합니다.
     * @returns 활성 이벤트 존재 여부
     */
    public hasActiveEvent(): boolean {
        return this.activeEvent !== undefined;
    }
    
    /**
     * 현재 실행 중인 이벤트 정보를 반환합니다.
     * @returns 활성 이벤트 객체 또는 undefined
     */
    public getActiveEvent(): InflationEvent | undefined {
        return this.activeEvent;
    }
    
    /**
     * 주기적으로 호출되어 이벤트의 종료 여부를 확인합니다.
     */
    public update(): void {
        if (!this.activeEvent) return;
        
        const currentTime = Date.now();
        if (currentTime >= this.activeEvent.endTime) {
            this.lastEventEndTime = this.activeEvent.endTime;
            this.activeEvent = undefined;
        }
    }
    
    /**
     * 현재 실행 중인 이벤트를 강제로 즉시 종료합니다.
     */
    public endCurrentEvent(): void {
        this.activeEvent = undefined;
    }
    
    /**
     * 이벤트 효과가 적용된 최종 인플레이션율 배율을 계산합니다.
     * @param baseRate 원본 인플레이션율
     * @returns 보정된 최종 인플레이션율
     */
    public getEffectiveInflationRate(baseRate: number): number {
        if (!this.activeEvent) return baseRate;
        
        const multiplier = 1 + this.activeEvent.rateModifier;
        const effectiveRate = baseRate * multiplier;
        
        return Math.max(0, effectiveRate);
    }
    
    /**
     * 현재 이벤트의 남은 지속 시간을 분 단위로 반환합니다.
     * @returns 남은 시간 (분)
     */
    public getRemainingMinutes(): number {
        if (!this.activeEvent) return 0;
        
        const currentTime = Date.now();
        const remainingMs = this.activeEvent.endTime - currentTime;
        return Math.max(0, remainingMs / 60000);
    }
    
    /**
     * 현재 이벤트가 시작된 후 경과된 시간을 분 단위로 반환합니다.
     * @returns 경과 시간 (분)
     */
    public getElapsedMinutes(): number {
        if (!this.activeEvent) return 0;
        
        const currentTime = Date.now();
        const elapsedMs = currentTime - this.activeEvent.startTime;
        return Math.max(0, elapsedMs / 60000);
    }
    
    /** 자동 트리거 활성화 여부 조회 */
    public isAutoTriggerEnabled(): boolean { return this.autoTriggerEnabled; }
    /** 자동 트리거 활성화 여부 설정 */
    public setAutoTriggerEnabled(enabled: boolean): void { this.autoTriggerEnabled = enabled; }
    /** 이벤트 발생 확률 조회 */
    public getTriggerProbability(): number { return this.triggerProbability; }
    /** 이벤트 발생 확률 설정 */
    public setTriggerProbability(probability: number): void { this.triggerProbability = Math.max(0, Math.min(1, probability)); }
    /** 쿨다운 시간 조회 */
    public getCooldownMinutes(): number { return this.cooldownMinutes; }
    /** 쿨다운 시간 설정 */
    public setCooldownMinutes(minutes: number): void { this.cooldownMinutes = Math.max(0, minutes); }
    
    /**
     * 현재 이벤트 발생 제한(쿨다운) 상태인지 확인합니다.
     * @returns 쿨다운 중 여부
     */
    public isInCooldown(): boolean {
        if (this.lastEventEndTime === 0) return false;
        
        const currentTime = Date.now();
        const cooldownEndTime = this.lastEventEndTime + this.cooldownMinutes * 60000;
        return currentTime < cooldownEndTime;
    }
    
    /**
     * 쿨다운이 해제되기까지 남은 초를 반환합니다.
     * @returns 남은 시간 (초)
     */
    public getCooldownRemainingSeconds(): number {
        if (!this.isInCooldown()) return 0;
        
        const currentTime = Date.now();
        const cooldownEndTime = this.lastEventEndTime + this.cooldownMinutes * 60000;
        const remainingMs = cooldownEndTime - currentTime;
        return Math.max(0, remainingMs / 1000);
    }
    
    /**
     * 조건(확률, 쿨다운 등)을 확인하여 자동으로 새로운 이벤트를 발생시킵니다.
     * @returns 이벤트 발생 성공 여부
     */
    public attemptAutoTrigger(): boolean {
        if (!this.autoTriggerEnabled) return false;
        
        this.autoTriggerAttempts++;
        
        if (this.activeEvent || this.isInCooldown()) return false;
        
        if (Math.random() > this.triggerProbability) return false;
        
        this.triggerRandomEvent();
        this.successfulAutoTriggers++;
        return true;
    }

    /** 무작위 이벤트 실행 */
    private triggerRandomEvent(): void {
        const eventTypes = Object.values(InflationEventType);
        const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        this.triggerEvent(randomType);
    }
    
    /** 자동 시도 횟수 조회 */
    public getAutoTriggerAttempts(): number { return this.autoTriggerAttempts; }
    /** 자동 성공 횟수 조회 */
    public getSuccessfulAutoTriggers(): number { return this.successfulAutoTriggers; }
}
