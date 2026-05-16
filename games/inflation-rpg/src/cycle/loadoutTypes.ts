// Shared loadout shape. Extracted from AutoBattleController to avoid a
// circular dependency: cycle/traits.ts → AutoBattleController.ts → cycle/traits.ts.
// Both AutoBattleController and traits.ts import from here instead.

export interface ControllerLoadout {
  characterId: string;
  bpMax: number;
  heroHpMax: number;
  heroAtkBase: number;
  // Later phases extend: equipped / ascension / relics / mythics / traits / unlockedSkills
}
