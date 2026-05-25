import type { LandmarkKind } from '../data/landmarks';
import type { OverworldEvent } from './OverworldEvents';

export type LightSource = 'kill' | 'boss_kill' | 'drop' | 'level_up' | 'shrine' | 'skill_learned' | 'job_unlocked';

export interface LightBreakdownEntry {
  source: LightSource;
  amount: number;
}

export interface LightDeltaResult {
  delta: number;
  breakdown: LightBreakdownEntry[];
}

/** Spec §5.1 — controller events → light emit. Pure (no store / no buff rate).
 *  Buff #3 (light_rate) 는 호출자가 별도 곱한다.
 *
 *  Excluded events:
 *  - moral_choice (personality drift, not positive)
 *  - chapter_transition (cinematic, not earned)
 *  - hero_died, tick, arrived_at, battle_started, cycle_ended (system events)
 *  - fate_roll_required, fate_roll_resolved (cycle 108 F1 — decision channel,
 *    not earned light. emit 0 by design.)
 *  - boss_intro_offered, boss_intro_resolved, boss_intro_skipped (cycle 109 F1
 *    — decision channel, not earned light. emit 0 by design.)
 *  - realm_fork_offered, realm_fork_resolved, realm_fork_skipped (cycle 110 F1
 *    — decision channel, not earned light. emit 0 by design.)
 */
export function computeLightDelta(evs: readonly OverworldEvent[], kind: LandmarkKind): LightDeltaResult {
  let delta = 0;
  const breakdown: LightBreakdownEntry[] = [];

  for (const ev of evs) {
    if (ev.type === 'battle_won') {
      const isBoss = kind === 'boss';
      const killAmt = isBoss ? 10 : 1;
      delta += killAmt;
      breakdown.push({ source: isBoss ? 'boss_kill' : 'kill', amount: killAmt });
      if (ev.dropId) {
        delta += 0.5;
        breakdown.push({ source: 'drop', amount: 0.5 });
      }
    } else if (ev.type === 'level_up') {
      delta += 0.5;
      breakdown.push({ source: 'level_up', amount: 0.5 });
    } else if (ev.type === 'shrine_visited') {
      delta += 1;
      breakdown.push({ source: 'shrine', amount: 1 });
    } else if (ev.type === 'skill_learned') {
      delta += 1;
      breakdown.push({ source: 'skill_learned', amount: 1 });
    } else if (ev.type === 'job_unlocked') {
      delta += 1;
      breakdown.push({ source: 'job_unlocked', amount: 1 });
    }
    // 외 모든 type 은 emit 안 함 (spec §4.1 excluded list)
  }

  return { delta, breakdown };
}
