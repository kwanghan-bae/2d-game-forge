import { GameState } from '../GameState';
import { InflationManager } from './InflationManager';
import { Item, ItemType, ItemStat } from '../data/ItemData';

/**
 * 저장을 위해 직렬화된 아이템 정보 인터페이스입니다.
 */
interface SerializedItem {
    /** 아이템 ID */
    id: number;
    /** 아이템 이름 */
    name: string;
    /** 아이템 종류 (무기, 방어구 등) */
    type: ItemType;
    /** 아이템 설명 */
    description: string;
    /** 아이템 능력치 */
    stats: ItemStat;
    /** 아이템 가격 */
    price: number;
    /** 아틀라스 리소스 키 */
    atlasKey: string;
    /** 아틀라스 내 프레임 번호 */
    frame: number;
}

/**
 * 게임 저장 데이터의 전체 구조를 정의하는 인터페이스입니다.
 */
export interface SaveData {
    /** 저장 데이터 버전 */
    version: string;
    /** 저장 시점의 타임스탬프 */
    timestamp: number;
    /** 게임 상태 정보 (플레이어 스탯, 인벤토리 등) */
    gameState: {
        /** 플레이어 레벨 */
        level: number;
        /** 플레이어 경험치 */
        exp: number;
        /** 보유 골드 */
        gold: number;
        /** 현재 체력 */
        hp: number;
        /** 최대 체력 */
        maxHp: number;
        /** 공격력 */
        attack: number;
        /** 방어력 */
        defense: number;
        /** 민첩성 */
        agi: number;
        /** 행운 */
        luk: number;
        /** 총 이동 걸음 수 */
        steps: number;
        /** 현재 위치한 지역 명칭 */
        zone: string;
        /** 직렬화된 인벤토리 아이템 목록 */
        inventory: SerializedItem[];
        /** 부위별 직렬화된 장착 아이템 정보 */
        equipment: Partial<Record<ItemType, SerializedItem | null>>;
        /** 선택된 직업 ID */
        selectedClass?: string | null;
        /** 영혼 등급 */
        soulGrade?: number;
        /** 업보 수치 */
        karma?: number;
        /** 스킬별 남은 재사용 대기시간 */
        activeSkillCooldowns?: {[key: number]: number};
        /** 격파한 보스 ID 목록 */
        defeatedBosses?: number[];
        /** 해금된 직업 목록 */
        unlockedClasses?: string[];
    };
    /** 인플레이션 관리자 상태 정보 */
    inflationManager: {
        /** 인플레이션 시작 시각 */
        startTime: number;
        /** 현재 인플레이션율 */
        inflationRate: number;
    };
}

/**
 * 게임의 저장 및 불러오기를 담당하는 관리자 클래스입니다.
 * 로컬 스토리지를 사용하여 데이터를 영구적으로 보관하며, 싱글톤 패턴으로 구현되었습니다.
 */
export class SaveManager {
    /** SaveManager의 싱글톤 인스턴스 */
    private static instance: SaveManager;
    /**
     * 로컬 스토리지에서 데이터를 구분하기 위한 고유 식별자입니다.
     * (주의: 이 값은 보안 비밀번호나 인증 토큰이 아닌 단순한 저장소 키입니다.)
     */
    private readonly STORAGE_IDENTIFIER = 'korea_inflation_rpg_save';
    /** 저장 데이터의 현재 버전입니다. */
    private readonly VERSION = '2.0.0';
    /** 저장 실패 시 최대 재시도 횟수입니다. */
    private readonly MAX_RETRIES = 3;
    /** 재시도 간격 (밀리초) 설정입니다. */
    private readonly RETRY_DELAYS = [1000, 2000, 4000];
    
    /**
     * SaveManager의 생성자입니다. 싱글톤 패턴을 강제합니다.
     */
    private constructor() {
        if (SaveManager.instance) {
            throw new Error('SaveManager는 싱글톤입니다. getInstance()를 사용하세요.');
        }
    }
    
    /**
     * SaveManager의 싱글톤 인스턴스를 반환합니다.
     * @returns SaveManager 인스턴스
     */
    public static getInstance(): SaveManager {
        if (!SaveManager.instance) {
            SaveManager.instance = new SaveManager();
        }
        return SaveManager.instance;
    }
    
    /**
     * 발생한 에러가 스토리지 용량 초과와 관련이 있는지 확인합니다.
     * @param error 발생한 에러 객체
     * @returns 용량 초과 여부
     */
    private isStorageQuotaExceeded(error: Error): boolean {
        const name = error.name;
        const message = error.message.toLowerCase();
        return (
            name === 'QuotaExceededError' ||
            name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
            message.includes('quota') ||
            message.includes('storage full')
        );
    }
    
    /**
     * 발생한 에러가 스토리지 접근 보안 에러인지 확인합니다.
     * @param error 발생한 에러 객체
     * @returns 보안 에러 여부
     */
    private isStorageSecurityError(error: Error): boolean {
        const name = error.name;
        return (
            name === 'SecurityError' ||
            name === 'NS_ERROR_DOM_SECURITY_ERR'
        );
    }
    
    /**
     * 지정된 시간만큼 대기합니다.
     * @param ms 대기할 밀리초
     */
    private async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 구 버전의 데이터를 최신 버전 형식으로 마이그레이션합니다. (예: 1.0.0 → 2.0.0)
     * @param data 마이그레이션할 저장 데이터
     * @returns 마이그레이션이 완료된 저장 데이터
     */
    private migrateData(data: SaveData): SaveData {
        const currentVersion = '2.0.0';
        if (!data.version || data.version === '1.0.0') {
            this.applyV1ToV2Migration(data);
            data.version = currentVersion;
        }
        return data;
    }

    /** v1.0.0 → v2.0.0 마이그레이션: 새 필드들을 기본값으로 초기화 */
    private applyV1ToV2Migration(data: SaveData): void {
        const defaultValues = {
            selectedClass: null,
            soulGrade: 0,
            karma: 0,
            activeSkillCooldowns: {},
            defeatedBosses: [],
            unlockedClasses: []
        };
        
        Object.entries(defaultValues).forEach(([key, value]) => {
            (data.gameState as any)[key] = (data.gameState as any)[key] ?? value;
        });
    }
    
    /**
     * 현재 게임의 모든 상태를 수집하여 SaveData 객체를 생성합니다.
     * @returns 생성된 SaveData 객체
     */
    private buildSaveData(): SaveData {
        const gameState = GameState.getInstance();
        const inflationManager = InflationManager.getInstance();
        
        return {
            version: this.VERSION,
            timestamp: Date.now(),
            gameState: {
                ...this.getBasicStats(gameState),
                inventory: gameState.inventory.map(item => this.serializeItem(item)),
                equipment: this.getSerializedEquipment(gameState)
            },
            inflationManager: {
                startTime: inflationManager.getStartTime(),
                inflationRate: inflationManager.getInflationRate()
            }
        };
    }

    /** 기본 플레이어 스탯 정보를 추출합니다. */
    private getBasicStats(gameState: GameState) {
        return {
            level: gameState.stats.level,
            exp: gameState.stats.exp,
            gold: gameState.stats.gold,
            hp: gameState.stats.hp,
            maxHp: gameState.stats.maxHp,
            attack: gameState.stats.attack,
            defense: gameState.stats.defense,
            agi: gameState.stats.agi,
            luk: gameState.stats.luk,
            steps: gameState.stats.steps,
            zone: gameState.stats.zone,
            selectedClass: gameState.selectedClass,
            soulGrade: gameState.soulGrade,
            karma: gameState.karma,
            activeSkillCooldowns: gameState.activeSkillCooldowns,
            defeatedBosses: gameState.defeatedBosses,
            unlockedClasses: gameState.unlockedClasses
        };
    }

    /** 장착된 장비들을 직렬화하여 반환합니다. */
    private getSerializedEquipment(gameState: GameState) {
        return Object.fromEntries(
            Object.entries(gameState.equipment).map(([slot, item]) => [
                slot,
                item ? this.serializeItem(item) : null
            ])
        );
    }

    /** 개별 아이템 객체를 저장용 데이터 형식으로 변환합니다. */
    private serializeItem(item: Item): SerializedItem {
        return {
            id: item.id,
            name: item.name,
            type: item.type,
            description: item.description,
            stats: item.stats,
            price: item.price,
            atlasKey: item.atlasKey,
            frame: item.frame
        };
    }
    
    /**
     * 로컬 스토리지에 유효한 저장 데이터가 존재하는지 확인합니다.
     * @returns 데이터 존재 여부
     */
    public hasSaveData(): boolean {
        try {
            const data = localStorage.getItem(this.STORAGE_IDENTIFIER);
            if (!data) return false;
            JSON.parse(data);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 데이터를 로컬 스토리지에 기록을 시도합니다.
     * @param data 저장할 SaveData 객체
     */
    private attemptSave(data: SaveData): void {
        localStorage.setItem(this.STORAGE_IDENTIFIER, JSON.stringify(data));
    }

    /**
     * 현재 게임 상태를 로컬 스토리지에 영구적으로 저장합니다.
     * 실패 시 재시도 로직을 포함합니다.
     * @returns 저장 성공 여부를 담은 Promise
     */
    public async saveGame(): Promise<boolean> {
        try {
            const saveData = this.buildSaveData();
            return await this.executeWithRetry(() => this.attemptSave(saveData));
        } catch (error) {
            this.logSaveError(error);
            return false;
        }
    }
    
    /**
     * 주어진 저장 로직을 재시도 정책에 따라 실행합니다.
     * @param saveAction 실행할 저장 함수
     * @returns 성공 여부
     */
    private async executeWithRetry(saveAction: () => void): Promise<boolean> {
        for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
            try {
                saveAction();
                return true;
            } catch (error) {
                if (!(error instanceof Error) || !this.handleRetryLogic(error, attempt)) {
                    return false;
                }
                await this.sleep(this.RETRY_DELAYS[attempt]);
            }
        }
        return false;
    }

    /** 에러 종류에 따른 재시도 및 로깅 처리 */
    private handleRetryLogic(error: Error, attempt: number): boolean {
        if (this.isStorageQuotaExceeded(error)) {
            console.warn(`저장 실패 (시도 ${attempt + 1}/${this.MAX_RETRIES}): Storage full`, error);
            if (attempt < this.MAX_RETRIES - 1) {
                console.log(`${this.RETRY_DELAYS[attempt]}ms 후 재시도...`);
                return true;
            }
            console.error(`저장 실패: ${this.MAX_RETRIES}회 재시도 후에도 실패 (Storage full 가능성)`);
        } else if (this.isStorageSecurityError(error)) {
            console.error('저장 실패: Storage 접근 권한 없음 (보안 정책)', error);
        } else {
            console.error('저장 실패: 예상치 못한 Storage 에러', error);
        }
        return false;
    }

    /**
     * 저장 중 발생한 예외를 로깅합니다.
     * @param error 발생한 에러 객체
     */
    private logSaveError(error: unknown): void {
        console.error('게임 저장 중 예외 발생:', error);
        if (error instanceof Error) {
            console.error(`에러 타입: ${error.name}, 메시지: ${error.message}`);
        }
    }
    
    /**
     * 로컬 스토리지에서 저장된 데이터를 불러옵니다.
     * 데이터 로드 후 최신 버전으로의 마이그레이션도 함께 수행합니다.
     * @returns 불러온 SaveData 객체 또는 null (데이터 없음/에러 발생 시)
     */
    public loadGame(): SaveData | null {
        try {
            const data = localStorage.getItem(this.STORAGE_IDENTIFIER);
            if (!data) {
                return null;
            }
            
            let saveData: SaveData = JSON.parse(data);
            
            if (!saveData.gameState || !saveData.inflationManager) {
                console.error('저장 데이터 구조가 올바르지 않습니다.');
                return null;
            }
            
            // 데이터 마이그레이션 수행
            saveData = this.migrateData(saveData);
            
            return saveData;
        } catch (error) {
            console.error('게임 불러오기 실패:', error);
            return null;
        }
    }
    
    /**
     * 로컬 스토리지에 저장된 게임 데이터를 완전히 삭제합니다.
     */
    public deleteSaveData(): void {
        try {
            localStorage.removeItem(this.STORAGE_IDENTIFIER);
        } catch (error) {
            console.error('저장 데이터 삭제 실패:', error);
        }
    }
}
