import React from 'react';
import { useGameStore } from '../store/gameStore';
import { ForgePanel } from '@/components/ui/forge-panel';
import { ForgeButton } from '@/components/ui/forge-button';
import { ASC_TREE_NODES, ASC_TREE_NODE_IDS } from '../data/ascTree';
import type { AscTreeNodeId } from '../types';

export function AscensionTree() {
  const meta = useGameStore((s) => s.meta);
  const canBuyAscTreeNode = useGameStore((s) => s.canBuyAscTreeNode);
  const buyAscTreeNode = useGameStore((s) => s.buyAscTreeNode);
  const [confirming, setConfirming] = React.useState<AscTreeNodeId | null>(null);

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <ForgePanel data-testid="asctree-ap" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 14, color: 'var(--forge-accent)' }}>
          보유 AP: <strong>{meta.ascPoints}</strong>
        </div>
      </ForgePanel>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8,
        }}
      >
        {ASC_TREE_NODE_IDS.map((id) => {
          const def = ASC_TREE_NODES[id];
          const check = canBuyAscTreeNode(id);
          const lv = check.currentLv;
          const isMax = lv >= def.maxLevel;

          return (
            <ForgePanel key={id} data-testid={`asctree-node-${id}`} style={{ padding: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{def.name}</div>
              <div style={{ fontSize: 11, color: 'var(--forge-text-secondary)', marginTop: 2 }}>
                {def.description}
              </div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                lv {lv} / {def.maxLevel}
              </div>
              {!isMax && (
                <div style={{ fontSize: 11, color: 'var(--forge-text-secondary)' }}>
                  다음: {check.cost} AP
                </div>
              )}

              {confirming === id ? (
                <div
                  style={{
                    marginTop: 8,
                    padding: 8,
                    border: '1px solid var(--forge-accent)',
                    borderRadius: 4,
                  }}
                >
                  <div style={{ fontSize: 11, marginBottom: 6 }}>
                    lv {lv} → {lv + 1}, {check.cost} AP 소비
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <ForgeButton
                      data-testid={`asctree-confirm-${id}`}
                      variant="primary"
                      style={{ flex: 1, fontSize: 11 }}
                      onClick={() => {
                        buyAscTreeNode(id);
                        setConfirming(null);
                      }}
                    >
                      확인
                    </ForgeButton>
                    <ForgeButton
                      variant="secondary"
                      style={{ flex: 1, fontSize: 11 }}
                      onClick={() => setConfirming(null)}
                    >
                      취소
                    </ForgeButton>
                  </div>
                </div>
              ) : (
                <ForgeButton
                  data-testid={`asctree-buy-${id}`}
                  variant="primary"
                  disabled={!check.ok}
                  style={{ width: '100%', marginTop: 6, fontSize: 11 }}
                  onClick={() => setConfirming(id)}
                >
                  {isMax ? 'MAX' : '강화'}
                </ForgeButton>
              )}
            </ForgePanel>
          );
        })}
      </div>
    </div>
  );
}
