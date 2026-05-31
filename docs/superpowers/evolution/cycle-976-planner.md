# Cycle 977-979 PRD — VC Success Burst + Progress Emit + Balance Tuning

## C977 (system): VC Survival Burst
- VETERANS_CHALLENGE_SURVIVAL_BURST = 3.0 (level × 3 EXP on completing 10 fights)
- Detect buff expiry via hadVcAtk flag before tick
- Emit vc_survival_burst event

## C978 (structure): VC Progress Emit  
- Emit vc_progress each fight: {current, total, hpPercent}
- Enables future UI tension bar ("3/10... 7/10... 9/10!")
- Data layer only — visual render is future cycle

## C979 (balance): Decline Decay Softening
- Threshold 2→3, decay 0.85→0.90 (critic feedback: less punishing)
- Add vcDeclineCount field (future cross-run persistence prep)
- Keep general defensive-play pressure but reduce "invisible penalty" confusion
