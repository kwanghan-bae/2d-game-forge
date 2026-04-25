# inflation-rpg Sounds

이 디렉토리는 **CC0 1.0 Universal** (퍼블릭 도메인) 사운드를 호스팅한다.
attribution 의무 없음 — 상업/비상업 자유 사용.

## 출처

모든 .ogg 파일은 [iwenzhou/kenney](https://github.com/iwenzhou/kenney)
GitHub mirror 의 `Audio (295 files)/` 디렉토리에서 가져왔다. 원본은
[Kenney.nl Asset Pack 1](https://kenney.nl/assets/) (CC0 1.0).

## 다운로드

루트가 아닌 게임 디렉토리에서:

```bash
./scripts/fetch-sounds.sh
```

`scripts/fetch-sounds.sh` 가 GitHub raw URL 에서 `curl` 로 받아 `sfx/` 와
`bgm/` 에 큐레이션 배치한다. 파일 누락 시 `systems/sound.ts` 가 silent
fallback (warn 만) — 게임은 정상 작동.

## 큐레이션 매핑

### SFX 12개 (`sfx/<id>.ogg`)

| forge ID | 의미 | 원본 |
| --- | --- | --- |
| `click` | UI 버튼 클릭 | `UI sounds/click1.ogg` |
| `equip` | 장비 장착 | `UI sounds/switch7.ogg` |
| `coin` | 골드 획득 | `RPG sounds/handleCoins.ogg` |
| `hit` | 일반 피격 | `RPG sounds/knifeSlice.ogg` |
| `crit` | 치명타 | `RPG sounds/chop.ogg` |
| `skill` | 스킬 발동 | `Digital sounds/laser5.ogg` |
| `heal` | 회복 | `Digital sounds/highUp.ogg` |
| `levelup` | 레벨업 | `Jingle sounds/jingles_HIT/jingles_HIT00.ogg` |
| `quest-complete` | 퀘스트 완료 | `Jingle sounds/jingles_NES/jingles_NES01.ogg` |
| `craft` | 합성 성공 | `RPG sounds/metalLatch.ogg` |
| `boss-victory` | 보스 처치 | `Jingle sounds/jingles_HIT/jingles_HIT09.ogg` |
| `defeat` | 사망 | `Digital sounds/lowDown.ogg` |

### BGM 3트랙 (`bgm/<id>.ogg`)

8-bit NES jingle 을 `loop=true` 로 반복.

| forge ID | 화면 | 원본 |
| --- | --- | --- |
| `lobby` | main-menu, class-select | `Jingle sounds/jingles_NES/jingles_NES00.ogg` |
| `field` | world-map, inventory, shop, quests | `Jingle sounds/jingles_NES/jingles_NES03.ogg` |
| `battle` | dungeon, battle | `Jingle sounds/jingles_NES/jingles_NES10.ogg` |

## 라이선스

| 자산 | 라이선스 | 원작자 |
| --- | --- | --- |
| 모든 .ogg | CC0 1.0 Universal | Kenney (kenney.nl) — 미러링: iwenzhou/kenney |

CC0 는 attribution 의무 없는 퍼블릭 도메인 헌정.
