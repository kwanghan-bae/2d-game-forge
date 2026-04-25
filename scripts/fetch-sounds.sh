#!/usr/bin/env bash
# Fetch CC0 audio assets for inflation-rpg.
# Sources: Kenney.nl (SFX), OpenGameArt.org (BGM)
# License: CC0 1.0 Universal (public domain).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SFX_DIR="$ROOT/games/inflation-rpg/public/sounds/sfx"
BGM_DIR="$ROOT/games/inflation-rpg/public/sounds/bgm"

mkdir -p "$SFX_DIR" "$BGM_DIR"

echo "==> 사운드 자산 디렉토리 준비 완료."
echo
echo "수동 다운로드 안내:"
echo "  1. Kenney UI Audio:     https://kenney.nl/assets/ui-audio       → sfx/click,equip,coin,quest-complete,craft.ogg"
echo "  2. Kenney Impact Sounds: https://kenney.nl/assets/impact-sounds  → sfx/hit,crit.ogg"
echo "  3. Kenney RPG Audio:     https://kenney.nl/assets/rpg-audio      → sfx/skill,heal,levelup,boss-victory,defeat.ogg"
echo "  4. OpenGameArt CC0 BGM: https://opengameart.org/content/cc0-sound-effects → bgm/lobby,field,battle.ogg"
echo
echo "각 zip 다운로드 후 압축 해제하여 위 경로로 .ogg 파일 복사 + 이름 변경."
echo
echo "전체 라이선스: CC0 1.0 Universal (퍼블릭 도메인). attribution 의무 없음."
echo
echo "파일 누락 시: SoundManager 가 silent fallback. 게임 정상 작동."
