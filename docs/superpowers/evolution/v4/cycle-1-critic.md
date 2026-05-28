# Cycle 1 — Phase A 평가 종합

## 5축 점수

| 축 | 점수 | 핵심 근거 |
|---|---|---|
| 흥행성 | 2/10 | 스토어 스크린샷 촬영 불가. 전투 화면 = colored rectangle + system text |
| 재미 | 5/10 | 시스템 깊이 우수하나 시각 피드백 제로로 쾌감 전달 실패 |
| 몰입성 | 4/10 | 26 스토리 이벤트 + tone 체계 존재하나 매체가 텍스트뿐 |
| 플레이타임 | 7/10 | 120 area × 5 realm × 109 boss — 볼륨 충분 |
| 비주얼 | 1/10 | 캐릭터/몬스터 스프라이트 0, VFX 0, 전환 0, 커스텀 폰트 0 |

**종합: 19/50** — 시스템 과잉 투자, 비주얼 절대 부족.

---

## 약점 TOP 3

### 1. 전투 엔티티 스프라이트 전무 (Visual — P0)

BattleScene 505줄에 sprite/image 호출 0회. OverworldScene은 이모지 Text로
영웅·랜드마크를 렌더링. AI 생성 1024×1024 파일 3개(`player_warrior`,
`monster_dokkaebi`, `slash_effect`)는 스타일 불일치로 사용 불가.
`tiny_dungeon_sheet.png`(192×176, 0x72 추정)이 존재하나 코드 참조 0.

**아트 디렉터 VETO**: 이모지 Text를 entity 표현으로 계속 사용하는 것 금지.

### 2. VFX/Juice 부재 — inflation 쾌감 전달 실패 (Visual — P0)

데미지 40,000과 1,000,000의 시각 차이가 글자 길이뿐.
floating damage, screen shake, crit flash 모두 미구현.

### 3. k_gain == k_req — inflation 정체성 위배 (Balance — P1)

`expRequired = 100 * level^1.8`, 획득 경험치 ∝ `level^1.8` → 킬당 레벨업
비율이 상수. 레벨 100이든 100,000이든 동일 킬 수 소요.
"고레벨에서 폭발적으로 빨라지는 성장"이라는 핵심 쾌감 부재.

---

## 비주얼 성숙도 (1/30 유지)

| 영역 | 점수 | 시급도 |
|---|---|---|
| 캐릭터 | 0 | ★★★ 최우선 |
| 몬스터 | 0 | ★★★ 최우선 |
| 이펙트 | 0 | ★★☆ |
| 배경 | 0 | ★★☆ |
| 아이콘 | 1 | - |
| 전환 | 0 | ★☆☆ |
| 폰트 | 0 | ★☆☆ |
| BGM | 0 | ☆☆☆ |
| SFX | 0 | ☆☆☆ |
| 색상 | 0 | ★☆☆ |

---

## 카테고리 추천: **visual**

근거:
- 강제 룰 #9: 비주얼 점수 < 5/10 → 새 시스템 추가 금지. 현재 1/10.
- 강제 룰 #7: 시스템 3개 연속 시 비주얼/사운드 강제. (v3에서 300+ cycle 시스템 집중)
- 4개 페르소나 만장일치: visual 최우선.

---

## 스코프 합의 방향 (Phase B 입력)

**Cycle 1 목표: "이모지에서 스프라이트로" — Minimum Viable Visual**

1. 0x72 DungeonTileset II 에셋 다운로드 + atlas 패킹
2. OverworldScene: Text → Sprite (hero + landmark 3종)
3. BattleScene: 적/아군 sprite 표시 (최소 4종)
4. Hit VFX 1종 (slash 3-frame)
5. 바닥 타일 레이어 (floor tiles)

**NOT this cycle**: 커스텀 폰트, 화면 전환, BGM 개선, 밸런스 수치 변경.

기대 성숙도: 1/30 → **5/30** (+4)

---

## 부록: 레벨디자이너 / 스토리작가 주요 발견 (carry-over 후보)

- k_gain 2.0 변경 (inflation 정체성 복원) → Cycle 2 balance 후보
- 패시브 스킬 7/16 동일 문제 → Cycle 2~3 system 후보
- Personality-blind 나레이션 → Cycle 3+ narrative 후보
- seasonChange variant 풀 고갈 (season당 1문장) → narrative 후보
