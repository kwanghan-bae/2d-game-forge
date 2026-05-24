# Cycle 1 에셋 조사 (Free Asset Investigator)

## 한 줄

**추가 다운로드 0**. PRD 의 F1/F2/F3 모두 기존 에셋 풀로 cover 된다.

## PRD 의 에셋 요구

| Feature | 카테고리 | 수량 | 톤 요구 | 결론 |
|---|---|---|---|---|
| F1 (Build/Cycle Variance Pass) | — | 0 | — | 순수 mechanic/data 조정 (`SHRINE_SKILL_GRANT_RATE`, `JobSystem.evaluate` tie-break, `MERCIFUL_PROC_RATE`). 에셋 요구 0. |
| F2 (Realm Tone Narrator) | sfx (선택) | 0 | — | `forRealmEnter`/`forSeasonChange` 는 NarrativeGenerator 의 텍스트 생성만. realm 진입 시각/사운드 transition 은 V3-A 가 이미 wire 한 `chapter_transition` 이벤트(overlay-only) 재사용. PRD 는 sfx 요구 명시 없음. |
| F3 (NPC Saga Dead Path 회수) | — | 0 | — | `recordToStore` 호출 wire + `NarrativeGenerator` 의 3 generator 추가. SagaBookModal/EternalSaga 기존 UI 재사용. 에셋 요구 0. |

## 카테고리별 후보

해당 없음. 신규 에셋 요구 0.

## 권장 통합

해당 없음.

## 재사용 가능 기존 에셋

### SFX (`games/inflation-rpg/public/sounds/sfx/`, CC0 — Kenney)

- `click.ogg` — UI 인터랙션 (SagaBookModal filter chip 등)
- `coin.ogg`, `craft.ogg`, `equip.ogg`, `quest-complete.ogg` — F1 의 skill/job 변경으로 자연 발화되는 기존 이벤트 그대로 사용
- `levelup.ogg` — F2 의 narrative 가 levelUp 과 함께 발화될 때 그대로
- `boss-victory.ogg`, `defeat.ogg`, `hit.ogg`, `crit.ogg`, `heal.ogg`, `skill.ogg` — F3 의 npc_died/family_event narrative 가 기존 SFX 이벤트와 같은 타이밍

### BGM (`games/inflation-rpg/public/sounds/bgm/`, CC0 — OpenGameArt)

- `lobby.ogg`, `field.ogg`, `battle.ogg` — V3-A 의 screen 별 BGM 자동 전환 그대로

### 코드 인프라

- `src/systems/sound.ts` — SoundManager 의 silent fallback (파일 누락 시 정상 동작). F2 가 realm 진입 sfx 를 *나중에* 추가하더라도 코드 변경 없이 받을 수 있는 hook 이미 있음.
- `chapter_transition` 이벤트는 `OverworldEvents.ts`/`CycleControllerV2.ts` 에서 V3-A 가 활성화 완료 — `OverworldRunner` 가 overlay 만 띄우는 visual-only 패턴. F2 의 realm-enter narrative 도 동일 visual-only 경로(narrativeText slot) 로 충분.

## 라이선스 매니페스트 추가

추가 라인 없음. 기존 `scripts/fetch-sounds.sh` 의 CC0 1.0 Universal 명시 그대로 유지.

## 표류 경고

- **F2 의 realm 별 5 variant × 6 realm = 30 줄 + season variant 4** 는 `narrationVariants.ts` 의 **텍스트 데이터** 이지 에셋이 아니다. story-writer/story-critic 페르소나의 책임 영역으로, 무료에셋 조사관 scope 외.
- **realm 별 BGM variant 추가 권장 (예: sea = 잔잔, volcano = 격렬, chaos = 불협)** 은 매력적이지만 **이번 cycle scope 외**. PRD 의 F2 가 narrative 톤만 명시했고, BGM 확장은 backlog 항목으로도 부재. "에셋이 컨텐츠를 끌고 가는 게 아니라 컨텐츠가 에셋을 요구" 원칙에 따라 cycle 2 이후 PRD 가 명시할 때 후보 조사한다.
- **NPC 별 portrait sprite (라이벌·멘토·자식)** 도 V3-DEF design 의 자연스러운 확장이지만 F3 는 dead path 회수(data wire) 만 명시. SagaBookModal 의 text-only 표현으로 충분. portrait 도입은 별도 phase.
- 라이선스 위험: 0 (신규 에셋 0).
- 한 cycle 30 개 cap: 0/30. 안전.
