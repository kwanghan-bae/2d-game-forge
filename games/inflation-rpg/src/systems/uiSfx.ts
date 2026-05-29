/**
 * UI SFX helpers — context-specific sound feedback beyond generic click.
 */
import { playSfx } from './sound';

export type UiSfxEvent = 'navigate' | 'purchase' | 'equip' | 'error' | 'confirm';

const PITCH_MAP: Record<UiSfxEvent, { id: string; rate: number }> = {
  navigate: { id: 'click', rate: 1.1 },
  purchase: { id: 'gold', rate: 1.0 },
  equip: { id: 'equip', rate: 1.0 },
  error: { id: 'click', rate: 0.6 },
  confirm: { id: 'click', rate: 1.3 },
};

export function playUiSfx(event: UiSfxEvent): void {
  const { id, rate } = PITCH_MAP[event];
  playSfx(id, rate);
}
