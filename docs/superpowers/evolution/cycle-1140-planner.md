# Cycle 1140 Planner: Chrono-Rift Warp & Singularity Rebirth Sprint (C1141 ~ C1146)

## 1. Context & Strategic Direction
With the Astral Archive milestone engine operating at peak efficiency across all 16 endgame challenges, the endgame loop is fully established. To make iterative cycle replayability blisteringly fast for veteran players, the next phase introduces the **Chrono-Rift Warp & Singularity Rebirth (시공 도약 & 특이점 환생 / 時空跳躍 & 特異點轉生)** system: allowing players with high Archive Mastery to reincarnate with starting level leaps (Level 100+), starting gold vaults, accelerated drop rates, and inherited Chrono Essence.

---

## 2. Sprint Roadmap: C1141 ~ C1146

### C1141 [system]: Chrono-Rift Warp & Singularity Rebirth Engine
- **Objective**: Engineer [`chronoRebirth.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/systems/chronoRebirth.ts) computing:
  - Rebirth qualification thresholds (e.g. Corridor Sector 5 clear or Archive Mastery Rank 10+)
  - Starting Level Leap (Lv 50 ~ Lv 200 based on Mastery)
  - Starting Gold Endowment (10M ~ 100M G)
  - Chrono Essence generation per rebirth
- **Verification**: `chronoRebirth.test.ts`.

### C1142 [ui]: Chrono-Rift Warp & Rebirth Modal UI
- **Objective**: Build [`ChronoRebirthModal.tsx`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/components/ChronoRebirthModal.tsx).
- **Features**: Rebirth perks breakdown, confirmation safety locks, and immediate cycle restart integration.
- **Verification**: `ChronoRebirthModal.test.tsx`.

### C1143 [balance]: Rebirth Cycle Pacing & TTK Acceleration Simulation
- **Objective**: Implement [`chronoRebirthBalance.test.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/systems/chronoRebirthBalance.test.ts).
- **Verification**: Simulate time-to-first-boss acceleration (from 15 min down to 30 sec) without destabilizing inflation curves.

### C1144 [narrative]: Reincarnation Inscriptions & Time Warp Chronicles
- **Objective**: Author [`chronoRebirthLore.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/data/chronoRebirthLore.ts) & tests.
- **Immersion**: Time Weaver hymns, Ouroboros cycles, and Hall of Sagas rebirth chronicles.

### C1145 [system]: Hero Lifecycle Spawner & Cycle Reset Integration
- **Objective**: Wire rebirth benefits directly into Hero Entity spawning and overworld reset cycle handlers.
- **Verification**: `chronoRebirthIntegration.test.ts`.

### C1146 [critic+collab]: Chrono Rebirth Sprint Retrospective & Architecture Review
- **Objective**: Run full test suite across all 362+ test files, 3,090+ tests.
- **Deliverables**: Issue `cycle-1146-critic.md`, `cycle-1146-planner.md`, and update `RESUME.md` to v29.
