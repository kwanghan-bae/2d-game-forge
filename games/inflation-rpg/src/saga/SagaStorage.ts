import { useGameStore } from '../store/gameStore';
import type { CycleSaga } from './SagaTypes';

const SAGA_CAP = 100;

export class SagaStorage {
  static append(saga: CycleSaga): void {
    const current = useGameStore.getState().meta.sagaHistory ?? [];
    const next = [...current, saga];
    const capped = next.length > SAGA_CAP ? next.slice(next.length - SAGA_CAP) : next;
    useGameStore.setState(s => ({ ...s, meta: { ...s.meta, sagaHistory: capped } }));
  }

  static getAll(): readonly CycleSaga[] {
    return useGameStore.getState().meta.sagaHistory ?? [];
  }
}
