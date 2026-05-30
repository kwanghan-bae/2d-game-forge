# Cycle 701 — Collaboration Record

## Critic (Fun 5/10, unchanged)

핵심 진단: "수도꼭지 손잡이 부재" — resolve wiring 완료했으나 AI default가 WALK_AWAY/LEAVE여서 도박/제단 효과 실질 미발동.
- Merchant auto-BUY만 작동 (600g→relic)
- Gambler default=WALK_AWAY → 효과 0
- Altar default=LEAVE → 효과 0
- 해결: strategy preset으로 AI 행동 변경 (always BET_HIGH, SACRIFICE when safe)

## Planner (C702-C704)

| Cycle | Layer | Task |
|-------|-------|------|
| C702 | balance | GAMBLER_WIN_RATE 0.45 + CURSED_ALTAR_HP_THRESHOLD gate |
| C703 | structure | WeatherSystem 순수 함수 추출 (-46 lines) |
| C704 | UI/UX | Wire ExpBreakdownBadge + EventChoiceToast into OverworldRunner |

## Level-Designer

분석:
- Gambler BET_HIGH: arithmetic EV +25%/bet, geometric EV 0 (median break-even). 5.4회/run.
- Merchant: effective rate ~1.5% (priority 최하위), 3-relic cap at fight ~120
- Altar SACRIFICE: EV-negative — ATK×1.5가 kill speed만 올려 loot 안 늘림, HP 20% + dmg×2.0 = death risk

C704 제안:
- CURSED_ALTAR_DAMAGE_MUL 2.0→1.5 (sacrifice를 marginal-positive로)
- CURSED_ALTAR_ATK_BUFF 1.5→1.8 (burst 가치 상향)
- Merchant priority 상향 (effective rate 복원)

## 합의 — 플래너 수정 반영

1. C702 [balance]: GAMBLER_WIN_RATE 0.45 + strategy preset에서 gambler/altar AI default 변경 (BET_LOW/SACRIFICE)
2. C703 [structure]: WeatherSystem 추출
3. C704 [balance]: CURSED_ALTAR_DAMAGE_MUL 1.5 + ATK_BUFF 1.8 + Merchant priority 상향

Note: planner의 C704 UI wire는 C705로 미룸 — critic의 "손잡이" 문제(AI default)가 UI보다 우선.
