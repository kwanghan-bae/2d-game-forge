# Cycle 1128 Planner: Primordial Ascension Mastery Sprint (C1129 ~ C1134)

## 1. Context & Strategic Direction
With the Cosmic Abyssal Corridor successfully conquered across all 5 sectors (up to the 2 Billion HP Doomsday Singularity Overlord in C1123~C1126), and the underlying Primordial Ascension Engine engineered in C1127, the next strategic phase brings the player face-to-face with the **Primordial Constellations (태초의 4대 성좌)** interactive UI, balance tuning, narrative inscriptions, and combat integration.

---

## 2. Sprint Roadmap: C1129 ~ C1134

### C1129 [ui]: Primordial Ascension UI & Hub Integration
- **Objective**: Build [`PrimordialAscensionModal.tsx`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/components/PrimordialAscensionModal.tsx) showcasing the 4 Primordial Nodes (`primordial_genesis`, `primordial_annihilation`, `primordial_eternity`, `primordial_singularity`).
- **Integration**: Wire `open-primordial-modal-btn` into [`AscensionTrialsModal.tsx`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/components/AscensionTrialsModal.tsx).
- **Verification**: `PrimordialAscensionModal.test.tsx` verifying node upgrade, resource deduction, and locked state handling.

### C1130 [balance]: Primordial Ascension Balance & Stat Multiplier Simulation
- **Objective**: Implement [`primordialAscensionBalance.test.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/systems/primordialAscensionBalance.test.ts).
- **Verification**: Simulate full Rank 5/5/5/3 build, proving +50% HP, +25% Final DMG, +500 Level Cap, +60% Pierce, +40% Affinity, +15% DR, +30% DEF-to-ATK conversion, and 3 turns barrier.

### C1131 [narrative]: Primordial Constellation Hymns & Genesis Chronicles
- **Objective**: Author [`primordialAscensionLore.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/data/primordialAscensionLore.ts) & tests in [`primordialAscensionLore.test.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/data/__tests__/primordialAscensionLore.test.ts).
- **Immersion**: Genesis Inscriptions (`太初創生`), Annihilation Decrees (`太初滅却`), Eternity Hymns (`太初永劫`), and Singularity Coronation (`太初特異點`).

### C1132 [system]: Primordial Resonance Harmonizer & Hero Combat Phase Integration
- **Objective**: Engineer [`primordialResonance.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/systems/primordialResonance.ts) applying primordial bonuses dynamically into Hero battle calculations.
- **Verification**: `primordialResonance.test.ts` verifying stat injection and battle start barrier application.

### C1133 [ui]: Primordial Constellation HUD Badge & Active Resonance Indicator
- **Objective**: Build [`PrimordialConstellationBadge.tsx`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/components/PrimordialConstellationBadge.tsx) displaying awakened primordial ranks and active perks.
- **Verification**: `PrimordialConstellationBadge.test.tsx`.

### C1134 [critic+collab]: Primordial Ascension Sprint Retrospective & Architecture Review
- **Objective**: Run full test suite across all 352+ test files, 3,050+ tests.
- **Deliverables**: Issue `cycle-1134-critic.md`, `cycle-1134-planner.md`, and update `RESUME.md` to v27.
