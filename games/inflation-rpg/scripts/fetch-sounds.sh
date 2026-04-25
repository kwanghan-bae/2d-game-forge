#!/usr/bin/env bash
# Fetch CC0 audio assets from iwenzhou/kenney mirror (Kenney.nl Asset Pack 1).
# License: CC0 1.0 Universal (public domain). No attribution required.
# Usage: from any cwd — paths resolve relative to this script's location.
set -euo pipefail

BASE="https://raw.githubusercontent.com/iwenzhou/kenney/master"
AUDIO_DIR="Audio%20(295%20files)"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SFX_DIR="$ROOT_DIR/public/sounds/sfx"
BGM_DIR="$ROOT_DIR/public/sounds/bgm"

mkdir -p "$SFX_DIR" "$BGM_DIR"

# id|relative_path_within_AUDIO_DIR (URL-encoded)
SFX_MAP=(
  "click|UI%20sounds%20(50%20sounds)/click1.ogg"
  "equip|UI%20sounds%20(50%20sounds)/switch7.ogg"
  "coin|RPG%20sounds%20(50%20sounds)/handleCoins.ogg"
  "hit|RPG%20sounds%20(50%20sounds)/knifeSlice.ogg"
  "crit|RPG%20sounds%20(50%20sounds)/chop.ogg"
  "skill|Digital%20sounds%20(60%20sounds)/laser5.ogg"
  "heal|Digital%20sounds%20(60%20sounds)/highUp.ogg"
  "levelup|Jingle%20sounds%20(85%20sounds)/jingles_HIT/jingles_HIT00.ogg"
  "quest-complete|Jingle%20sounds%20(85%20sounds)/jingles_NES/jingles_NES01.ogg"
  "craft|RPG%20sounds%20(50%20sounds)/metalLatch.ogg"
  "boss-victory|Jingle%20sounds%20(85%20sounds)/jingles_HIT/jingles_HIT09.ogg"
  "defeat|Digital%20sounds%20(60%20sounds)/lowDown.ogg"
)

BGM_MAP=(
  "lobby|Jingle%20sounds%20(85%20sounds)/jingles_NES/jingles_NES00.ogg"
  "field|Jingle%20sounds%20(85%20sounds)/jingles_NES/jingles_NES03.ogg"
  "battle|Jingle%20sounds%20(85%20sounds)/jingles_NES/jingles_NES10.ogg"
)

fetch_one() {
  local target="$1"
  local rel="$2"
  local url="$BASE/$AUDIO_DIR/$rel"
  printf '  %-20s <- %s\n' "$(basename "$target")" "$rel"
  curl -fsSL --retry 3 -o "$target" "$url"
}

echo "[fetch-sounds] SFX (${#SFX_MAP[@]} files) → $SFX_DIR"
for entry in "${SFX_MAP[@]}"; do
  IFS='|' read -r id rel <<< "$entry"
  fetch_one "$SFX_DIR/$id.ogg" "$rel"
done

echo
echo "[fetch-sounds] BGM (${#BGM_MAP[@]} files) → $BGM_DIR"
for entry in "${BGM_MAP[@]}"; do
  IFS='|' read -r id rel <<< "$entry"
  fetch_one "$BGM_DIR/$id.ogg" "$rel"
done

echo
echo "[fetch-sounds] Done."
