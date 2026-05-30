import type { OverworldEvent } from '../overworld/OverworldEvents';

export interface StatDeltaEntry {
  stat: 'exp' | 'gold' | 'level' | 'hp' | 'crit' | 'damage';
  value: number;
  sign: '+' | '-';
  isCrit?: boolean;
}

export function computeStatDeltas(events: OverworldEvent[]): StatDeltaEntry[] {
  const deltas: StatDeltaEntry[] = [];

  for (const ev of events) {
    switch (ev.type) {
      case 'battle_won':
        deltas.push({ stat: 'exp', value: ev.expGain, sign: '+' });
        break;
      case 'level_up':
        deltas.push({ stat: 'level', value: ev.to, sign: '+' });
        break;
      case 'critical_hit':
        deltas.push({ stat: 'crit', value: ev.streak, sign: '+', isCrit: true });
        break;
      case 'boss_vault':
        deltas.push({ stat: 'gold', value: ev.gold, sign: '+' });
        break;
      case 'lucky_treasure':
        deltas.push({ stat: 'gold', value: ev.gold, sign: '+' });
        break;
      case 'hero_died':
        deltas.push({ stat: 'level', value: ev.oldLevel - ev.newLevel, sign: '-' });
        break;
      case 'close_call':
        deltas.push({ stat: 'hp', value: ev.healed, sign: '+' });
        break;
      // tick, arrived_at, etc. produce no visible delta
      default:
        break;
    }
  }

  return deltas;
}
