import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../src/game/GameState';

describe('Yaksu Point System', () => {
    let gameState: GameState;

    beforeEach(() => {
        gameState = GameState.getInstance();
        gameState.reset();
    });

    it('should add used yaksu point to state', () => {
        const yaksuId = 'yaksu_42_48';
        expect(gameState.isYaksuPointUsed(yaksuId)).toBe(false);
        
        gameState.addUsedYaksuPoint(yaksuId);
        expect(gameState.isYaksuPointUsed(yaksuId)).toBe(true);
    });

    it('should not add duplicate yaksu points', () => {
        const yaksuId = 'yaksu_42_48';
        gameState.addUsedYaksuPoint(yaksuId);
        gameState.addUsedYaksuPoint(yaksuId);
        
        expect(gameState.usedYaksuPoints.length).toBe(1);
    });

    it('should recover steps (BP) when interacting with yaksu', () => {
        gameState.stats.steps = 100;
        const yaksuId = 'yaksu_42_48';
        
        const success = gameState.useYaksu(yaksuId);
        
        expect(success).toBe(true);
        expect(gameState.stats.steps).toBe(50);
        expect(gameState.isYaksuPointUsed(yaksuId)).toBe(true);
    });

    it('should not recover steps again if already used', () => {
        gameState.stats.steps = 100;
        const yaksuId = 'yaksu_42_48';
        
        // First use
        gameState.useYaksu(yaksuId);
        expect(gameState.stats.steps).toBe(50);
        
        // Second use (same point)
        const success = gameState.useYaksu(yaksuId);
        expect(success).toBe(false);
        expect(gameState.stats.steps).toBe(50); // Should remain 50
    });

    it('should not allow steps to go below 0', () => {
        gameState.stats.steps = 30;
        const yaksuId = 'yaksu_42_48';
        
        gameState.useYaksu(yaksuId);
        
        expect(gameState.stats.steps).toBe(0);
    });

    it('should persist used yaksu points in JSON', () => {
        gameState.addUsedYaksuPoint('yaksu_1');
        gameState.addUsedYaksuPoint('yaksu_2');
        
        const json = gameState.toJSON();
        expect(json.usedYaksuPoints).toContain('yaksu_1');
        expect(json.usedYaksuPoints).toContain('yaksu_2');
        
        const newState = GameState.getInstance();
        newState.reset();
        newState.fromJSON(json);
        expect(newState.isYaksuPointUsed('yaksu_1')).toBe(true);
        expect(newState.isYaksuPointUsed('yaksu_2')).toBe(true);
    });
});
