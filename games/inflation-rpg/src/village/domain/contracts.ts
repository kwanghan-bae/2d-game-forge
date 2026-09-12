import type {
  FacilityId,
  FacilityTask,
  InterventionType,
  RejuvenationResult,
  SupportAgentId,
  VillageCurrencyKey,
  VillageSaveEnvelope,
} from '../types';

export type DomainResult<T extends VillageSaveEnvelope = VillageSaveEnvelope> =
  | { ok: true; save: T; task: FacilityTask }
  | { ok: false; save: VillageSaveEnvelope; error: string };

export type HeroDomainResult =
  | { ok: true; save: VillageSaveEnvelope; result: RejuvenationResult }
  | { ok: false; save: VillageSaveEnvelope; error: string };

export type AgentDomainResult =
  | { ok: true; save: VillageSaveEnvelope }
  | { ok: false; save: VillageSaveEnvelope; error: string };

export type InterventionDomainResult =
  | { ok: true; save: VillageSaveEnvelope; intervention: InterventionType }
  | { ok: false; save: VillageSaveEnvelope; error: string };

export interface FacilityTaskPreview {
  facilityId: FacilityId;
  durationSeconds: number;
  input: Partial<Record<VillageCurrencyKey, number>>;
  output: Partial<Record<VillageCurrencyKey, number>>;
  outputEquipmentIds: string[];
  heroExpGain: number;
  assignedAgentId: SupportAgentId | null;
  canStart: boolean;
  error: string | null;
}

export type FacilityUpgradeCost = { gold: number; materials: number };

export { Village_MAX_INTERVENTION_CHARGES as MAX_INTERVENTION_CHARGES } from '../types';
export const AGENT_REST_RECOVERY = 25;
