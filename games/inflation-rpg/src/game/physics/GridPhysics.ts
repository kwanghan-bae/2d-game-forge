import { Direction } from '@/game/physics/Direction';

/**
 * 타일 기반(그리드) 이동 로직을 처리하는 클래스입니다.
 * 플레이어의 부드러운 타일 간 이동을 위해 Easing 알고리즘을 사용합니다.
 */
export class GridPhysics {
    /** 현재 이동 중인 방향 */
    private movementDirection: Direction = Direction.NONE;
    /** 초당 이동 속도 (픽셀 단위) */
    private readonly speedPixelsPerSecond: number = 224;
    /** 한 타일의 크기 (픽셀 단위) */
    private tileSizePixels: number = 32;
    /** 이동 중 남은 거리 (더 이상 사용되지 않음 - progress로 대체) */
    private movementDistanceRemaining: number = 0;

    /** 이동 중 상태 여부 */
    private isMovingState: boolean = false;
    /** 이동시킬 대상 객체 (플레이어 스프라이트) */
    private player: Phaser.GameObjects.Sprite | { x: number, y: number, setDepth: (d: number) => void };
    
    /** 이동 시작 시점의 픽셀 좌표 */
    private startPixel: { x: number; y: number } = { x: 0, y: 0 };
    /** 현재 타일 내 이동 진행도 (픽셀 단위) */
    private movementProgress: number = 0;

    /**
     * GridPhysics의 생성자입니다.
     * @param player 제어할 스프라이트 객체
     * @param tileSize 타일 크기
     */
    constructor(player: Phaser.GameObjects.Sprite | any, tileSize: number) {
        this.player = player;
        this.tileSizePixels = tileSize;
    }

    /**
     * 플레이어를 특정 방향으로 한 타일 이동시킵니다.
     * @param direction 이동할 방향
     */
    public movePlayer(direction: Direction): void {
        if (this.isMoving()) return;
        this.startMoving(direction);
    }

    /**
     * 매 프레임 업데이트 시 호출되어 이동 상태를 갱신합니다.
     * @param delta 프레임 간 경과 시간 (ms)
     */
    public update(delta: number): void {
        if (this.isMoving()) {
            this.updatePlayerPosition(delta);
        }
    }

    /**
     * 플레이어가 현재 타일 간 이동 중인지 여부를 반환합니다.
     * @returns 이동 중 여부
     */
    public isMoving(): boolean {
        return this.isMovingState;
    }

    /**
     * 이동을 시작하기 위한 초기 상태를 설정합니다.
     * @param direction 시작할 방향
     */
    private startMoving(direction: Direction): void {
        this.movementDirection = direction;
        this.isMovingState = true;
        this.movementDistanceRemaining = this.tileSizePixels;
        this.startPixel = { x: this.player.x, y: this.player.y };
        this.movementProgress = 0;
    }

    /**
     * 프레임 경과에 따라 플레이어의 위치를 부드럽게 보간하여 갱신합니다.
     * @param delta 경과 시간
     */
    private updatePlayerPosition(delta: number): void {
        const pixelsToMove = (this.speedPixelsPerSecond * delta) / 1000;
        this.movementProgress += pixelsToMove;
        
        // 이동 진행률 (0.0 ~ 1.0)
        const progress = Math.min(this.movementProgress / this.tileSizePixels, 1);
        
        // Cubic.Out easing 적용하여 가속도 효과 부여
        const easedProgress = Phaser.Math.Easing.Cubic.Out(progress);
        
        // 목표 위치 계산
        const targetX = this.startPixel.x + this.getDirectionX() * this.tileSizePixels;
        const targetY = this.startPixel.y + this.getDirectionY() * this.tileSizePixels;
        
        // 선형 보간을 통한 부드러운 좌표 갱신
        this.player.x = Phaser.Math.Linear(this.startPixel.x, targetX, easedProgress);
        this.player.y = Phaser.Math.Linear(this.startPixel.y, targetY, easedProgress);
        
        // 이동 완료 시 좌표 정밀 보정 및 상태 해제
        if (progress >= 1) {
            this.finalizeMovement();
        }
    }

    /** 이동 완료 처리 */
    private finalizeMovement(): void {
        this.isMovingState = false;
        this.movementDirection = Direction.NONE;
        // 부동 소수점 오차 방지를 위해 그리드에 정확히 스냅
        this.player.x = Math.round(this.player.x / this.tileSizePixels) * this.tileSizePixels;
        this.player.y = Math.round(this.player.y / this.tileSizePixels) * this.tileSizePixels;
    }
    
    /** X축 이동 방향 벡터 반환 */
    private getDirectionX(): number {
        switch (this.movementDirection) {
            case Direction.RIGHT: return 1;
            case Direction.LEFT: return -1;
            default: return 0;
        }
    }
    
    /** Y축 이동 방향 벡터 반환 */
    private getDirectionY(): number {
        switch (this.movementDirection) {
            case Direction.DOWN: return 1;
            case Direction.UP: return -1;
            default: return 0;
        }
    }
}
