# `@forge/create-game` CLI 계약 스케치

> **상태**: Design sketch, 2026-04-22
> **구현 상태**: **유보 중** — 착수 조건 ([Forge-UI Opus 재설계 스펙](./2026-04-22-forge-ui-opus-redesign-spec.md#43-구현-착수-조건)) 미충족.

본 문서는 `@forge/create-game` CLI 의 기대 동작을 명시한다. 게임 #2 가 실존하고 inflation-rpg 와
공통 scaffold 패턴이 3 개 이상 드러날 때 이 문서를 기반으로 구현 스펙을 작성한다.

## 1. 호출 규약

```bash
pnpm dlx @forge/create-game <name> [options]
```

### 1.1. 필수 인자

- `<name>` — 게임 워크스페이스 이름. `@forge/game-<name>` 로 등록. kebab-case 권장.

### 1.2. 옵션 플래그

| 플래그 | 기본값 | 의미 |
| --- | --- | --- |
| `--theme=<name>` | `modern-dark-gold` | 초기 테마 registry item |
| `--components=<a,b,c>` | `forge-screen,forge-button,forge-panel` | 초기 UI 컴포넌트 set |
| `--genre=<name>` | (없음) | genre-core 패키지 의존성 자동 추가 (예: `rpg`, `idle`, `puzzle`) |
| `--engine=<name>` | (없음) | 엔진 의존성 추가 (`phaser`, `pixi`, 등) |
| `--port=<number>` | 자동 할당 | dev 서버 포트 |

## 2. 동작 순서

1. **Preflight 검증**
   - `<name>` 이 pnpm workspace 규칙에 맞는지 확인
   - `games/<name>/` 이 이미 존재하지 않는지 확인
   - `pnpm` 이 설치되어 있는지 확인

2. **디렉토리 복제**
   - [CONTRIBUTING §14](../../CONTRIBUTING.md#14-canonical-forge-app-디렉토리-구조) 의 canonical 구조 템플릿을 `games/<name>/` 에 복제
   - 템플릿 내부 placeholder (`{{GAME_NAME}}`, `{{PORT}}`) 치환

3. **package.json 생성**
   - §14.1 스크립트 + §14.2 최소 deps
   - `--engine=phaser` 시 `"phaser": "^3.90.0"` 추가
   - `--genre=rpg` 시 `"@forge/2d-rpg-core": "workspace:^"` 추가 (해당 패키지 존재 시)

4. **registry 소스 복사 실행**
   - **현재 방식**: 수동 `cp` 명령을 CLI 가 래핑하여 `packages/registry/src/...` → `games/<name>/src/...` 복사
   - shadcn CLI 의 `file:` 경로 지원이 추가되면 `pnpm dlx shadcn@latest add file:...` 로 전환 고려
   - 복사 대상: 테마 CSS 1 개 + 선택된 컴포넌트 각 .tsx + lib/utils.ts (중복 제거)

5. **dev-shell 등록**
   - [`apps/dev-shell/src/lib/registry.ts`](../../../apps/dev-shell/src/lib/registry.ts) 와
     [`registry.server.ts`](../../../apps/dev-shell/src/lib/registry.server.ts) 에 새 게임 엔트리 자동 추가
   - `apps/dev-shell/tsconfig.json` 과 `next.config.ts` 의 cross-workspace alias 도 갱신 (Layer B 에서 확인된 요구사항)
   - 수동 편집 후 커밋 제안 or 자동 적용

6. **pnpm install**
   - 루트에서 `pnpm install` 실행 → 새 워크스페이스 심볼릭 링크 생성

7. **smoke 실행**
   - `pnpm --filter @forge/game-<name> typecheck` 통과 확인
   - `pnpm --filter @forge/game-<name> test` (0 테스트여도 0 exit)

## 3. 산출물 검증

CLI 완료 후 다음이 모두 성립해야 한다:

- `pnpm --filter @forge/game-<name> dev` 로 dev 서버 기동 가능
- `pnpm lint` 0 exit (새 게임이 boundaries v5 의 `game` element 로 인식)
- 포털 `http://localhost:3000` 에서 새 게임이 목록에 나타남

## 4. 기각된 설계 대안

| 대안 | 기각 사유 |
| --- | --- |
| Yeoman generator | pnpm workspace 생태계와 어색함, 의존성 무거움 |
| Turbo의 `turbo gen` | Turborepo 종속성 강화, 유연성 낮음 |
| Git template repo | 매 업데이트마다 복제 내용 drift, 유지보수 부담 |
| 대화형 wizard (prompts) | 초기엔 플래그 기반으로 충분, 나중에 추가 가능 |
| shadcn CLI `file:` 경로 의존 | 2026-04 기준 미지원 — 자체 cp 로직 필요 |

## 5. 미정 항목

- CLI 실행 시 업데이트된 `apps/dev-shell` 등록 자동화 범위 — server+client+alias 전부 자동? 아니면 수동 편집 안내만?
- 테마 2 개 이상을 `--theme=a,b` 형태로 add 가능한지 — 현재는 1 개만 전제
- 초기 smoke 테스트 템플릿 내용 — 게임 엔진별로 다를 것
- 실패 시 rollback — 중간 실패 시 `games/<name>/` 디렉토리 삭제할지 여부
- shadcn CLI 가 `file:` 경로 지원 추가 시 복사 로직 교체 여부

위 항목들은 실제 구현 스펙 작성 시점에 확정한다.

## 6. 구현 착수 조건 (재인용)

본 CLI 실제 구현은 다음 조건이 모두 충족될 때 착수:

- 게임 #2 가 실존 (별도 워크스페이스로 존재)
- inflation-rpg 와 게임 #2 사이에 **공통 scaffold 패턴이 3 개 이상** 실제 나타남
- 두 게임이 Layer A 의 registry 를 각각 소비하며 공통 병목이 식별됨

조건 미충족 상태에서 구현 착수는 [CLAUDE.md](../../../CLAUDE.md#1-3의-규칙--구현-코드는-게임-2-가-실제-쓰기-전까지-승격-금지) "3의 규칙" 위반.
