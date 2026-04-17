import { MonsterData } from '../data/Monsters';
import { BATTLE_CONFIG } from '../constants';

/**
 * 보스 몬스터의 공격 패턴 종류를 정의하는 인터페이스입니다.
 */
export interface BossPattern {
    /** 패턴 유형 */
    type: 'roar' | 'debuff' | 'instant_death' | 'gimmick';
    /** 입히는 데미지 */
    damage?: number;
    /** 표시될 메시지 */
    message: string;
    /** 플레이어 즉사 여부 */
    playerInstantDeath?: boolean;
    /** 방어력 감소 디버프 여부 */
    defenseDebuff?: boolean;
}

/**
 * 보스 패턴 실행 결과 정보를 담는 인터페이스입니다.
 */
export interface PatternResult {
    /** 발생한 데미지 */
    damage?: number;
    /** 시스템 메시지 */
    message: string;
    /** 플레이어 즉사 발생 여부 */
    playerInstantDeath: boolean;
    /** 방어력 감소 발생 여부 */
    defenseDebuff: boolean;
}

/**
 * 디버프 적용 결과 정보를 담는 인터페이스입니다.
 */
export interface DebuffResult {
    /** 방어력 배율 (감소폭) */
    defenseMultiplier: number;
    /** 남은 지속 턴 수 */
    duration: number;
}

/**
 * 보스 기믹 상태 정보를 담는 인터페이스입니다.
 */
export interface GimmickState {
    /** 기믹 활성화 여부 */
    isActive: boolean;
    /** 기믹이 이미 한 번 발동되었는지 여부 */
    hasTriggered: boolean;
    /** 기믹 남은 지속 턴 수 */
    turnsRemaining: number;
}

/**
 * 보스 몬스터의 AI 로직과 특수 공격 패턴을 관리하는 클래스입니다.
 * 보스별로 고유한 턴 기반 공격 패턴을 순환하며 실행합니다.
 */
export class BossAI {
    /** 전투 시작 후 경과된 턴 수 */
    private turnCount = 0;
    /** 현재 디버프 활성화 상태 여부 */
    private debuffActive = false;
    /** 디버프의 남은 지속 시간 (턴 단위) */
    private debuffTurnsRemaining = 0;

    /** 보스 기믹 상태 */
    private gimmickState: GimmickState = {
        isActive: false,
        hasTriggered: false,
        turnsRemaining: 0
    };

    /** 보스 ID별 패턴 처리 함수 매핑 */
    private readonly bossHandlers: Record<number, () => PatternResult> = {
        9001: () => this.executeSangunPattern(),
        9002: () => this.executeYamrajaPattern(),
        [BATTLE_CONFIG.BOSS_ID_GUMIHO]: () => this.executeGumihoPattern()
    };

    /**
     * 보스 데이터에 맞는 특수 패턴을 실행합니다.
     * @param bossData 현재 보스 몬스터 데이터
     * @returns 패턴 실행 결과
     */
    public executePattern(bossData: MonsterData): PatternResult {
        this.turnCount++;
        const handler = this.bossHandlers[bossData.id];
        return handler ? handler() : this.getDefaultPattern();
    }

    /** 기본 공격 패턴 반환 */
    private getDefaultPattern(): PatternResult {
        return { message: '보스의 공격!', playerInstantDeath: false, defenseDebuff: false };
    }

    /**
     * 구미호(9003)의 공격 패턴 처리
     */
    private executeGumihoPattern(): PatternResult {
        const turn = this.turnCount % 3;
        if (this.gimmickState.isActive) {
            return this.createPatternResult('구미호가 영험한 방어막 뒤에서 공격한다!', 45);
        }
        if (turn === 1) return this.createPatternResult('구미호가 여우불을 내뿜는다!', 50);
        return this.createPatternResult('구미호의 날카로운 발톱 공격!', 40);
    }

    /**
     * 보스 기믹을 업데이트합니다. (주로 플레이어 공격 시 호출)
     * @param bossId 보스 ID
     * @param currentHP 현재 체력
     * @param maxHP 최대 체력
     */
    public updateGimmick(bossId: number, currentHP: number, maxHP: number): void {
        if (bossId !== BATTLE_CONFIG.BOSS_ID_GUMIHO) return;

        // 기믹 발동 조건: 체력 50% 이하, 아직 발동된 적 없음
        if (!this.gimmickState.hasTriggered && currentHP <= maxHP * 0.5) {
            this.gimmickState.isActive = true;
            this.gimmickState.hasTriggered = true;
            this.gimmickState.turnsRemaining = 3;
        }
    }

    /**
     * 턴 종료 시 기믹 지속 시간을 관리합니다.
     */
    public processGimmickTurn(): void {
        if (this.gimmickState.isActive) {
            this.gimmickState.turnsRemaining--;
            if (this.gimmickState.turnsRemaining <= 0) {
                this.gimmickState.isActive = false;
            }
        }
    }

    /** 기믹 활성화 여부 확인 */
    public isGimmickActive(): boolean {
        return this.gimmickState.isActive;
    }

    /** 기믹 상태 반환 */
    public getGimmickState(): GimmickState {
        return { ...this.gimmickState };
    }

    /**
     * 산군(호랑이 보스)의 공격 패턴을 처리합니다. (포효 → 방어력 약화 → 일반 공격)
     */
    private executeSangunPattern(): PatternResult {
        const turn = this.turnCount % 3;
        if (turn === 1) return this.createPatternResult('산군이 포효한다! 🐯', 50);
        if (turn === 2) return this.applySangunDebuff();
        return this.createPatternResult('산군이 할퀸다!', 40);
    }

    /** 산군 특수 디버프 적용 */
    private applySangunDebuff(): PatternResult {
        this.debuffActive = true;
        this.debuffTurnsRemaining = 2;
        return {
            message: '산군의 광기어린 공격으로 방어력이 약해졌다!',
            playerInstantDeath: false,
            defenseDebuff: true,
            damage: 30
        };
    }

    /**
     * 염라대왕 보스의 공격 패턴을 처리합니다.
     */
    private executeYamrajaPattern(): PatternResult {
        const isJudgmentTurn = this.turnCount % 2 === 1;
        const msg = isJudgmentTurn ? '심판의 눈빛을 쏟아낸다!' : '당신의 업보를 읽는다...';
        return this.createPatternResult(`염라대왕이 ${msg}`, isJudgmentTurn ? 60 : 40);
    }

    /** 공통 패턴 결과 생성 헬퍼 */
    private createPatternResult(message: string, damage: number): PatternResult {
        return { message, damage, playerInstantDeath: false, defenseDebuff: false };
    }

    /**
     * 현재 활성화된 방어력 디버프 상태를 처리하고 결과를 반환합니다.
     */
    public processDebuffs(): DebuffResult {
        if (!this.shouldApplyDebuff()) {
            this.debuffActive = false;
            return { defenseMultiplier: 1, duration: 0 };
        }

        this.debuffTurnsRemaining--;
        return { defenseMultiplier: 0.5, duration: this.debuffTurnsRemaining };
    }

    /** 디버프 적용 가능 여부 체크 */
    private shouldApplyDebuff(): boolean {
        return this.debuffActive && this.debuffTurnsRemaining > 0;
    }

    /** 업보에 따른 즉사 판정 */
    public checkInstantDeath(karma: number): boolean {
        return karma >= 100;
    }

    /** 상태 초기화 */
    public resetTurns(): void {
        this.turnCount = 0;
        this.debuffActive = false;
        this.debuffTurnsRemaining = 0;
    }
}
