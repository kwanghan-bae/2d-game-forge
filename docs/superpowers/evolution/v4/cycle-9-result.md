# Cycle 9 — Visual: 한글 픽셀 폰트 적용

## 요약

Galmuri 11px/14px 비트맵 픽셀 폰트를 게임 UI 전체에 적용. 레트로 RPG 분위기 강화.

## 변경

| 파일 | 내용 |
|------|------|
| `package.json` | `galmuri` npm 패키지 추가 (SIL OFL) |
| `app/globals.css` | `@import "galmuri/dist/galmuri.css"`, body font-family 변경 |
| `styles/game.css` | `--forge-font-body`, `--forge-font-heading` 변수 추가 + h1-h3 규칙 |

## 비주얼 성숙도 변화

- 폰트: 0 → 1 (Galmuri pixel bitmap 적용)
- 전체: 6/30 → 7/30

## 검증

- typecheck: clean
- vitest: 1629 passed
- 시각적: Galmuri11 = 11px 비트맵 (한글 2350자+), Galmuri14 = 14px heading용

## 태그

- Commit: c142635
- Category: visual (3/9)
