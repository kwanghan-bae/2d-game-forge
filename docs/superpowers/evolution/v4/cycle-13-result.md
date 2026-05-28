# Cycle 13 — Visual: 영역별 UI 색상 액센트

## 요약

6개 Realm별 고유 accent color 시스템 구축. 현재 realm에 따라 UI accent 동적 전환.

## Realm 색상표

| Realm | Accent | Dim | 느낌 |
|-------|--------|-----|------|
| base | #f0c060 | #2a2410 | gold |
| sea | #60c0e0 | #102a30 | cyan |
| volcano | #e06030 | #301510 | ember |
| underworld | #b060e0 | #1a1030 | purple |
| heaven | #e0e0f0 | #1a1a2a | silver |
| chaos | #e02060 | #301020 | crimson |

## 변경

| 파일 | 내용 |
|------|------|
| `systems/realmAccent.ts` | REALM_ACCENTS map + applyRealmAccent() |
| `App.tsx` | useEffect로 currentRealmId 변경 시 accent 적용 |
| `systems/realmAccent.test.ts` | 2 tests |

## 비주얼 성숙도

- 색상: 0 → 1
- 전체: 7/30 → 8/30

## 태그

- Commit: 7c0bfb9
- Category: visual (4/13)
