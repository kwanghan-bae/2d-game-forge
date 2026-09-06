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
import { getRuneEnchantBlacksmithQuote } from '../data/ascensionTitles';
import {
  ALL_RUNES,
  getRuneDef,
  applyRuneEnchant,
  getEffectiveElement,
  canEnchantWithRune,
  type RuneType,
} from '../systems/enchantSystem';
import {
  ALL_CELESTIAL_RELICS,
  CELESTIAL_RELICS,
  SOCKET_COST_SHARDS,
  SOCKET_COST_GOLD,
  UNSOCKET_COST_SHARDS,
  canSocketRelic,
  socketRelic,
  canUnsocketRelic,
  unsocketRelic,
  getRelicBonusesForSlot,
  type RelicSlotType,
} from '../systems/celestialRelics';
import type { CelestialRelicType } from '../types';
import { getRelicSocketChant, getRelicUnsocketQuote } from '../data/relicFlavor';
import { ElementalBadge } from './ElementalBadge';

interface Props {
  onClose: () => void;
  initialTab?: 'reforge' | 'dismantle' | 'enchant' | 'relic';
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

  const [activeTab, setActiveTab] = useState<'reforge' | 'dismantle' | 'enchant' | 'relic'>(initialTab);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [selectedRune, setSelectedRune] = useState<RuneType>('rune_fire');
  const [selectedRelic, setSelectedRelic] = useState<CelestialRelicType>('polaris_eye');
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

  const handleEnchant = () => {
    if (!selectedItem || !selectedBase) return;
    const runeDef = getRuneDef(selectedRune);
    if (!canEnchantWithRune(selectedRune, run.goldThisRun, meta.enhanceStones)) return;

    const updatedItem = applyRuneEnchant(selectedItem, selectedRune);
    const updateList = (list: EquipmentInstance[]) =>
      list.map(it => (it.instanceId === selectedItem.instanceId ? updatedItem : it));

    const updatedInventory: Inventory = {
      weapons: updateList(meta.inventory.weapons),
      armors: updateList(meta.inventory.armors),
      accessories: updateList(meta.inventory.accessories),
    };

    useGameStore.setState(s => ({
      run: {
        ...s.run,
        goldThisRun: s.run.goldThisRun - runeDef.costGold,
      },
      meta: {
        ...s.meta,
        enhanceStones: s.meta.enhanceStones - runeDef.costStones,
        inventory: updatedInventory,
      },
    }));

    const blacksmithQuote = getRuneEnchantBlacksmithQuote(selectedRune);
    setFeedback({
      type: 'success',
      message: `🔮 [${selectedBase.name}]에 [${runeDef.nameKR}] 각인 완료! "${blacksmithQuote}"`,
    });
  };

  const handleSocketRelic = () => {
    if (!selectedItem || !selectedBase) return;
    const shards = meta.starlightShards ?? 0;
    const gold = run.goldThisRun;
    const res = socketRelic(selectedItem, selectedRelic, shards, gold);
    if (!res.success) {
      setFeedback({ type: 'failure', message: res.message });
      return;
    }

    const updateList = (list: EquipmentInstance[]) =>
      list.map(it => (it.instanceId === selectedItem.instanceId ? res.updatedInstance : it));

    useGameStore.setState(s => ({
      run: {
        ...s.run,
        goldThisRun: s.run.goldThisRun - res.goldSpent,
      },
      meta: {
        ...s.meta,
        starlightShards: (s.meta.starlightShards ?? 0) - res.shardsSpent,
        inventory: {
          weapons: updateList(s.meta.inventory.weapons),
          armors: updateList(s.meta.inventory.armors),
          accessories: updateList(s.meta.inventory.accessories),
        },
      },
    }));

    const chant = getRelicSocketChant(selectedRelic);
    setFeedback({ type: 'success', message: `${res.message} "${chant}"` });
  };

  const handleUnsocketRelic = () => {
    if (!selectedItem || !selectedBase) return;
    const relicId = selectedItem.celestialRelic;
    const shards = meta.starlightShards ?? 0;
    const res = unsocketRelic(selectedItem, shards);
    if (!res.success) {
      setFeedback({ type: 'failure', message: res.message });
      return;
    }

    const updateList = (list: EquipmentInstance[]) =>
      list.map(it => (it.instanceId === selectedItem.instanceId ? res.updatedInstance : it));

    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        starlightShards: (s.meta.starlightShards ?? 0) - res.shardsSpent,
        inventory: {
          weapons: updateList(s.meta.inventory.weapons),
          armors: updateList(s.meta.inventory.armors),
          accessories: updateList(s.meta.inventory.accessories),
        },
      },
    }));

    const unsocketQuote = relicId ? getRelicUnsocketQuote(relicId) : '';
    setFeedback({ type: 'info', message: `${res.message} "${unsocketQuote}"` });
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
            <span style={{ color: '#38bdf8' }}>✨ 파편 {(meta.starlightShards ?? 0).toLocaleString()}개</span>
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
          <button
            data-testid="tab-enchant"
            onClick={() => { setActiveTab('enchant'); setFeedback(null); }}
            style={{
              flex: 1,
              padding: '10px 0',
              background: activeTab === 'enchant' ? '#252a3a' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'enchant' ? '2px solid #a855f7' : 'none',
              color: activeTab === 'enchant' ? '#a855f7' : '#888',
              fontWeight: activeTab === 'enchant' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            속성 각인 (인챈트)
          </button>
          <button
            data-testid="tab-relic"
            onClick={() => { setActiveTab('relic'); setFeedback(null); }}
            style={{
              flex: 1,
              padding: '10px 0',
              background: activeTab === 'relic' ? '#252a3a' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'relic' ? '2px solid #38bdf8' : 'none',
              color: activeTab === 'relic' ? '#38bdf8' : '#888',
              fontWeight: activeTab === 'relic' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            성유물 소켓
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
          ) : activeTab === 'dismantle' ? (
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
          ) : activeTab === 'enchant' ? (
            /* Enchant Tab */
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>각인할 장비 선택:</div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 16 }}>
                {allItems.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#666' }}>보유 중인 장비가 없습니다.</div>
                ) : (
                  allItems.map(it => {
                    const base = getEquipmentBase(it.baseId);
                    if (!base) return null;
                    const isSelected = (selectedItem?.instanceId ?? '') === it.instanceId;
                    const currentElem = getEffectiveElement(it);
                    return (
                      <button
                        key={it.instanceId}
                        data-testid={`enchant-select-item-${it.instanceId}`}
                        onClick={() => { setSelectedInstanceId(it.instanceId); setFeedback(null); }}
                        style={{
                          flexShrink: 0,
                          padding: '6px 10px',
                          borderRadius: 8,
                          border: `1px solid ${isSelected ? '#a855f7' : '#333'}`,
                          background: isSelected ? '#2e1065' : '#181b26',
                          color: RARITY_COLORS[base.rarity],
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: 12,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>{formatEnhancedName(base.name, it.enhanceLv)}</span>
                          <ElementalBadge element={currentElem} size="sm" hideNeutral />
                        </div>
                        <div style={{ fontSize: 10, color: '#666' }}>{base.slot}</div>
                      </button>
                    );
                  })
                )}
              </div>

              {selectedItem && selectedBase && (
                <div style={{ background: '#1e2230', borderRadius: 8, padding: 16, border: '1px solid #2e3440' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <strong style={{ fontSize: 16, color: RARITY_COLORS[selectedBase.rarity] }}>
                        {formatEnhancedName(selectedBase.name, selectedItem.enhanceLv)}
                      </strong>
                      <span style={{ marginLeft: 8 }}>
                        <ElementalBadge element={getEffectiveElement(selectedItem)} size="md" />
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>각인할 속성 룬 선택:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                    {ALL_RUNES.map(r => {
                      const rDef = getRuneDef(r);
                      const isRuneSelected = selectedRune === r;
                      return (
                        <button
                          key={r}
                          data-testid={`rune-btn-${r}`}
                          onClick={() => setSelectedRune(r)}
                          style={{
                            padding: 10,
                            borderRadius: 6,
                            border: `1px solid ${isRuneSelected ? rDef.color : '#334155'}`,
                            background: isRuneSelected ? '#252a3a' : '#151822',
                            color: rDef.color,
                            textAlign: 'left',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 2 }}>
                            {rDef.emoji} {rDef.nameKR}
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>
                            💰 {rDef.costGold.toLocaleString()}G + 💎 {rDef.costStones}개
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {(() => {
                    const rDef = getRuneDef(selectedRune);
                    const canAfford = canEnchantWithRune(selectedRune, run.goldThisRun, meta.enhanceStones);
                    return (
                      <div>
                        <div style={{ background: '#151822', padding: 10, borderRadius: 6, marginBottom: 14, fontSize: 12 }}>
                          <div style={{ color: rDef.color, fontWeight: 'bold', marginBottom: 4 }}>
                            {rDef.emoji} {rDef.nameKR} 각인 효과:
                          </div>
                          <div style={{ color: '#ccc', marginBottom: 4 }}>{rDef.description}</div>
                          <div style={{ color: '#fbbf24' }}>
                            소모: {rDef.costGold.toLocaleString()}G + 강화석 {rDef.costStones}개
                          </div>
                        </div>

                        <button
                          data-testid="enchant-btn"
                          disabled={!canAfford}
                          onClick={handleEnchant}
                          style={{
                            width: '100%',
                            padding: '12px 0',
                            borderRadius: 8,
                            border: 'none',
                            background: canAfford ? '#7c3aed' : '#334155',
                            color: canAfford ? '#fff' : '#64748b',
                            fontWeight: 'bold',
                            fontSize: 15,
                            cursor: canAfford ? 'pointer' : 'not-allowed',
                          }}
                        >
                          {!canAfford ? '비용 부족 (골드 또는 강화석)' : '룬 각인 실행'}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : (
            /* Relic Tab */
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>성유물을 장착할 장비 선택:</div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 16 }}>
                {allItems.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#666' }}>보유 중인 장비가 없습니다.</div>
                ) : (
                  allItems.map(it => {
                    const base = getEquipmentBase(it.baseId);
                    if (!base) return null;
                    const isSelected = (selectedItem?.instanceId ?? '') === it.instanceId;
                    const relicDef = it.celestialRelic ? CELESTIAL_RELICS[it.celestialRelic] : null;
                    return (
                      <button
                        key={it.instanceId}
                        data-testid={`relic-select-item-${it.instanceId}`}
                        onClick={() => { setSelectedInstanceId(it.instanceId); setFeedback(null); }}
                        style={{
                          flexShrink: 0,
                          padding: '6px 10px',
                          borderRadius: 8,
                          border: `1px solid ${isSelected ? '#38bdf8' : '#333'}`,
                          background: isSelected ? '#082f49' : '#181b26',
                          color: RARITY_COLORS[base.rarity],
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: 12,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>{formatEnhancedName(base.name, it.enhanceLv)}</span>
                          {relicDef && (
                            <span data-testid={`item-relic-badge-${it.instanceId}`} style={{ fontSize: 13 }}>
                              {relicDef.emoji}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 10, color: '#666' }}>
                          {base.slot} · {relicDef ? relicDef.nameKR : '소켓 비어있음'}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {selectedItem && selectedBase && (
                <div style={{ background: '#1e2230', borderRadius: 8, padding: 16, border: '1px solid #2e3440' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <strong style={{ fontSize: 16, color: RARITY_COLORS[selectedBase.rarity] }}>
                        {formatEnhancedName(selectedBase.name, selectedItem.enhanceLv)}
                      </strong>
                      <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>({selectedBase.slot})</span>
                    </div>
                    <div>
                      {selectedItem.celestialRelic ? (
                        <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 'bold' }}>
                          장착: {CELESTIAL_RELICS[selectedItem.celestialRelic]?.emoji}{' '}
                          {CELESTIAL_RELICS[selectedItem.celestialRelic]?.nameKR}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: '#64748b' }}>[소켓 비어있음]</span>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>장착할 천상 성유물 선택:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                    {ALL_CELESTIAL_RELICS.map(r => {
                      const rDef = CELESTIAL_RELICS[r];
                      const isSelected = selectedRelic === r;
                      return (
                        <button
                          key={r}
                          data-testid={`relic-btn-${r}`}
                          onClick={() => setSelectedRelic(r)}
                          style={{
                            padding: 10,
                            borderRadius: 6,
                            border: `1px solid ${isSelected ? rDef.color : '#334155'}`,
                            background: isSelected ? '#1e293b' : '#151822',
                            color: rDef.color,
                            textAlign: 'left',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 2 }}>
                            {rDef.emoji} {rDef.nameKR}
                          </div>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2 }}>
                            {rDef.constellation}
                          </div>
                          <div style={{ fontSize: 11, color: '#fbbf24' }}>
                            ✨ {rDef.costShards}개 + 💰 {rDef.costGold.toLocaleString()}G
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {(() => {
                    const rDef = CELESTIAL_RELICS[selectedRelic];
                    const slotType = selectedBase.slot as RelicSlotType;
                    const bonus = getRelicBonusesForSlot(selectedRelic, slotType);
                    const canAfford = canSocketRelic(
                      selectedItem,
                      selectedRelic,
                      meta.starlightShards ?? 0,
                      run.goldThisRun,
                    );
                    const isAlreadySocketed = selectedItem.celestialRelic === selectedRelic;
                    const canUnsocket = canUnsocketRelic(selectedItem, meta.starlightShards ?? 0);

                    return (
                      <div>
                        <div style={{ background: '#151822', padding: 10, borderRadius: 6, marginBottom: 14, fontSize: 12 }}>
                          <div style={{ color: rDef.color, fontWeight: 'bold', marginBottom: 4 }}>
                            {rDef.emoji} {rDef.nameKR} ({rDef.hanja}) — {selectedBase.slot} 장착 효과:
                          </div>
                          <div style={{ color: '#ccc', marginBottom: 6 }}>{rDef.description}</div>
                          <div style={{ color: '#38bdf8', fontWeight: 'bold', marginBottom: 4 }}>
                            스탯 부여:
                            {bonus.atkPercent && ` 공격력 +${bonus.atkPercent}%`}
                            {bonus.hpPercent && ` 체력 +${bonus.hpPercent}%`}
                            {bonus.defPercent && ` 방어력 +${bonus.defPercent}%`}
                            {bonus.spdFlat && ` 행동속도 +${bonus.spdFlat}`}
                            {bonus.critRate && ` 치명타율 +${(bonus.critRate * 100).toFixed(0)}%`}
                            {bonus.critDmg && ` 치명타 피해 +${(bonus.critDmg * 100).toFixed(0)}%`}
                            {bonus.damageReduction && ` 피해 감소 +${(bonus.damageReduction * 100).toFixed(1)}%`}
                            {bonus.elementalDmgPercent && ` 속성 공명 피해 +${bonus.elementalDmgPercent}%`}
                            {bonus.goldBoost && ` 골드 획득 +${(bonus.goldBoost * 100).toFixed(0)}%`}
                            {bonus.expBoost && ` 경험치 획득 +${(bonus.expBoost * 100).toFixed(0)}%`}
                          </div>
                          <div style={{ color: '#fbbf24' }}>
                            소모: ✨ 별빛 파편 {rDef.costShards}개 + 💰 {rDef.costGold.toLocaleString()}G
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            data-testid="socket-relic-btn"
                            disabled={isAlreadySocketed || !canAfford}
                            onClick={handleSocketRelic}
                            style={{
                              flex: 2,
                              padding: '12px 0',
                              borderRadius: 8,
                              border: 'none',
                              background: isAlreadySocketed ? '#334155' : canAfford ? '#0284c7' : '#1e293b',
                              color: isAlreadySocketed ? '#94a3b8' : canAfford ? '#fff' : '#64748b',
                              fontWeight: 'bold',
                              fontSize: 14,
                              cursor: isAlreadySocketed ? 'default' : canAfford ? 'pointer' : 'not-allowed',
                            }}
                          >
                            {isAlreadySocketed
                              ? '✓ 이미 장착됨'
                              : !canAfford
                              ? '비용 부족 (파편 또는 골드)'
                              : '소켓 각인 장착'}
                          </button>

                          {selectedItem.celestialRelic && (
                            <button
                              data-testid="unsocket-relic-btn"
                              disabled={!canUnsocket}
                              onClick={handleUnsocketRelic}
                              style={{
                                flex: 1,
                                padding: '12px 0',
                                borderRadius: 8,
                                border: '1px solid #e11d48',
                                background: canUnsocket ? '#9f1239' : '#4c0519',
                                color: canUnsocket ? '#ffe4e6' : '#fda4af',
                                fontWeight: 'bold',
                                fontSize: 13,
                                cursor: canUnsocket ? 'pointer' : 'not-allowed',
                              }}
                            >
                              추출 해제 (✨ 10개)
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
