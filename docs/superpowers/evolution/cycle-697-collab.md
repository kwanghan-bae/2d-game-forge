# Cycle 697 — Collaboration Record

## Critic (Fun 5/10, +0.5 from C693)

핵심 진단: "주방까지 가스관은 깔았는데 밸브를 안 열었다"
- Merchant/Gambler/Altar 선택이 dead-end — triggerX()는 호출되나 resolveX() 호출 코드 부재
- ExpCalculator breakdown 생산만 되고 소비되지 않음 (UI 미연결)
- 밸런스 튜닝 검증 불가 (resolve 없어 효과 0)

강점:
- PostCombatEventResolver 순수 함수 설계 우수
- EventChoiceEngine state machine 패턴 확장 가능
- 7-category EXP breakdown 연결만 하면 즉시 가치

## Planner (C698-C700)

| Cycle | Layer | Task |
|-------|-------|------|
| C698 | system | Wire resolve effects (Merchant BUY→relic, Gambler BET→gold±, Altar SACRIFICE→buff+HP cost) |
| C699 | structure | DefenseCalc 순수 함수 추출 (EncounterEngine -35 lines) |
| C700 | UI/UX | ExpBreakdownBadge + EventChoiceToast (HUD feedback) |

예상: +20 tests, EncounterEngine -6 lines net

## Level-Designer

분석 결과:
- Gambler 5.4회/run (적절). resolve 시 EV=+25%/encounter → gold inflation 우려
- Cursed Altar 2.0×10: P0-P5 여전히 SACRIFICE=즉사 (false choice)
- Trap 0.15: 7회에 즉사, 실전에서는 추가 압박 역할 (적절)

C699 밸런스 제안:
1. GAMBLER_WIN_RATE 0.50→0.45 (EV 중립화: +17.5% per encounter)
2. CURSED_ALTAR_HP_THRESHOLD 0.70 추가 (hero HP 70% 미만 시 SACRIFICE grayout)

## 합의 사항

1. C698 최우선: resolve round-trip 완성 (critic/planner 일치)
2. C699: DefenseCalc 추출 (planner) + resolve 후 밸런스 조정은 C703으로 미룸
3. C700: EXP badge + event toast (critic "소비되지 않음" 해결)
4. Level-designer 제안 (WIN_RATE 0.45, HP threshold)은 resolve wiring 후 검증 가능 → C703 balance에서 적용
