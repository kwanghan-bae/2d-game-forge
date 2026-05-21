import type { LandmarkType, LandmarkKind } from '../data/landmarks';

export interface PlacedLandmark {
  instanceId: string;
  type: LandmarkType;
  gridX: number;
  gridY: number;
  consumed: boolean; // enemies/bosses become consumed after defeat
}

export function landmarkToCandidate(l: PlacedLandmark): { id: string; kind: LandmarkKind; difficulty: number } {
  // V1a: all enemies difficulty 1, bosses 3. Real difficulty in later phase.
  const difficulty = l.type.kind === 'boss' ? 3 : 1;
  return { id: l.instanceId, kind: l.type.kind, difficulty };
}
