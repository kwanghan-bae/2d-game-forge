import type { VillageCurrencyKey, VillageSaveEnvelope } from '../../types';
import { MAX_ECONOMY_VALUE, isValidCurrencyBalance } from './guards';

export function safeScaledEconomyAmount(value: number | undefined, multiplier: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || multiplier <= 0) return 0;
  const scaled = value * multiplier;
  return Number.isFinite(scaled)
    ? Math.min(MAX_ECONOMY_VALUE, Math.max(0, Math.floor(scaled)))
    : MAX_ECONOMY_VALUE;
}

export function canPay(save: VillageSaveEnvelope, input: Partial<Record<VillageCurrencyKey, number>>): boolean {
  return Object.entries(input).every(([key, value]) => {
    const balance = save.meta.currencies[key as VillageCurrencyKey];
    return isValidCurrencyBalance(balance)
      && isValidCurrencyBalance(value)
      && balance >= value;
  });
}

export function canApplyCurrencyOutput(
  save: VillageSaveEnvelope,
  output: Partial<Record<VillageCurrencyKey, number>>,
): boolean {
  return Object.entries(output).every(([key, value]) => {
    if (!Object.prototype.hasOwnProperty.call(save.meta.currencies, key)
      || typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return true;
    return isValidCurrencyBalance(save.meta.currencies[key as VillageCurrencyKey]);
  });
}

export function pay(save: VillageSaveEnvelope, input: Partial<Record<VillageCurrencyKey, number>>): void {
  for (const [key, value] of Object.entries(input)) {
    const currency = key as VillageCurrencyKey;
    save.meta.currencies[currency] -= value ?? 0;
  }
}

export function give(save: VillageSaveEnvelope, output: Partial<Record<VillageCurrencyKey, number>>, multiplier = 1): void {
  for (const [key, value] of Object.entries(output)) {
    const currency = key as VillageCurrencyKey;
    if (!Object.prototype.hasOwnProperty.call(save.meta.currencies, currency)
      || !Number.isFinite(value) || !Number.isFinite(multiplier) || value <= 0 || multiplier <= 0) continue;
    const amount = Math.floor(value * multiplier);
    const current = save.meta.currencies[currency];
    if (!Number.isFinite(amount) || !Number.isFinite(current) || current < 0
      || current > MAX_ECONOMY_VALUE) continue;
    const boundedAmount = Math.min(MAX_ECONOMY_VALUE, amount);
    save.meta.currencies[currency] = Math.min(MAX_ECONOMY_VALUE, current + boundedAmount);
  }
}
