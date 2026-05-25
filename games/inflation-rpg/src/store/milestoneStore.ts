/**
 * Cycle 106 F2 — InflationMilestoneVFX 의 FIFO queue store.
 *
 * 독립적인 zustand store (gameStore 와 분리) — persist 없음.
 * milestone 큐가 persist 에 흘러가지 않게 하기 위함 (PRD §R1 자동 blacklist).
 *
 * F1 의 OverworldEvent inflation_milestone 을 OverworldRunner 가 consume →
 * pushMilestone() → InflationMilestoneVFX 가 head 를 render → onDone 에서
 * dequeueMilestone() → 다음 head 자동 렌더.
 *
 * cycle 종료 시 OverworldRunner 가 clearMilestones() 호출 (R1 정합).
 */

import { create } from 'zustand';
import type { MilestoneTier } from '../data/milestones';

export interface MilestoneQueueItem {
  /** dedup + react key. Date.now() + random suffix 으로 unique 보장. */
  readonly id: string;
  readonly tier: MilestoneTier;
  readonly thresholdLv: number;
  readonly fromLv: number;
  readonly toLv: number;
  readonly atAge: number;
}

interface MilestoneStore {
  queue: readonly MilestoneQueueItem[];
  pushMilestone: (item: Omit<MilestoneQueueItem, 'id'>) => void;
  dequeueMilestone: () => void;
  clearMilestones: () => void;
}

let counter = 0;
function genId(): string {
  counter = (counter + 1) & 0xffffffff;
  return `m-${Date.now()}-${counter}`;
}

export const useMilestoneStore = create<MilestoneStore>((set) => ({
  queue: [],
  pushMilestone: (item) =>
    set((state) => ({
      queue: [...state.queue, { ...item, id: genId() }],
    })),
  dequeueMilestone: () =>
    set((state) => ({
      queue: state.queue.slice(1),
    })),
  clearMilestones: () => set({ queue: [] }),
}));
