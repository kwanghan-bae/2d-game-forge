# @forge/registry

로컬 shadcn registry — Forge-UI 의 공용 컴포넌트 및 테마 소스를 호스팅한다.
각 게임은 `pnpm dlx shadcn@latest add file:../../packages/registry/r/<item>.json` 으로
**소스를 자기 워크스페이스에 복사** 하여 사용. npm 의존성이 아님.

## 현재 제공 아이템

| name | type | 용도 |
| --- | --- | --- |
| `theme-modern-dark-gold` | theme | 기본 테마 — Modern Dark + Gold (inflation-rpg 미학) |
| `forge-screen` | ui | 앱 최상위 래퍼. safe-area padding + 100dvh |
| `forge-button` | ui | primary / secondary / disabled 3 variant |
| `forge-panel` | ui | inset / elevated 2 variant |
| `forge-gauge` | ui | 스텟 게이지 바. hp/atk/def/agi/luc/bp 토큰 지원 |
| `forge-inventory-grid` | ui | 2/3/4 컬럼 그리드 |

## 새 게임에서 사용하기

1. `components.json` 생성:
   ```json
   {
     "$schema": "https://ui.shadcn.com/schema.json",
     "tailwind": { "css": "src/app/globals.css", "baseColor": "neutral" },
     "aliases": { "ui": "@/components/ui", "utils": "@/lib/utils" }
   }
   ```
2. 테마 + 컴포넌트 add:
   ```bash
   pnpm dlx shadcn@latest add file:../../packages/registry/r/theme-modern-dark-gold.json
   pnpm dlx shadcn@latest add file:../../packages/registry/r/forge-button.json
   # ...
   ```
3. `src/app/globals.css` 에 테마 CSS import.

## 새 아이템 추가 절차

1. `src/ui/forge-xxx.tsx` 혹은 `src/themes/xxx.css` 소스 작성
2. `r/forge-xxx.json` registry 메타데이터 작성
3. `registry.json` 의 `items` 배열에 참조 추가
4. `tests/registry-items.test.ts` 가 자동 검증
