# CREDITS — 무료 에셋 출처 매니페스트

이 파일은 `2d-game-forge` 모노레포의 모든 게임이 사용하는 외부 무료 에셋의 출처와
라이선스를 모은다. cycle 164 (2026-05-27) 자율진화 시스템의 asset-investigator
권고 #1 (`docs/superpowers/evolution/cycle-156-assets.md`) 으로 신설.

## 게임별 사용 현황

### `@forge/game-inflation-rpg`

#### 오디오 (`games/inflation-rpg/public/sounds/`)

상세 매니페스트는 `games/inflation-rpg/public/sounds/README.md` 참조. 요약:

- **SFX 12 + BGM 3** = Kenney.nl / OpenGameArt.org **CC0**
- 자동 fetch = `games/inflation-rpg/scripts/fetch-sounds.sh`
- iwenzhou GitHub mirror (Kenney sample pack 의 CC0 sub-set)

attribution 의무 0 (CC0). 다만 메타데이터 일관성 위해 sound README 유지.

#### 이미지 (`games/inflation-rpg/public/assets/images/`)

본 cycle 시점에 manifest 가 *부재* — 자율진화 시스템 finding. 출처 회복은
best-effort 수준 (cycle 156 asset-investigator 권고 #1). 신규 에셋 추가 시
아래 표 갱신 의무.

| 파일 | 라이선스 | 출처 | 비고 |
|---|---|---|---|
| `joseon_*.png` | 불명 (best-effort 회복 필요) | inflation-rpg 의 phase-1 이식 시점 도입 | cycle 164 시점 출처 미상. cycle 170+ 시각화 변경 시 교체 권장. |
| `chosun_battle_bg.png` | 동상 | 동상 | 동상 |
| `pixel_battle_bg.png`, `pixel_tileset.png` | 동상 | 동상 | 동상 |
| `monster_*.png` | 동상 | 동상 | 동상 |
| `item_joseon.png` | 동상 | 동상 | 동상 |
| `UI/*` (icon set) | 동상 | 동상 | cycle 170+ Lucide icon 으로 교체 검토 (asset-investigator 권고). |

**리스크**: 출처 불명 이미지는 라이선스 추적 불가. 본 레포의 라이선스 정책 (
`README.md` 의 MIT 또는 별도 명시) 과 호환되는지 case-by-case 검증 필요.
cycle 170+ 의 점진 교체 또는 대체 다운로드를 권장 (asset-investigator 권고
참조).

#### React 의존성 라이선스

- React / Phaser / Capacitor 등의 핵심 의존성은 `package.json` 의 dependencies
  를 기준. attribution 의무 0 (MIT / ISC / Apache 2.0 mix).
- 향후 추가 의존성 (예: cycle 170+ Lucide React) 도 동일 — package.json 만으로
  attribution 자동 포함.

## 출처가 명확한 신규 에셋의 추가 절차

1. 본 파일의 해당 게임 섹션의 표에 한 줄 추가 (파일 / 라이선스 / 출처 URL / 비고).
2. CC-BY 같이 attribution 의무가 있는 경우 게임의 in-app credit screen 또는
   README 에도 노출. 본 파일은 *개발자용* 매니페스트로만 충분치 않음.
3. CC0 / OFL / MIT 의 경우 본 파일만으로 충분 — 게임 내 노출 의무 0.

## 회피해야 할 라이선스 유형

- **CC-BY-NC / NC-SA**: 상업 배포 시 충돌 (원스토어 / Google Play 등 모두
  monetized — 자동 incompat).
- **GPL / AGPL**: 코드 라이선스가 게임 전체로 전염 — `2d-game-forge` 의 모노레포
  정책과 충돌.
- **출처 불명 / non-attributed**: 본 파일의 첫 finding (joseon_*.png 군집).
  신규 도입 시점에 manifest 누락 부 분을 절대 0 으로 유지.

## 변경 이력

- 2026-05-27 — Cycle 164 신설 (asset-investigator 권고 #1, surface = cycle 156).
