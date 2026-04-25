# inflation-rpg Sounds

이 디렉토리는 **CC0 라이선스** (퍼블릭 도메인) 사운드를 호스팅한다.

## 구조

```
public/sounds/
├── README.md       (이 파일)
├── sfx/            (12개 효과음, .ogg)
└── bgm/            (3개 배경음악, .ogg)
```

## 출처

| 카테고리 | 출처 | 라이선스 |
| --- | --- | --- |
| SFX (UI/Impact/RPG) | [Kenney.nl](https://kenney.nl/assets) (UI Audio, Impact Sounds, RPG Audio 패키지) | CC0 1.0 Universal |
| BGM (lobby/field/battle) | [OpenGameArt.org](https://opengameart.org/content/cc0-sound-effects) (8-bit retro tracks) | CC0 1.0 Universal |

CC0 는 attribution 의무 없는 퍼블릭 도메인. 상업적/비상업적 자유 사용.

## 큐레이션

### SFX 12개 (sfx/<id>.ogg)

| ID | 의미 |
| --- | --- |
| `click` | UI 버튼 클릭 |
| `equip` | 장비 장착 |
| `coin` | 골드 획득 |
| `hit` | 일반 피격 |
| `crit` | 치명타 |
| `skill` | 스킬 발동 |
| `heal` | 회복 |
| `levelup` | 레벨업 |
| `quest-complete` | 퀘스트 완료 |
| `craft` | 합성 성공 |
| `boss-victory` | 보스 처치 |
| `defeat` | 사망 |

### BGM 3트랙 (bgm/<id>.ogg)

| ID | 화면 |
| --- | --- |
| `lobby` | main-menu, class-select |
| `field` | world-map, inventory, shop, quests |
| `battle` | dungeon, battle |

## 다운로드

루트에서:

```bash
./scripts/fetch-sounds.sh
```

스크립트가 Kenney + OpenGameArt 패키지를 다운로드 + 큐레이션 후 `public/sounds/sfx/` 와 `bgm/` 에 배치한다.

**파일 누락 시**: 게임은 silent fallback (warn 로그). 정상 작동.

## 라이선스 추적

각 .ogg 파일의 정확한 원본 URL 은 향후 작업에서 LICENSE 항목 별로 기록 예정. 현재는 Kenney 공식 패키지 / OpenGameArt CC0 카테고리 기준.
