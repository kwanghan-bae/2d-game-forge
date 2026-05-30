const EVENT_LABELS: Record<string, string> = {
  event_merchant_buy: '🛒 상인: 유물 구매!',
  event_merchant_sell: '🛒 상인: 유물 매각',
  event_merchant_ignore: '🛒 상인: 무시',
  event_gambler_win: '🎰 도박: 승리! 골드 2배!',
  event_gambler_lose_high: '🎰 도박: 대패... 골드 80% 손실',
  event_gambler_lose_low: '🎰 도박: 소패... 골드 25% 손실',
  event_gambler_walk: '🎰 도박: 포기',
  event_altar_sacrifice: '🗿 제단: 희생! ATK 버프 발동',
  event_altar_pray: '🗿 제단: 기도 (HP 회복)',
  event_altar_leave: '🗿 제단: 외면',
};

export function getEventToastLabel(eventType: string): string | null {
  return EVENT_LABELS[eventType] ?? null;
}
