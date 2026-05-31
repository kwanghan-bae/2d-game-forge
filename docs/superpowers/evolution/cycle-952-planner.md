# Cycle 952 Planner — C953-C958 Roadmap

## Focus: Mid-Game Decision Density + EE Decomposition

### Baseline
- EE: 2720 LOC, 21 manual *Remaining fields
- BuffCatalog: 59 entries
- MidGameEventResolver: auto-resolve only

### Roadmap
- C953: Wandering Alchemist decision event (200-400)
- C954: Shield field migration ×5
- C955: Mid-game density invariant + tuning
- C956: Shadow Broker decision event (300-500)
- C957: Event field migration ×5
- C958: Diversity invariant + LOC gate

### Key Insight
- Mid-game (200-500) decision density is the biggest dropout zone
- New choice events should fit "idle hero sim" identity
- Duration migrations have timing constraints (tick order matters)
