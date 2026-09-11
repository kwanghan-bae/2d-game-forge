# CREDITS — 무료 에셋 출처 매니페스트

이 문서는 현재 게임이 실제로 제공하는 외부 에셋의 출처와 라이선스 확인 상태를
기록한다. 확인되지 않은 라이선스를 단정하지 않는다.

## `@forge/game-inflation-rpg`

### 오디오

`games/inflation-rpg/public/sounds/README.md`의 매니페스트를 기준으로 한다.

- `sounds/sfx/*`, `sounds/bgm/*`: Kenney Audio Pack 및 NES Jingles, **CC0 1.0**.
- 출처: [Kenney assets](https://kenney.nl/assets/), [iwenzhou/kenney mirror](https://github.com/iwenzhou/kenney).
- `games/inflation-rpg/scripts/fetch-sounds.sh`가 위 mirror에서 파일을 가져온다.

### 이미지

현재 웹·Android 화면에서 사용하는 이미지의 라이선스 확인이 아직 끝나지 않았다.
출시 전 원본 pack과 라이선스를 확인해야 한다.

- `public/assets/images/title_bg.png`
- `public/assets/images/village_guardian_sheet.png`

## 의존성 라이선스

React, Next.js, Capacitor, Galmuri 등 runtime 의존성은 각 workspace
`package.json`과 설치된 패키지의 LICENSE 파일을 기준으로 확인한다. 새 외부
에셋·패키지를 추가할 때는 정확한 출처 URL, 라이선스, attribution 의무를 이
문서에 함께 기록한다.
