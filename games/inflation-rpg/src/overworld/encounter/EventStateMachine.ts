/**
 * C778: EventStateMachine — generic pending→resolve state management.
 * Extracts the repeated pattern of 6 event pending booleans from EncounterEngine.
 * Each event has: pending flag, getPending(), trigger(), resolve(accept).
 * Side-effects on accept/decline are provided via callbacks at registration time.
 */

export interface EventHandlers {
  onAccept: () => void;
  onDecline: () => void;
}

export class EventStateMachine {
  private readonly pending = new Map<string, boolean>();
  private readonly handlers = new Map<string, EventHandlers>();

  register(eventId: string, handlers: EventHandlers): void {
    this.pending.set(eventId, false);
    this.handlers.set(eventId, handlers);
  }

  trigger(eventId: string): void {
    if (this.pending.has(eventId)) {
      this.pending.set(eventId, true);
    }
  }

  getPending(eventId: string): boolean {
    return this.pending.get(eventId) ?? false;
  }

  resolve(eventId: string, accept: boolean): void {
    if (!this.getPending(eventId)) return;
    this.pending.set(eventId, false);
    const h = this.handlers.get(eventId);
    if (h) {
      if (accept) h.onAccept();
      else h.onDecline();
    }
  }

  /** Returns all event IDs that are currently pending. */
  getAllPending(): string[] {
    const result: string[] = [];
    for (const [id, isPending] of this.pending) {
      if (isPending) result.push(id);
    }
    return result;
  }
}
