# Cycle 1 PRD — "이모지에서 스프라이트로"

## 카테고리: Visual

## 목표

전투 화면과 오버월드에서 이모지 Text를 제거하고 pixel art sprite로 교체한다.
"스프레드시트"에서 "게임"으로의 최소 전환.

## 반대 기준 (NOT this)

- ❌ 커스텀 폰트 도입
- ❌ 화면 전환 애니메이션
- ❌ BGM/SFX 추가
- ❌ 밸런스 수치 변경 (k_gain 등)
- ❌ 새로운 시스템/컨텐츠 추가
- ❌ AI 생성 1024×1024 파일 사용

## 현재 상태

- OverworldScene: `heroSprite: Text` (이모지), `landmarkSprites: Map<string, Text>`
- BattleScene: `this.add.rectangle` + `this.add.text` (HP bar + 숫자)
- 미사용 에셋:
  - `tiny_dungeon_sheet.png` (192×176, 12×11 @16px) — 캐릭터+몬스터+타일 포함
  - `tiny_battle_sheet.png` (288×176, 18×11 @16px) — 유닛+환경
  - `tiny_town_sheet.png` (192×176) — 마을+NPC

## 에셋 전략

### 기존 시트 활용 (즉시 가용)

`tiny_dungeon_sheet.png` 하단 영역에 다음 스프라이트 확인:
- 캐릭터 스프라이트 (기사, 마법사, 도적 등) — 16×16
- 몬스터 스프라이트 (스켈레톤, 고블린 등) — 16×16
- 던전 타일 (바닥, 벽) — 16×16

### 추가 다운로드: 0x72 DungeonTileset II

- URL: https://0x72.itch.io/dungeontileset-ii
- License: CC0 (Public Domain)
- 내용: 캐릭터(knight, elf, wizard), 몬스터(zombie, imp, big_demon, skeleton),
  타일(floor 8종, wall), 이펙트(weapon slash), 아이템(coin, flask)
- 크기: 16×16 기본, big_demon은 32×32

### 렌더 규칙

- 원본 16×16 → Phaser에서 `setScale(3)` = 48px 표시
- `image-rendering: pixelated` (nearest-neighbor)
- 32×32 보스는 `setScale(2)` = 64px 표시

## 구현 범위 (Features)

### F1. Spritesheet Atlas 생성 + Preload

- `tiny_dungeon_sheet.png`에서 개별 프레임 추출하는 atlas JSON 생성
- 또는 0x72 팩 다운로드 시 개별 PNG → TexturePacker/수동 atlas
- Phaser preload에 atlas 등록

### F2. OverworldScene — Hero Sprite 교체

- `heroSprite: Text` → `heroSprite: Sprite`
- 16×16 knight 프레임 사용, scale 3x
- idle animation 4 frame (있을 경우)
- 기존 이동 로직(tween) 유지, target을 Sprite로 변경

### F3. OverworldScene — Landmark Sprite 교체

- `landmarkSprites: Map<string, Text>` → `Map<string, Sprite>`
- 몬스터 영역: 몬스터 스프라이트 (3종 이상 매핑)
- 보스 영역: 보스 스프라이트 (big_demon 등)
- NPC: NPC 스프라이트 (elf/wizard)

### F4. BattleScene — 전투 엔티티 표시

- 아군: 좌측에 hero sprite 표시 (idle animation)
- 적: 우측에 monster sprite 표시 (type별 매핑)
- 기존 HP bar + 숫자 UI 유지, sprite 아래에 배치

### F5. Hit VFX 최소 1종

- slash effect 3-frame sprite animation
- 공격 시 적 위치에 0.3초 재생
- `this.add.sprite` + `play` + `once('animationcomplete', destroy)`

### F6. AI 생성 파일 정리

- `player_warrior.png`, `monster_dokkaebi.png`, `slash_effect.png` →
  `/deprecated/` 이동 또는 삭제 (코드에서 미참조 확인 후)

## 영향 범위

- `src/overworld/OverworldScene.ts` — hero/landmark 렌더링 변경
- `src/battle/BattleScene.ts` — entity sprite 추가
- `src/battle/BattleGame.ts` — preload 에셋 추가 (있을 경우)
- `public/assets/images/` — atlas JSON 추가, 에셋 정리
- 신규: sprite 매핑 유틸 (characterId/monsterId → frame key)

## 테스트 계획

- 기존 1609 vitest 회귀 통과
- 기존 60 e2e 회귀 통과
- OverworldScene 렌더링 smoke test (sprite 존재 확인)
- BattleScene 렌더링 smoke test

## 성공 기준

- [ ] 오버월드에서 이모지 대신 pixel sprite가 보인다
- [ ] 전투 화면에서 아군/적이 sprite로 표시된다
- [ ] 공격 시 hit VFX가 재생된다
- [ ] AI 생성 파일이 정리된다
- [ ] 비주얼 성숙도: 1/30 → 5/30 (캐릭터+1, 몬스터+1, 이펙트+1, 배경+1)
- [ ] typecheck + lint + test + circular 통과

## 리스크

1. `tiny_dungeon_sheet.png`의 캐릭터 영역 좌표를 수동 식별해야 함
2. 0x72 팩 다운로드 불가 시 기존 시트만으로 진행
3. BattleScene 레이아웃 변경이 기존 HP bar 위치와 충돌할 수 있음
