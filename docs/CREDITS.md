# CREDITS — 무료 에셋 출처 매니페스트

이 파일은 `2d-game-forge` 모노레포의 게임이 사용하는 외부 에셋의 출처와
라이선스 확인 상태를 기록한다. 확인되지 않은 라이선스를 CC0로 단정하지 않는다.

## `@forge/game-inflation-rpg`

### 오디오

`games/inflation-rpg/public/sounds/README.md`의 매니페스트를 기준으로 한다.

- `sounds/sfx/*`, `sounds/bgm/*`: Kenney Audio Pack 및 NES Jingles, **CC0 1.0**.
- 출처: [Kenney assets](https://kenney.nl/assets/), [iwenzhou/kenney mirror](https://github.com/iwenzhou/kenney).
- `games/inflation-rpg/scripts/fetch-sounds.sh`는 위 mirror에서 가져오는 자동화 경로다.

`games/inflation-rpg/public/assets/sounds/`는 위 `public/sounds/` 매니페스트와
별개의 자산 경로다. 현재 추적된 27개 파일을 감사했지만, 이 경로에는 출처·원작자·
라이선스를 증명하는 tracked README, manifest, fetch script 또는 embedded metadata가
없다. `file`이 보고하는 Xiph.Org libVorbis 정보는 인코더 정보일 뿐 원본 자산의
출처·라이선스 증거가 아니다. 따라서 다음 27개는 모두 **출처·라이선스 미확인,
출시 차단(release-blocking)** 으로 남긴다. Kenney/CC0로 추정하거나
`public/sounds/`의 attribution을 이 경로에 적용하지 않는다.

완전한 현재 파일 목록:

```text
impact_heavy_metal.ogg
impact_metal.ogg
impact_punch.ogg
impact_soft.ogg
impact_wood.ogg
notify_major.ogg
step_grass_0.ogg
step_grass_1.ogg
step_grass_2.ogg
step_grass_3.ogg
step_grass_4.ogg
step_snow_0.ogg
step_snow_1.ogg
step_snow_2.ogg
step_snow_3.ogg
step_snow_4.ogg
step_stone_0.ogg
step_stone_1.ogg
step_stone_2.ogg
step_stone_3.ogg
step_stone_4.ogg
step_wood_0.ogg
step_wood_1.ogg
step_wood_2.ogg
step_wood_3.ogg
step_wood_4.ogg
ui_click.ogg
```

### 이미지 — 확인된 CC0 그룹

| 파일 그룹 | 라이선스 | 출처 | 비고 |
|---|---|---|---|
| `tiny_town_sheet.png`, `tiny_dungeon_sheet.png`, `tiny_battle_sheet.png` | CC0 1.0 | Kenney Tiny Town/Dungeon/Battle packs, [Kenney assets](https://kenney.nl/assets/) | 현재·이전 버전이 함께 사용하는 타일/시트 그룹 |
| `UI/*.png` | CC0 1.0 | Kenney UI Pack, [kenney.nl/assets/ui-pack](https://kenney.nl/assets/ui-pack) | 버튼·패널·바·커서 |
| `UI/icons/*.png` | CC0 1.0 | Kenney Game Icons, [kenney.nl/assets/game-icons](https://kenney.nl/assets/game-icons) | 체크·원·화살표 아이콘 |

### 이미지 — 현재 이름과 이전 버전 호환 이름

| 파일 그룹 | 라이선스·확인 상태 | 출처 | 구분 |
|---|---|---|---|
| `village_guardian_sheet.png` | **CC0 추정, 검증되지 않음** | 이전 파일명 `joseon_warrior_sheet.png`에 해당하는 기존 자산. itch.io의 “Pixel Art Joseon Korea” pack으로 추정되나 정확한 pack URL은 회복하지 못함 | 현재 게임이 사용하는 이름. 이전 버전 파일을 새로 만든 것이 아니다. |
| `joseon_building_tileset.png`, `joseon_fantasy_tileset.png`, `joseon_tileset.png`, `tileset_joseon_extra.jpg` | **CC0 추정, 검증되지 않음** | itch.io의 “Pixel Art Joseon Korea” pack으로 추정되나 정확한 pack URL은 회복하지 못함 | 이전 버전·에셋 매핑 호환 파일명은 이 task에서 변경하지 않는다. |
| `chosun_battle_bg.png`, `item_joseon.png`, `skill_joseon.png`, `terrain_joseon.png` | 출처·라이선스 미확인 | 기존 이식 자산. 위 추정 pack과의 동일성은 확인되지 않음 | 이전 버전 호환 이름을 보존한다. |

### 이미지 — 출처 회복이 필요한 기존 그룹

다음 파일은 현재 저장소에 남아 있지만 신뢰할 수 있는 원본 출처·라이선스 기록을
찾지 못했다. CC0로 재분류하지 않으며, 배포 전 자산별 확인이 필요하다.

- `monster_dokkaebi.png`, `player_warrior.png`
- `roguelike_decor.png`, `roguelike_full_sheet.png`, `slash_effect.png`, `title_bg.png`
- `pixel_battle_bg.png`, `pixel_tileset.png`
- `tileset_biome_1.jpg`, `tileset_biome_2.jpg`, `tileset_biome_3.jpg`, `tileset_biome_4.jpg`

이 목록은 현재 `public/assets/images/`에 있는 관련 이미지 파일을 빠짐없이 분류하기
위한 것이다. 파일을 rename하거나 출처를 추정해 라이선스를 높여 쓰지 않는다.

## 의존성 라이선스

React, Phaser, Capacitor 등 runtime 의존성은 각 workspace `package.json`과
설치된 패키지의 LICENSE 파일을 기준으로 확인한다. 새 외부 에셋·패키지를 추가할
때는 파일 그룹, 정확한 출처 URL, 라이선스, attribution 의무를 이 문서에 함께
기록한다.

## 확인이 필요한 라이선스

- CC-BY-NC/NC-SA, GPL/AGPL은 상업 배포와 충돌할 수 있으므로 도입하지 않는다.
- 출처·라이선스가 미확인인 기존 이미지의 상태를 CC0로 표시하지 않는다.
- attribution 의무가 있는 자산은 게임 내 credits 또는 README 노출 여부까지
  확인한다.
