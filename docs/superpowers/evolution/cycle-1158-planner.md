# Cycle 1158 Planner: Omniverse Regalia & Divine Armory Sprint (C1159 ~ C1164)

## 1. Context & Strategic Direction
With the **Eternal Pantheon of Transcendence** conquered and **Pantheon Crests (만신전 문장 / 萬神殿紋章)** flowing from 4-Titan victories, players hold the rarest currency in existence. The next evolution introduces the **Omniverse Regalia & Divine Armory (신격 보구 & 옴니버스 무기고 / 神格寶具 & 宇宙武庫)**: forging 4 divine artifacts representing the power of the 4 defeated Cosmic Titans.

---

## 2. Sprint Roadmap: C1159 ~ C1164

### C1159 [system]: Omniverse Regalia Catalog & Crest Forging Engine
- **Objective**: Engineer [`omniverseRegalia.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/systems/omniverseRegalia.ts) defining the 4 Divine Regalia:
  - `ouroboros_chrono_blade` (시공 방직신의 세검): True damage bypassing 30% enemy DEF.
  - `ymir_primordial_heart` (원초 거신의 심장): +100M HP & flat incoming damage barrier.
  - `nyx_void_eye` (허무 주재자의 진안): +25% Crit Rate & +100% Crit Damage.
  - `aion_singularity_aegis` (특이점의 성방패): Complete immunity to environmental debuffs & +20% all elemental resistance.
- **Verification**: `omniverseRegalia.test.ts`.

### C1160 [ui]: Divine Armory Modal & Interactive Forging UI
- **Objective**: Build [`OmniverseArmoryModal.tsx`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/components/OmniverseArmoryModal.tsx).
- **Features**: Real-time Pantheon Crest balance, 4 divine artifact cards, interactive forge buttons, and hub wiring into [`PantheonRaidModal.tsx`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/components/PantheonRaidModal.tsx) or [`AscensionTrialsModal.tsx`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/components/AscensionTrialsModal.tsx).
- **Verification**: `OmniverseArmoryModal.test.tsx`.

### C1161 [balance]: Crest Cost Curve & Regalia Stat Multiplier Balance Simulation
- **Objective**: Implement [`omniverseRegaliaBalance.test.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/systems/omniverseRegaliaBalance.test.ts).
- **Verification**: Simulate 20-crest total forging sink (4 clears to complete full set), validating DPS acceleration without breaking base combat loops.

### C1162 [narrative]: Ancient Forging Hymns of Hephaestus & Regalia Lore
- **Objective**: Author [`omniverseRegaliaLore.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/data/omniverseRegaliaLore.ts) & tests.
- **Immersion**: Divine blacksmith hymns, artifact creation myths, and Hall of Sagas regalia forging chronicles.

### C1163 [system]: Regalia Equipment Effects & Combat Integration
- **Objective**: Engineer [`omniverseRegaliaIntegration.ts`](file:///Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/src/systems/omniverseRegaliaIntegration.ts) wiring regalia equipping and combat passive checks directly into hero stat resolution.
- **Verification**: `omniverseRegaliaIntegration.test.ts`.

### C1164 [critic+collab]: Omniverse Regalia Sprint Retrospective & Architecture Review
- **Objective**: Run full test suite across all 377+ test files, 3,160+ tests.
- **Deliverables**: Issue `cycle-1164-critic.md`, `cycle-1164-planner.md`, and update `RESUME.md` to v32.
