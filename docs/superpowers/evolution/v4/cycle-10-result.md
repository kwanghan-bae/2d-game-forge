# Cycle 10 — Narrative: 몬스터 도감 (Bestiary)

## 요약

61종 몬스터 전원의 한국어 1줄 lore + 처치 횟수 추적 인프라 구축.

## 변경

| 파일 | 내용 |
|------|------|
| `data/monsterLore.ts` | 61종 몬스터 × 1-line 한글 lore |
| `types.ts` | `MetaState.bestiary: Record<string, number>` 추가 |
| `store/gameStore.ts` | trackKill에 bestiary 카운터 증가 로직 + v27 migration |
| `data/monsterLore.test.ts` | 3 tests (coverage, orphan, non-empty) |

## 검증

- typecheck: clean
- vitest: 1632 passed (+3)
- persist: v26→v27 (migration: bestiary ?? {})

## 태그

- Commit: 0dfbd7b
- Category: narrative (2/10)
