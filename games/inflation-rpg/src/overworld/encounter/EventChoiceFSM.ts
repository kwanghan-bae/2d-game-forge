/**
 * C876: Event Choice State Machine — reusable 3-state FSM for timed player choices.
 * States: idle → presenting → resolved
 * Transitions: trigger() → presenting, resolve(choice) → resolved, reset() → idle
 * Timeout fallback: after timeoutMs, auto-resolves with default choice.
 */

export type EventChoiceFSMState = 'idle' | 'presenting' | 'resolved';

export interface EventChoiceFSMConfig {
  timeoutMs: number;
  defaultChoice: string;
}

export class EventChoiceFSM {
  private _state: EventChoiceFSMState = 'idle';
  private _choice: string | null = null;
  private _startTime = 0;
  private readonly config: EventChoiceFSMConfig;

  constructor(config: EventChoiceFSMConfig) {
    this.config = config;
  }

  get state(): EventChoiceFSMState { return this._state; }
  get choice(): string | null { return this._choice; }
  get elapsed(): number { return this._state === 'presenting' ? Date.now() - this._startTime : 0; }
  get remaining(): number { return Math.max(0, this.config.timeoutMs - this.elapsed); }
  get progress(): number { return this._state === 'presenting' ? this.remaining / this.config.timeoutMs : 0; }

  trigger(): void {
    if (this._state !== 'idle') return;
    this._state = 'presenting';
    this._choice = null;
    this._startTime = Date.now();
  }

  resolve(choice: string): void {
    if (this._state !== 'presenting') return;
    this._state = 'resolved';
    this._choice = choice;
  }

  /** Check timeout — call this in a render loop. Returns true if timed out. */
  checkTimeout(): boolean {
    if (this._state !== 'presenting') return false;
    if (Date.now() - this._startTime >= this.config.timeoutMs) {
      this.resolve(this.config.defaultChoice);
      return true;
    }
    return false;
  }

  reset(): void {
    this._state = 'idle';
    this._choice = null;
    this._startTime = 0;
  }
}
