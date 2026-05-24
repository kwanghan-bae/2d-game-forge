# Cycle 2 에셋 조사 (Free Asset Investigator)

## 한 줄

**추가 다운로드 0**. F1/F3 는 에셋 요구 0. F2 의 idle 회춘 비트는 기존 `levelup.ogg` (CC0, Kenney) 와 `heal.ogg` (CC0, Kenney) 가 톤·발화 시점 양쪽에서 fit — 새 SFX 도입 backlog 로 미룬다.

## PRD 의 에셋 요구

| Feature | 카테고리 | 수량 | 톤 요구 | 결론 |
|---|---|---|---|---|
| F1 (Multi-seed Acceptance 룰) | — | 0 | — | persona doc 패치 + cycle-2-backlog cross-link 만. game code/asset 0. 에셋 요구 0. |
| F2 (Eternal Hero 회춘·사망 비트 회수) | sfx (선택) / bgm 변형 (선택) | 0 권장 / 1 후보 | 짧고 부드러움, 따뜻한 톤 (idle rejuvenation = 긍정적 비트) | sim infra 변경 (`MAX_ARRIVALS 500→1000`) + 회춘 trigger 확장 + narrative-only emit. PRD §F2 NOT this 가 "narrative 비트 emit 회수만" 명시 → 시각/사운드 transition 명시 0. **기존 `levelup.ogg` + `heal.ogg` 재사용 권장**, 신규 SFX 도입은 backlog. |
| F3 (Narrative Variance Pass) | — | 0 | — | 텍스트 catalog 확장 (levelUpBatch 6→15 / moralChoice 5→8 / NPC 24). 에셋 요구 0. |

## 카테고리별 후보

해당 없음. 신규 에셋 요구 0.

선택적으로 F2 의 idle rejuvenation 비트에 신규 SFX 를 도입할 경우 (**본 cycle scope 외, backlog**) 의 후보를 참고용으로 정리:

### sfx — idle rejuvenation (참고용, backlog)

| # | 출처 | 파일 | 라이선스 | 톤 fit | 사이즈 | 권장 |
|---|---|---|---|---|---|---|
| 1 | Kenney UI Audio Pack — 기존 `levelup.ogg` 재사용 | levelup.ogg | CC0 1.0 | 9/10 (긍정적 + 짧음, 다만 levelup 과 시점 겹치면 청취 충돌) | 14 KB | ★ (재사용) |
| 2 | Kenney UI Audio Pack — 기존 `heal.ogg` 재사용 | heal.ogg | CC0 1.0 | 8/10 (회복 = 회춘 비트 의미 유사) | 12 KB | ★★ (재사용 1순위) |
| 3 | Kenney Fantasy Sounds RPG 0.1 — `bonus1.ogg` 또는 `chime_short_001.ogg` (후보, 미다운로드) | (new) | CC0 1.0 | 9/10 (chime 형 — 회춘 비트 톤) | ~15 KB | (backlog 시 후보) |

**결론**: 본 cycle 은 신규 다운로드 0. 기존 `heal.ogg` (또는 `levelup.ogg`) 재사용 권장 — implementer 가 SoundManager 호출 시 `play('heal')` 한 줄 추가만으로 비트 강화 가능. PRD 가 명시하지 않으므로 implementer 재량.

## 권장 통합

해당 없음 (신규 다운로드 0).

선택 통합 (backlog, implementer 재량):
- F2 의 `CycleControllerV2.handleArrival` 안 idle rejuvenation emit 직후 `SoundManager.play('heal')` 1 줄 추가. 코드 변경 1 줄, asset 추가 0, 라이선스 매니페스트 변경 0.

## 재사용 가능 기존 에셋

### SFX (`games/inflation-rpg/public/sounds/sfx/`, CC0 — Kenney)

- `click.ogg` — UI 인터랙션 (SagaBookModal filter chip 등). F1/F2/F3 모두 UI 신규 0 이므로 추가 호출 없음.
- `coin.ogg`, `craft.ogg`, `equip.ogg`, `quest-complete.ogg` — F2/F3 의 narrative 발화와 무관한 기존 이벤트 그대로.
- `levelup.ogg` — F3 의 levelUpBatch tier 변화와 함께 발화. tier1/2/3 자릿수 분기에도 동일 SFX 재사용 (sub-type 별 SFX 분리 = scope creep).
- `heal.ogg` — F2 의 idle rejuvenation 발화 시 (backlog) 재사용 후보 1순위.
- `boss-victory.ogg`, `defeat.ogg`, `hit.ogg`, `crit.ogg`, `skill.ogg` — F2/F3 와 무관.

### BGM (`games/inflation-rpg/public/sounds/bgm/`, CC0 — OpenGameArt)

- `lobby.ogg`, `field.ogg`, `battle.ogg` — V3-A 의 screen 별 BGM 자동 전환 그대로. F2 의 `MAX_ARRIVALS 1000` 상향이 BGM 시간 2 배 → loop 자연 지속, 변경 0.

### 코드 인프라

- `src/systems/sound.ts` — SoundManager 의 silent fallback. F2 의 회춘 비트에 새 SFX 키 추가 시 (`play('rejuv-idle')` 등) 코드 변경 없이 silent fallback 동작. 실제 파일 도입은 backlog.
- `scripts/fetch-sounds.sh` — Kenney/OpenGameArt fetch 인프라 그대로. backlog 의 신규 SFX 도입 시 같은 패턴으로 라인 추가.

## 라이선스 매니페스트 추가

추가 라인 없음. 기존 `scripts/fetch-sounds.sh` 의 CC0 1.0 Universal 명시 그대로 유지.

## 표류 경고

- **F2 의 회춘 비트 강화를 SFX/BGM 도입 핑계로 사용 금지** — PRD §F2 NOT this 가 "narrative 비트 emit 회수만" 명시. SFX 추가는 narrative emit 보강 (≠ 비트 자체의 추가) 라 가드 위반 아니지만, **scope creep 위험** — implementer 가 idle rejuvenation 발화율을 sim 으로 검증 (test plan F2.15~F2.21) 한 *후* 사용자 피드백 받고 backlog 처리.
- **realm 별 BGM variant** (sea = 잔잔, volcano = 격렬, chaos = 불협) 는 cycle 1 의 표류 경고와 동일하게 본 cycle scope 외. cycle 2 도 F2 가 sim 환경의 회춘/사망 비트 회수에 집중 — BGM 확장 backlog 항목 부재 유지.
- **F3 의 tier3 (≥1M) 자릿수 톤이 우주적 어휘 (`차원 / 별 / 우주`)** — 신규 SFX 매핑 (예: `cosmic-chime.ogg`) 매력적이나 PRD 가 명시하지 않으므로 backlog. levelUpBatch SFX 는 단일 `levelup.ogg` 유지, tier 별 SFX 분리는 cycle 3+ PRD 가 명시할 때.
- **multi-seed 측정의 jsonl/md output 자체는 에셋 아님** — sim 결과물은 `/tmp/cycle-2-seed-*` 에 임시 저장, 게임 출시 bundle 외부. 라이선스/에셋 매니페스트 영향 0.
- 라이선스 위험: 0 (신규 에셋 0).
- 한 cycle 30 개 cap: 0/30. 안전.
