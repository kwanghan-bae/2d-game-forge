# Cycle 974-976 PRD — Veteran's Challenge "Real Risk" 3-Phase Plan

## C974: VC HP Drain Wire-up (system)
- `VETERANS_CHALLENGE_HP_DRAIN = 0.03` → EncounterEngine fight loop에 wire-up
- vc_atk active 동안 매 전투 3% maxHP 소모
- 6 fights × 3% = 18% maxHP 누적 → 실제 사망 위험 부여

## C975: Consecutive Decline Escalation (structure)
- getConsecutiveDeclines() >= 2 → 다음 VC EXP_MUL 감쇠 (1.80 × 0.85^(n-1))
- 최소 floor = 1.20
- accept 시 즉시 리셋

## C976: VC Duration Extension 6→10 (balance)
- HP drain 누적 30% maxHP (10 × 3%)
- 더 긴 긴장 구간 → "짧아서 의미 없다" 피드백 해소

## 종합 효과
| Before | After |
|--------|-------|
| net 1.08 (always accept) | HP 상태 의존 (accept = 위험) |
| decline cost 0 | EXP_MUL 감쇠 |
| 6 fights (안 느껴짐) | 10 fights (긴장) |
