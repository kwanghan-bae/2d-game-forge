import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BattleScene } from '../src/game/scenes/BattleScene';
import * as Phaser from 'phaser';

// Mock Phaser
vi.mock('phaser', () => {
    const Scene = vi.fn();
    (Scene.prototype as any).cameras = {
        main: {
            shake: vi.fn()
        }
    };
    (Scene.prototype as any).time = {
        delayedCall: vi.fn((delay, callback) => callback()),
        addEvent: vi.fn(),
        timeScale: 1
    };
    (Scene.prototype as any).sound = {
        play: vi.fn()
    };
    (Scene.prototype as any).add = {
        image: vi.fn().mockReturnValue({
            setDisplaySize: vi.fn().mockReturnThis(),
            setTint: vi.fn().mockReturnThis(),
            setAlpha: vi.fn().mockReturnThis(),
            setFlipX: vi.fn().mockReturnThis(),
            setScale: vi.fn().mockReturnThis()
        })
    };
    (Scene.prototype as any).tweens = {
        add: vi.fn()
    };
    (Scene.prototype as any).scale = {
        width: 1024,
        height: 768
    };

    class EventEmitter {
        emit = vi.fn();
        on = vi.fn();
    }

    return {
        Scene,
        GameObjects: {
            Image: vi.fn()
        },
        Time: {
            TimerEvent: vi.fn()
        },
        Events: {
            EventEmitter
        }
    };
});

describe('BattleScene Effects', () => {
    let scene: any;

    beforeEach(() => {
        scene = new BattleScene();
        // Manually inject mocks that constructor might have overwritten or that were not properly mocked
        scene.cameras = {
            main: {
                shake: vi.fn()
            }
        };
        scene.time = {
            delayedCall: vi.fn((delay, callback) => callback()),
            timeScale: 1
        };
    });

    it('hitStop should set timeScale to 0 and then back to 1', () => {
        expect(typeof (scene as any).hitStop).toBe('function');
        
        // Use the actual time object from the scene
        const time = (scene as any).time;
        time.delayedCall = vi.fn((delay, callback) => {
            // Don't auto-execute here, we want to control it
        });

        (scene as any).hitStop(50);
        expect(time.timeScale).toBe(0);
        expect(time.delayedCall).toHaveBeenCalledWith(50, expect.any(Function));
        
        // Execute the callback
        const callback = (time.delayedCall as any).mock.calls[0][1];
        callback();
        expect(time.timeScale).toBe(1);
    });

    it('handlePlayerAttackHit should trigger strong shake and hitStop on critical hit', () => {
        const player = {} as any;
        const enemy = { x: 724, y: 400 } as any;
        
        // Mock combatManager
        (scene as any).combatManager = {
            calculatePlayerAttack: vi.fn().mockReturnValue({ damage: 100, isCrit: true }),
            getEnemyHP: vi.fn().mockReturnValue(50),
            getEnemyMaxHP: vi.fn().mockReturnValue(150)
        };
        // Mock uiManager
        (scene as any).uiManager = {
            updateHP: vi.fn(),
            spawnDamageText: vi.fn()
        };
        // Spy on hitStop
        const hitStopSpy = vi.spyOn(scene as any, 'hitStop');
        
        (scene as any).handlePlayerAttackHit(player, enemy);
        
        expect(scene.cameras.main.shake).toHaveBeenCalledWith(100, 0.02);
        expect(hitStopSpy).toHaveBeenCalledWith(50);
    });

    it('handlePlayerAttackHit should trigger mild shake and NO hitStop on normal hit', () => {
        const player = {} as any;
        const enemy = { x: 724, y: 400 } as any;
        
        // Mock combatManager
        (scene as any).combatManager = {
            calculatePlayerAttack: vi.fn().mockReturnValue({ damage: 50, isCrit: false }),
            getEnemyHP: vi.fn().mockReturnValue(100),
            getEnemyMaxHP: vi.fn().mockReturnValue(150)
        };
        // Mock uiManager
        (scene as any).uiManager = {
            updateHP: vi.fn(),
            spawnDamageText: vi.fn()
        };
        // Spy on hitStop
        const hitStopSpy = vi.spyOn(scene as any, 'hitStop');
        
        (scene as any).handlePlayerAttackHit(player, enemy);
        
        expect(scene.cameras.main.shake).toHaveBeenCalledWith(100, 0.01);
        expect(hitStopSpy).not.toHaveBeenCalled();
    });
});
