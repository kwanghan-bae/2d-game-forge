import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getEquipmentBase } from '../data/equipment';
import type { EquipmentInstance, EquipmentRarity, Inventory } from '../types';
import {
  MAX_ENHANCE_LEVEL,
  getDismantleYield,
  dismantleSingleItem,
  batchDismantleItems,
  getReforgeCost,
  getReforgeRates,
  getReforgedStatMultiplier,
  attemptReforge,
  formatEnhancedName,
  type ReforgeOutcome,
} from '../systems/reforgeSystem';
import { getBlacksmithDialogue, getCharacterReforgeReaction } from '../data/blacksmithFlavor';

interface Props {
  onClose: () => void;
  initialTab?: 'reforge' | 'dismantle';
}

const RARITY_COLORS: Record<EquipmentRarity, string> = {
  common: '#9ca3af',
  uncommon: '#34d399',
  rare: '#60a5fa',
  epic: '#c084fc',
  legendary: '#fbbf24',
  mythic: '#f43f5e',
};

const RARITY_NAMES_KR: Record<EquipmentRarity, string> = {
  common: '일반',
  uncommon: '고급',
  rare: '희귀',
  epic: '영웅',
  legendary: '전설',
  mythic: '신화',
};

export function ReforgeModal({ onClose, initialTab = 'reforge' }: Props) {
  const meta = useGameStore(s => s.meta);
  const run = useGameStore(s => s.run);

  const [activeTab, setActiveTab] = useState<'reforge' | 'dismantle'>(initialTab);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'failure' | 'info';
    message: string;
  } | null>(null);

  const allItems: EquipmentInstance[] = [
    ...meta.inventory.weapons,
    ...meta.inventory.armors,
    ...meta.inventory.accessories,
  ];

  const selectedItem = allItems.find(i => i.instanceId === selectedInstanceId) ?? allItems[0] ?? null;
  const selectedBase = selectedItem ? getEquipmentBase(selectedItem.baseId) : null;
  const currentLv = selectedItem?.enhanceLv ?? 0;
  const isMaxLv = currentLv >= MAX_ENHANCE_LEVEL;

  const cost = selectedBase ? getReforgeCost(selectedBase.rarity, currentLv) : { gold: 0, stones: 0 };
  const rates = getReforgeRates(currentLv);

  const hasEnoughGold = run.goldThisRun >= cost.gold;
  const hasEnoughStones = meta.enhanceStones >= cost.stones;
  const canReforge = selectedItem != null && !isMaxLv && hasEnoughGold && hasEnoughStones;

  const handleReforge = () => {
    if (!selectedItem || !selectedBase || !canReforge) return;

    // Deduct cost and roll reforge
    const rngRoll = Math.random();
    const greatRoll = Math.random();
    const result = attemptReforge(selectedItem, rngRoll, greatRoll);

    // Update inventory with new enhanceLv
    const updateList = (list: EquipmentInstance[]) =>
      list.map(it => (it.instanceId === selectedItem.instanceId ? { ...it, enhanceLv: result.newLv } : it));

    const updatedInventory: Inventory = {
      weapons: updateList(meta.inventory.weapons),
      armors: updateList(meta.inventory.armors),
      accessories: updateList(meta.inventory.accessories),
    };

    useGameStore.setState(s => ({
      run: {
        ...s.run,
        goldThisRun: Math.max(0, s.run.goldThisRun - result.cost.gold),
      },
      meta: {
        ...s.meta,
        enhanceStones: Math.max(0, s.meta.enhanceStones - result.cost.stones),
        inventory: updatedInventory,
      },
    }));

    const charId = run.characterId ?? 'hwarang';
    const bsLine = getBlacksmithDialogue(result.outcome);
    const heroLine = getCharacterReforgeReaction(charId, result.outcome);

    if (result.outcome === 'great_success') {
      setFeedback({
        type: 'success',
        message: `🎉 대성공! [${selectedBase.name}] 강화 +2 달성! (+${result.newLv}) | 대장장이: "${bsLine}" | 영웅: "${heroLine}"`,
      });
    } else if (result.outcome === 'success') {
      setFeedback({
        type: 'success',
        message: `✨ 성공! [${selectedBase.name}] 강화 +1 성공! (+${result.newLv}) | 대장장이: "${bsLine}" | 영웅: "${heroLine}"`,
      });
    } else {
      setFeedback({
        type: 'failure',
        message: `💨 실패... 재료가 소모되었으나 장비는 안전하게 보호되었습니다. (+${result.newLv}) | 대장장이: "${bsLine}" | 영웅: "${heroLine}"`,
      });
    }
  };

  const handleDismantleSingle = (instanceId: string) => {
    const res = dismantleSingleItem(meta.inventory, instanceId, meta.equippedItemIds);
    if (!res.success || !res.yield) {
      setFeedback({
        type: 'failure',
        message: res.error === 'equipped' ? '⚠️ 현재 착용 중인 장비는 분해할 수 없습니다.' : '분해 실패.',
      });
      return;
    }

    const { stones, goldRefund, name } = res.yield;
    useGameStore.setState(s => ({
      run: {
        ...s.run,
        goldThisRun: s.run.goldThisRun + goldRefund,
      },
      meta: {
        ...s.meta,
        enhanceStones: s.meta.enhanceStones + stones,
        inventory: res.newInventory,
      },
    }));

    if (selectedInstanceId === instanceId) {
      setSelectedInstanceId(null);
    }

    setFeedback({
      type: 'info',
      message: `🔨 [${name}] 분해 완료: 강화석 +${stones}개, 골드 +${goldRefund.toLocaleString()}G 획득!`,
    });
  };

  const handleBatchDismantle = (rarity: EquipmentRarity) => {
    const res = batchDismantleItems(meta.inventory, [rarity], meta.equippedItemIds);
    if (res.dismantledCount === 0) {
      setFeedback({
        type: 'info',
        message: `분해 가능한 미착용 ${RARITY_NAMES_KR[rarity]} 장비가 없습니다.`,
      });
      return;
    }

    useGameStore.setState(s => ({
      run: {
        ...s.run,
        goldThisRun: s.run.goldThisRun + res.totalGoldRefund,
      },
      meta: {
        ...s.meta,
        enhanceStones: s.meta.enhanceStones + res.totalStones,
        inventory: res.newInventory,
      },
    }));

    setSelectedInstanceId(null);
    setFeedback({
      type: 'info',
      message: `🔨 ${RARITY_NAMES_KR[rarity]} 장비 ${res.dismantledCount}개 일괄 분해: 강화석 +${res.totalStones}개, 골드 +${res.totalGoldRefund.toLocaleString()}G 획득!`,
    });
  };

  return (
    <div
      data-testid="reforge-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 110,
      }}
      onClick={onClose}
    >
      <div
        data-testid="reforge-modal"
        style={{
          width: 'min(520px, 96vw)',
          maxHeight: '90vh',
          background: '#151822',
          color: '#eee',
          borderRadius: 12,
          border: '1px solid #3b4252',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #2e3440',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#1a1e2b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>⚒️</span>
            <strong style={{ fontSize: 16, color: '#e5e9f0' }}>전설의 대장간</strong>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            <span style={{ color: '#fbbf24' }}>💰 {run.goldThisRun.toLocaleString()} G</span>
            <span style={{ color: '#60a5fa' }}>💎 강화석 {meta.enhanceStones.toLocaleString()}개</span>
          </div>
          <button
            data-testid="close-btn"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: 18,
              cursor: 'pointer',
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #2e3440', background: '#181b26' }}>
          <button
            data-testid="tab-reforge"
            onClick={() => { setActiveTab('reforge'); setFeedback(null); }}
            style={{
              flex: 1,
              padding: '10px 0',
              background: activeTab === 'reforge' ? '#252a3a' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'reforge' ? '2px solid #60a5fa' : 'none',
              color: activeTab === 'reforge' ? '#60a5fa' : '#888',
              fontWeight: activeTab === 'reforge' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            장비 재연마 (강화)
          </button>
          <button
            data-testid="tab-dismantle"
            onClick={() => { setActiveTab('dismantle'); setFeedback(null); }}
            style={{
              flex: 1,
              padding: '10px 0',
              background: activeTab === 'dismantle' ? '#252a3a' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'dismantle' ? '2px solid #f87171' : 'none',
              color: activeTab === 'dismantle' ? '#f87171' : '#888',
              fontWeight: activeTab === 'dismantle' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            장비 분해 (재료 획득)
          </button>
        </div>

        {/* Feedback message banner */}
        {feedback && (
          <div
            data-testid="reforge-feedback"
            style={{
              padding: '8px 16px',
              fontSize: 12,
              background:
                feedback.type === 'success' ? '#064e3b' : feedback.type === 'failure' ? '#7f1d1d' : '#1e3a8a',
              color: '#f3f4f6',
              borderBottom: '1px solid #374151',
              textAlign: 'center',
            }}
          >
            {feedback.message}
          </div>
        )}

        {/* Content Body */}
        <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
          {activeTab === 'reforge' ? (
            /* Reforge Tab */
            <div>
              {/* Item selection list */}
              <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>강화할 장비 선택:</div>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  overflowX: 'auto',
                  paddingBottom: 8,
                  marginBottom: 16,
                }}
              >
                {allItems.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#666' }}>보유 중인 장비가 없습니다.</div>
                ) : (
                  allItems.map(it => {
                    const base = getEquipmentBase(it.baseId);
                    if (!base) return null;
                    const isSelected = (selectedItem?.instanceId ?? '') === it.instanceId;
                    const isEquipped = meta.equippedItemIds.includes(it.instanceId);
                    return (
                      <button
                        key={it.instanceId}
                        data-testid={`select-item-${it.instanceId}`}
                        onClick={() => { setSelectedInstanceId(it.instanceId); setFeedback(null); }}
                        style={{
                          flexShrink: 0,
                          padding: '6px 10px',
                          borderRadius: 8,
                          border: `1px solid ${isSelected ? '#60a5fa' : '#333'}`,
                          background: isSelected ? '#1e293b' : '#181b26',
                          color: RARITY_COLORS[base.rarity],
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: 12,
                        }}
                      >
                        <div>
                          {formatEnhancedName(base.name, it.enhanceLv)}
                          {isEquipped && <span style={{ color: '#34d399', marginLeft: 4 }}>[E]</span>}
                        </div>
                        <div style={{ fontSize: 10, color: '#666' }}>{base.slot}</div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Selected Item Reforge Panel */}
              {selectedItem && selectedBase ? (
                <div
                  style={{
                    background: '#1e2230',
                    borderRadius: 8,
                    padding: 16,
                    border: '1px solid #2e3440',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <span
                        style={{
                          fontSize: 11,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: '#111',
                          color: RARITY_COLORS[selectedBase.rarity],
                          marginRight: 6,
                        }}
                      >
                        {RARITY_NAMES_KR[selectedBase.rarity]}
                      </span>
                      <strong style={{ fontSize: 16, color: RARITY_COLORS[selectedBase.rarity] }}>
                        {formatEnhancedName(selectedBase.name, currentLv)}
                      </strong>
                      {meta.equippedItemIds.includes(selectedItem.instanceId) && (
                        <span style={{ fontSize: 11, color: '#34d399', marginLeft: 6 }}>[착용 중]</span>
                      )}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 'bold', color: '#60a5fa' }}>
                      {isMaxLv ? '최대 강화 달성' : `+${currentLv} ➔ +${currentLv + 1}`}
                    </div>
                  </div>

                  {/* Stat multiplier preview */}
                  <div
                    style={{
                      background: '#151822',
                      borderRadius: 6,
                      padding: 10,
                      marginBottom: 14,
                      fontSize: 13,
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ color: '#aaa' }}>스탯 증폭 효과:</span>
                    <span>
                      <span style={{ color: '#9ca3af' }}>
                        +{Math.round((getReforgedStatMultiplier(selectedBase.rarity, currentLv) - 1) * 100)}%
                      </span>
                      {!isMaxLv && (
                        <>
                          <span style={{ margin: '0 6px', color: '#666' }}>➔</span>
                          <span style={{ color: '#34d399', fontWeight: 'bold' }}>
                            +{Math.round((getReforgedStatMultiplier(selectedBase.rarity, currentLv + 1) - 1) * 100)}%
                          </span>
                        </>
                      )}
                    </span>
                  </div>

                  {!isMaxLv ? (
                    <>
                      {/* Rates & Cost */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 8,
                          marginBottom: 14,
                          fontSize: 12,
                        }}
                      >
                        <div style={{ background: '#151822', padding: 8, borderRadius: 6 }}>
                          <div style={{ color: '#888', marginBottom: 2 }}>강화 성공 확률</div>
                          <div style={{ fontSize: 14, fontWeight: 'bold', color: rates.successRate >= 0.8 ? '#34d399' : '#fbbf24' }}>
                            {Math.round(rates.successRate * 100)}%
                            {rates.greatSuccessRate > 0 && (
                              <span style={{ fontSize: 10, color: '#a78bfa', marginLeft: 4 }}>
                                (대성공 {Math.round(rates.greatSuccessRate * 100)}%)
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ background: '#151822', padding: 8, borderRadius: 6 }}>
                          <div style={{ color: '#888', marginBottom: 2 }}>필요 비용</div>
                          <div style={{ fontSize: 13 }}>
                            <span style={{ color: hasEnoughGold ? '#fbbf24' : '#f87171' }}>
                              {cost.gold.toLocaleString()} G
                            </span>
                            <span style={{ margin: '0 4px', color: '#666' }}>+</span>
                            <span style={{ color: hasEnoughStones ? '#60a5fa' : '#f87171' }}>
                              강화석 {cost.stones}개
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Safety badge */}
                      <div style={{ fontSize: 11, color: '#38bdf8', marginBottom: 14, textAlign: 'center' }}>
                        🛡️ 강화 실패 시에도 장비가 파괴되거나 강화 수치가 떨어지지 않습니다.
                      </div>

                      {/* Action Button */}
                      <button
                        data-testid="reforge-btn"
                        disabled={!canReforge}
                        onClick={handleReforge}
                        style={{
                          width: '100%',
                          padding: '12px 0',
                          borderRadius: 8,
                          border: 'none',
                          background: canReforge ? '#2563eb' : '#334155',
                          color: canReforge ? '#fff' : '#64748b',
                          fontWeight: 'bold',
                          fontSize: 15,
                          cursor: canReforge ? 'pointer' : 'not-allowed',
                          transition: 'background 0.2s',
                        }}
                      >
                        {!hasEnoughGold
                          ? '골드 부족'
                          : !hasEnoughStones
                          ? '강화석 부족'
                          : '장비 재연마 시도'}
                      </button>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '12px 0', color: '#fbbf24', fontWeight: 'bold' }}>
                      🌟 최고 강화 단계(+{MAX_ENHANCE_LEVEL})에 도달한 장비입니다!
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            /* Dismantle Tab */
            <div>
              {/* Batch dismantle actions */}
              <div
                style={{
                  background: '#1e2230',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  border: '1px solid #2e3440',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 8, color: '#f87171' }}>
                  📦 미착용 장비 일괄 분해
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    data-testid="batch-dismantle-common"
                    onClick={() => handleBatchDismantle('common')}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: 6,
                      border: '1px solid #4b5563',
                      background: '#1f2937',
                      color: RARITY_COLORS.common,
                      fontSize: 12,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    일반(Common) 분해
                  </button>
                  <button
                    data-testid="batch-dismantle-uncommon"
                    onClick={() => handleBatchDismantle('uncommon')}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: 6,
                      border: '1px solid #059669',
                      background: '#064e3b',
                      color: RARITY_COLORS.uncommon,
                      fontSize: 12,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    고급(Uncommon) 분해
                  </button>
                </div>
              </div>

              {/* Individual dismantle list */}
              <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>개별 분해:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {allItems.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#666' }}>보유 중인 장비가 없습니다.</div>
                ) : (
                  allItems.map(it => {
                    const base = getEquipmentBase(it.baseId);
                    if (!base) return null;
                    const isEquipped = meta.equippedItemIds.includes(it.instanceId);
                    const yieldData = getDismantleYield(it);

                    return (
                      <div
                        key={it.instanceId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: '#1a1e2b',
                          borderRadius: 6,
                          border: '1px solid #2e3440',
                        }}
                      >
                        <div>
                          <span style={{ color: RARITY_COLORS[base.rarity], fontSize: 13, fontWeight: 'bold' }}>
                            {formatEnhancedName(base.name, it.enhanceLv)}
                          </span>
                          <span style={{ fontSize: 11, color: '#666', marginLeft: 6 }}>({base.slot})</span>
                          {isEquipped ? (
                            <span style={{ fontSize: 11, color: '#34d399', marginLeft: 6 }}>[착용 중]</span>
                          ) : (
                            yieldData && (
                              <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>
                                ➔ 💎 {yieldData.stones}개 / 💰 {yieldData.goldRefund.toLocaleString()}G
                              </span>
                            )
                          )}
                        </div>
                        <button
                          data-testid={`dismantle-btn-${it.instanceId}`}
                          disabled={isEquipped}
                          onClick={() => handleDismantleSingle(it.instanceId)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 4,
                            border: 'none',
                            background: isEquipped ? '#334155' : '#b91c1c',
                            color: isEquipped ? '#64748b' : '#fff',
                            fontSize: 11,
                            cursor: isEquipped ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {isEquipped ? '착용 중' : '분해'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
