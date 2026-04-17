# @forge/game-inflation-rpg

First game in the forge. Port of korea-inflation-rpg.

## Platforms

- Web (via dev-shell portal or standalone Next export)
- iOS / Android via Capacitor 8

## Notable scripts

- `pnpm --filter @forge/game-inflation-rpg dev` — standalone Next dev server on :3100.
  For portal-integrated dev, run `pnpm dev` at repo root and visit
  http://localhost:3000/games/inflation-rpg instead.
- `pnpm --filter @forge/game-inflation-rpg build:web` — static export to `out/`.
- `pnpm --filter @forge/game-inflation-rpg build:ios` — Next build + Capacitor sync + open Xcode.
- `pnpm --filter @forge/game-inflation-rpg build:android` — same for Android Studio.

## Public exports

- `StartGame(config: StartGameConfig): Phaser.Game` — the one entry. Used by
  both the dev-shell's `/games/inflation-rpg` route and the game's own
  release-mode React wrapper.
- `gameManifest: GameManifestValue` — manifest consumed by the dev-shell
  registry.

## Dependencies

This package depends only on external runtime deps (phaser, react, etc.).
It does not yet import from `@forge/core` — the `StartGameConfig` type is
local. When a second game lands, we will promote shared pieces (e.g.
SaveManager, EventBus, i18n) to `@forge/core` per the rule of three.
