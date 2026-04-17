// src/game/core/signals.ts
import { signal, computed, effect } from "@preact/signals-react";

export const createAppSignal = <T>(initialValue: T) => signal<T>(initialValue);
export { computed, effect };
