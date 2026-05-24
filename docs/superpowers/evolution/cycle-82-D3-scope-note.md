# Cycle 82 — D3 NPC First/Recurring Scope Note

## 한 줄
D3 NPC first-vs-recurring filter 는 NPC system 의 type 변경 + 신규 catalog 필요 → 중간 scope. cycle 91+ 의 더 큰 fold candidate.

## Current NPC system
- 3 kind: mentor / rival / passerby
- 4 type narrative: encounter / death / family event
- spawn: hero age milestone 의존

## D3 scope
- NPC.id 기반 first-vs-recurring tracking (store 변경)
- kind 별 recurring variant 추가 (예: recurring_rival)
- forNpcEncounter signature update (recurring 분기 받음)

## 자원 추정
- Type 변경: HeroSnapshot 또는 store.run.npcs 의 first-seen tracking
- Variant catalog: 3 kind × 2 (first/recurring) = 6 variant set 필요
- Unit test: 3+ 신규

## Plan
- Cycle 91+ 의 small batch 로 진행 (또는 cycle 100 후 carry-over)
