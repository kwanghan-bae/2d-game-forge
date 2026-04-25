# 설계 스펙: Phase 4b SoundManager

> **상태**: Draft, 2026-04-25
> **결정**: B' Kenney CC0 자동 통합 (BGM 3 + SFX 12)

## 0. 요약

inflation-rpg 청각 완성도. CC0 라이선스 사운드 자동 fetch + SoundManager + 볼륨 UI.

## 1. Asset 출처 (모두 CC0)

### 1.1. SFX (12개)

Kenney 의 RPG Audio / UI Audio / Impact Sounds 패키지에서 큐레이션:

| ID | 의미 | 출처 |
| --- | --- | --- |
| `sfx-click` | UI 버튼 | Kenney UI Audio |
| `sfx-equip` | 장비 장착 | Kenney UI Audio |
| `sfx-coin` | 골드 획득 | Kenney UI Audio |
| `sfx-hit` | 일반 피격 | Kenney Impact |
| `sfx-crit` | 치명타 | Kenney Impact |
| `sfx-skill` | 스킬 발동 | Kenney RPG |
| `sfx-heal` | 회복 | Kenney RPG |
| `sfx-levelup` | 레벨업 | Kenney RPG |
| `sfx-quest-complete` | 퀘스트 완료 | Kenney UI |
| `sfx-craft` | 합성 성공 | Kenney UI |
| `sfx-boss-victory` | 보스 처치 | Kenney RPG |
| `sfx-defeat` | 사망 | Kenney RPG |

### 1.2. BGM (3트랙)

OpenGameArt CC0 retro 트랙 (Kenney 는 BGM 부족):

| ID | 화면 | 분위기 |
| --- | --- | --- |
| `bgm-lobby` | main-menu, class-select | 평온, 순환 |
| `bgm-field` | world-map, region-map, inventory, shop, quests | 모험 |
| `bgm-battle` | dungeon (battle) | 긴장, 전투 |

## 2. 디렉토리 + License

```
games/inflation-rpg/public/sounds/
├── README.md            # CC0 출처 + license 명시
├── sfx/
│   ├── click.ogg
│   ├── equip.ogg
│   └── … (12개)
└── bgm/
    ├── lobby.ogg
    ├── field.ogg
    └── battle.ogg
```

## 3. SoundManager 인프라

### 3.1. `MetaState` 확장

```typescript
musicVolume: number;  // 0-1
sfxVolume: number;    // 0-1
muted: boolean;
```

기본값: `musicVolume: 0.5`, `sfxVolume: 0.7`, `muted: false`.

### 3.2. `systems/sound.ts` (싱글톤)

```typescript
export const SOUNDS_BASE = '/sounds';

export function playSfx(id: string): void;        // HTMLAudioElement, volume = sfxVolume
export function playBgm(id: string | null): void; // 현재 BGM 교체 (null = stop)
export function setVolumes(music: number, sfx: number, muted: boolean): void;
```

파일 누락 시 silent skip (warn 로그). 여러 SFX 동시 재생 가능 (audio pool).

### 3.3. 자동 BGM 전환

App.tsx 에 useEffect: screen 변경 시 적절한 bgm 재생.

```typescript
const SCREEN_BGM: Partial<Record<Screen, string>> = {
  'main-menu': 'lobby',
  'class-select': 'lobby',
  'world-map': 'field',
  'inventory': 'field',
  'shop': 'field',
  'quests': 'field',
  'dungeon': 'battle',
  'battle': 'battle',
};
```

### 3.4. SFX 호출 지점

- BattleScene: `sfx-hit` (각 처치), `sfx-crit` (치명타 — 추후), `sfx-skill` (스킬 발동), `sfx-boss-victory`, `sfx-defeat`, `sfx-levelup`
- ForgeButton: `sfx-click` (모든 클릭)
- Inventory: `sfx-equip`, `sfx-craft`
- Quests: `sfx-quest-complete`
- 보상 골드: `sfx-coin`

(과도한 사운드 트리거 방지를 위해 1차 도입은 핵심 hook 에만 — 보스 처치, 사망, 스킬, 레벨업, 퀘스트 완료, 합성, 클릭. 나머지는 후속.)

## 4. 볼륨 UI

MainMenu 또는 별도 Settings modal:
- BGM 슬라이더 (0-100)
- SFX 슬라이더 (0-100)
- "음소거" 토글

심플하게 MainMenu 하단에 작은 컨트롤 (settings modal 까지는 미래).

## 5. 자동 fetch script

`scripts/fetch-sounds.sh` — Kenney + OpenGameArt raw URL 에서 curl/wget. README 에 실행 방법 명시. 실제 audio 파일은 git 에 commit (CC0 + 합리적 크기).

만약 fetch 실패 시: `public/sounds/` 비어있어도 SoundManager 가 silent fallback (warn 만).

## 6. 성공 기준

- [ ] `MetaState` 에 musicVolume/sfxVolume/muted 추가 + save 마이그레이션
- [ ] `systems/sound.ts` 가 playSfx/playBgm/setVolumes 제공
- [ ] App.tsx 가 screen 변경 시 자동 BGM 전환
- [ ] BattleScene 의 보스 처치/사망/레벨업/스킬 4 hook 에서 SFX 호출
- [ ] MainMenu 에 볼륨 슬라이더 + 음소거
- [ ] 사운드 파일 누락 시 게임 정상 작동 (silent fallback)
- [ ] 단위 테스트 ≥ 3 (sound state, mute toggle, screen→bgm map)

## 7. 분할

- T1: types.ts + MetaState 확장
- T2: systems/sound.ts + 테스트
- T3: gameStore actions + save 마이그레이션
- T4: scripts/fetch-sounds.sh + public/sounds/README.md
- T5: App.tsx 자동 BGM 전환
- T6: BattleScene SFX hooks
- T7: MainMenu 볼륨 UI
- T8: 통합 검증 + tag

8 task. Tag: `phase-4b-sound-complete`.

## 8. 알려진 제약

- 실제 fetch script 실행 결과는 sandbox 에 따라 가변. 로컬 환경에서 실행 → audio 파일 commit.
- Phaser 의 sound system 대신 `<audio>` HTMLAudioElement 사용 — Phaser 외 React 셸에서도 SFX 재생 가능.
- 라이선스 추적: `public/sounds/README.md` 가 CC0 source URL 명시.
