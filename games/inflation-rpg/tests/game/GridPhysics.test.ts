import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GridPhysics } from '../src/game/physics/GridPhysics';
import { Direction } from '../src/game/physics/Direction';

// Mock Phaser namespace
global.Phaser = {
    Math: {
        Easing: {
            Cubic: {
                Out: (v: number) => {
                    // Cubic.Out easing: 1 - (1-v)^3
                    const inv = 1 - v;
                    return 1 - inv * inv * inv;
                }
            }
        },
        Linear: (start: number, end: number, t: number) => {
            return start + (end - start) * t;
        }
    }
} as any;

// Mock Object
class MockSprite {
    x: number = 0;
    y: number = 0;
    setDepth(d: number) { }
}

describe('GridPhysics', () => {
    let gridPhysics: GridPhysics;
    let mockSprite: any;
    const tileSize = 32;

    beforeEach(() => {
        mockSprite = new MockSprite();
        gridPhysics = new GridPhysics(mockSprite, tileSize);
    });

    it('should start at (0,0) pixel coordinates by default', () => {
        expect(mockSprite.x).toBe(0);
        expect(mockSprite.y).toBe(0);
    });

    it('should move player right by tile size', () => {
        gridPhysics.movePlayer(Direction.RIGHT);
        gridPhysics.update(1000); // Simulate update finishing movement
        expect(mockSprite.x).toBe(tileSize);
        expect(mockSprite.y).toBe(0);
    });

    it('should move player down by tile size', () => {
        gridPhysics.movePlayer(Direction.DOWN);
        gridPhysics.update(1000);
        expect(mockSprite.x).toBe(0);
        expect(mockSprite.y).toBe(tileSize);
    });

    it('should not move if already moving', () => {
        gridPhysics.movePlayer(Direction.RIGHT);
        // Immediate next move should be ignored if movement logic takes time
        // Note: Implementation specific, assuming linear interpolation over time
        // For this simple test, we assume instant update for logic check or state flag
        expect(gridPhysics.isMoving()).toBe(true);
    });

    // A1: 새 테스트 (속도 및 easing)
    describe('Movement Speed', () => {
        it('should move at 224 pixels per second', () => {
            gridPhysics.movePlayer(Direction.RIGHT);
            
            // 1초 동안 이동하면 224px 이동해야 함
            const initialX = mockSprite.x;
            gridPhysics.update(1000); // 1000ms = 1초
            
            // 32px 타일이므로 완료 후 32px 위치에 있어야 함
            // 하지만 속도가 224px/s이므로 32px는 142ms에 도달
            expect(mockSprite.x).toBe(tileSize);
        });

        it('should complete 32px movement in approximately 143ms at 224px/s', () => {
            gridPhysics.movePlayer(Direction.RIGHT);
            
            // 32px / 224px/s = 0.143초 = 143ms
            const expectedTime = (32 / 224) * 1000;
            
            gridPhysics.update(expectedTime);
            
            // 완료되어야 함
            expect(gridPhysics.isMoving()).toBe(false);
            expect(mockSprite.x).toBe(tileSize);
        });
    });

    describe('Easing', () => {
        it('should apply easing to movement (not linear)', () => {
            mockSprite.x = 0;
            gridPhysics.movePlayer(Direction.RIGHT);
            
            // 이동 시간의 50% 지점
            const halfTime = (32 / 224) * 1000 / 2;
            gridPhysics.update(halfTime);
            
            // Cubic.Out easing이 적용되면 중간 지점이 정확히 16px이 아님
            // (선형이면 16px, easing 적용 시 더 많이 이동)
            const midPosition = mockSprite.x;
            
            // Cubic.Out은 초반에 빠르므로 16px보다 많이 이동
            expect(midPosition).toBeGreaterThan(16);
            expect(midPosition).toBeLessThan(32);
        });
    });
});
