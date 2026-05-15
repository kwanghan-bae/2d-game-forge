import { describe, it, expect } from 'vitest';
import {
  ASC_TREE_NODES,
  ASC_TREE_NODE_IDS,
  nodeCost,
  nodeTotalCost,
} from './ascTree';
import type { AscTreeNodeId } from '../types';

describe('AscTree catalogue', () => {
  it('exposes 10 nodes', () => {
    expect(ASC_TREE_NODE_IDS).toHaveLength(10);
  });

  it('every node has positive max + magnitude + non-empty strings', () => {
    for (const id of ASC_TREE_NODE_IDS) {
      const def = ASC_TREE_NODES[id];
      expect(def.id).toBe(id);
      expect(def.maxLevel).toBeGreaterThan(0);
      expect(def.effectMagnitude).toBeGreaterThan(0);
      expect(def.name.length).toBeGreaterThan(0);
      expect(def.description.length).toBeGreaterThan(0);
    }
  });

  it('full saturation total cost = 295 AP', () => {
    const sum = ASC_TREE_NODE_IDS.reduce(
      (acc, id) => acc + nodeTotalCost(ASC_TREE_NODES[id].maxLevel),
      0,
    );
    expect(sum).toBe(295);
  });
});

describe('nodeCost / nodeTotalCost', () => {
  it('nodeCost(lv) = lv + 1', () => {
    expect(nodeCost(0)).toBe(1);
    expect(nodeCost(3)).toBe(4);
    expect(nodeCost(9)).toBe(10);
  });

  it('nodeTotalCost matches triangular sum', () => {
    expect(nodeTotalCost(0)).toBe(0);
    expect(nodeTotalCost(1)).toBe(1);
    expect(nodeTotalCost(5)).toBe(15);
    expect(nodeTotalCost(10)).toBe(55);
  });
});
