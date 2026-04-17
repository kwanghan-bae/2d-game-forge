# @forge/core

Shared bootstrap layer for every 2d-game-forge game. In Phase 0 this package
exposes only the `GameManifest` schema. Additional utilities (EventBus,
SaveManager, i18n, Capacitor helpers, E2E hooks) are promoted from games on
demand per the "rule of three" — see the initial design spec.

## Public exports

- `GameManifest` (zod schema + inferred type): describes how the dev-shell
  loads a game.
