const EVENT_LABELS: Record<string, string> = {
  event_merchant_buy: '🛒 상인: 유물 구매!',
  event_merchant_sell: '🛒 상인: 유물 매각',
  event_merchant_ignore: '🛒 상인: 무시',
  event_gambler_win: '🎰 도박: 승리! 골드 2배!',
  event_gambler_lose_high: '🎰 도박: 대패... 골드 60% 손실',
  event_gambler_lose_low: '🎰 도박: 소패... 골드 25% 손실',
  event_gambler_walk: '🎰 도박: 포기',
  event_altar_sacrifice: '🗿 제단: 희생! ATK 버프 발동',
  event_altar_pray: '🗿 제단: 기도 (HP 회복)',
  event_altar_leave: '🗿 제단: 외면',
  // C872: Mid-game event toasts
  event_wandering_merchant_heal: '🧳 방랑 상인: 치유!',
  event_wandering_merchant_atk: '🧳 방랑 상인: ATK 강화!',
  event_wandering_merchant_gamble_win: '🧳 방랑 상인: 도박 승리! ATK 2배!',
  event_wandering_merchant_gamble_lose: '🧳 방랑 상인: 도박 패배... 골드 손실',
  event_sparring_grounds_win: '⚔️ 수련장: 승리! EXP 획득!',
  event_sparring_grounds_lose: '⚔️ 수련장: 패배... HP 손실',
  event_proving_grounds_win: '🏟️ 시련의 장: 승리! EXP ×2 버프!',
  event_proving_grounds_lose: '🏟️ 시련의 장: 패배... HP 10% 손실',
  event_mercenary_offer_accept: '💰 용병: 골드 지불 → 방어막!',
  event_mercenary_offer_decline: '💰 용병: 거절',
  event_crossroads_atk: '🔀 갈림길: ATK 강화 선택!',
  event_crossroads_exp: '🔀 갈림길: EXP 부스트 선택!',
  event_crossroads_gold: '🔀 갈림길: 골드 폭발!',
  storm_drain: '⚡ 폭풍 소모: HP 감소',
  storm_drain_critical: '⚡💀 폭풍 위험! HP 급감!',
};

export function getEventToastLabel(eventType: string): string | null {
  return EVENT_LABELS[eventType] ?? null;
}

/** C872: Map structured OverworldEvent to toast key */
export function resolveEventToastKey(event: { type: string; [k: string]: unknown }): string | null {
  switch (event.type) {
    case 'event_wandering_merchant':
      return `event_wandering_merchant_${event.choice}`;
    case 'event_sparring_grounds':
      return `event_sparring_grounds_${event.won ? 'win' : 'lose'}`;
    case 'event_proving_grounds':
      return `event_proving_grounds_${event.won ? 'win' : 'lose'}`;
    case 'event_mercenary_offer':
      return `event_mercenary_offer_${event.choice}`;
    case 'event_crossroads':
      return `event_crossroads_${event.path}`;
    case 'storm_drain':
    case 'storm_drain_critical':
      return event.type;
    default:
      return event.type;
  }
}
