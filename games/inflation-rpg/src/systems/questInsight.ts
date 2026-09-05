/**
 * C1018 — Quest Insight System
 * Provides contextual hints and location recommendations for quests
 * when the 'quest_insight' JP perk is active.
 */

import type { Quest } from '../types';
import { DUNGEONS } from '../data/dungeons';
import { EQUIPMENT_BASES } from '../data/equipment';

/** Returns Korean name of recommended dungeon/region for the quest */
export function getQuestLocationHint(quest: Quest): string {
  // 1. Check if target monster is found in a specific dungeon
  if (quest.target.monsterId) {
    const d = DUNGEONS.find(d => d.monsterPool.includes(quest.target.monsterId!));
    if (d) return `${d.nameKR} 던전`;
  }

  // 2. Check if target boss is in a dungeon
  if (quest.target.bossId) {
    const d = DUNGEONS.find(d =>
      d.bossIds.mini === quest.target.bossId ||
      d.bossIds.major === quest.target.bossId ||
      d.bossIds.sub.includes(quest.target.bossId!) ||
      d.bossIds.final === quest.target.bossId
    );
    if (d) return `${d.nameKR} 던전`;
  }

  // 3. Check if target equipment drops in an area
  if (quest.target.equipmentId) {
    const equip = EQUIPMENT_BASES.find(e => e.id === quest.target.equipmentId);
    if (equip && equip.dropAreaIds.length > 0) {
      return `${equip.dropAreaIds[0]} 구역`;
    }
  }

  // Fallback to regionId from quest
  const regionDungeon = DUNGEONS.find(d => d.id === quest.regionId);
  return regionDungeon ? `${regionDungeon.nameKR} 지역` : quest.regionId;
}

/** Returns true if quest is at least 75% complete but not yet finished */
export function isQuestNearCompletion(quest: Quest, progress: number): boolean {
  if (progress <= 0 || progress >= quest.target.count) return false;
  return progress / quest.target.count >= 0.75;
}

/**
 * Generates an informative hint string for a quest given current progress.
 */
export function getQuestInsightHint(quest: Quest, progress: number): string {
  const remaining = Math.max(0, quest.target.count - progress);
  const location = getQuestLocationHint(quest);
  const nearDone = isQuestNearCompletion(quest, progress);

  let detail = '';
  switch (quest.type) {
    case 'kill_count':
      detail = `${location}에서 사냥 추천 (남은 수: ${remaining}마리)`;
      break;
    case 'boss_defeat':
      detail = `${location} 심층부 보스 도전 필요 (남은 수: ${remaining}회)`;
      break;
    case 'item_collect':
      detail = `${location} 탐험 또는 전리품 상자 확인 (필요: ${remaining}개)`;
      break;
    case 'run_stat':
      detail = `단일 사이클 동안 목표 달성 필요 (남은 수: ${remaining})`;
      break;
    default:
      detail = `${location}에서 목표 달성 필요 (남은 수: ${remaining})`;
  }

  if (nearDone) {
    return `🎯 [완료 임박] ${detail}`;
  }
  if (progress === 0) {
    return `💡 [추천] ${detail}`;
  }
  return `🔍 [진행 중] ${detail}`;
}
