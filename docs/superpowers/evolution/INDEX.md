# Autonomous Evolution Cycle Index

8-페르소나 자율진화 루프의 cycle 별 한 줄 요약. spec: `../specs/2026-05-24-autonomous-evolution-design.md`. plan: `../plans/2026-05-24-autonomous-evolution.md`.

## Cycle log

- Cycle 1 (2026-05-24, `bd3ff10`): Variance + Realm Tone + NPC Saga 회수. 약점: build saturation / realm 톤 부재 / NPC dead path. 곡선: skillsLearned p50 21→9, maxShare mage 0.46→priest 0.40, cyclesWithNpc 0→2. Yellow flag: 3 PRD recalibrations.
- Cycle 2 partial (2026-05-24, `be1b8f7`): F1 multi-seed + Δ-from-baseline 룰 persona doc 패치. F2/F3 는 cycle 3 (C1/C2) carry-over. Soft-halt 자원 추정 trigger — 사용자 confirm 대기.
- Cycle 3 partial (2026-05-24, `6135a9a`): F1 이중 괄호 prefix bug fix (cycle 1 F2 regression). multi-seed 룰 첫 적용 — single-seed 0.40 outlier 가 multi-seed 0.453 (priest saturator confirmed). D1-D7 cycle 4 carry-over.
