# Task 6 검증 보고

- 검증일: 2026-09-12 (Asia/Seoul)
- 대상 worktree: `/Users/joel/Desktop/git/2d-game-forge/.worktrees/village-domain-modules`
- 검증 기준 HEAD: `44938ccbc57749cb7021185958eba8c47e374324`
- 변경 범위: 네 개 direct-module 테스트, `villageDomain.test.ts`의 저장/복구·façade 호환 테스트, façade boundary 테스트, `domain.ts` compatibility re-export façade

## Coverage 보존

기준 HEAD의 focused suite와 staged 변경을 각각 대상 worktree의 동일 명령으로 실행했다.

```text
$ pnpm --filter @forge/game-inflation-rpg exec vitest run src/village/domain/__tests__ src/village/__tests__/villageDomain.test.ts

 RUN  v4.1.4 /private/tmp/task6-baseline-target.CKgU0J/games/inflation-rpg


 Test Files  2 passed (2)
      Tests  181 passed (181)
   Start at 17:58:41
   Duration  553ms (transform 321ms, setup 93ms, import 492ms, tests 69ms, environment 157ms)
```

```text
$ pnpm --filter @forge/game-inflation-rpg exec vitest run src/village/domain/__tests__ src/village/__tests__/villageDomain.test.ts

 RUN  v4.1.4 /Users/joel/Desktop/git/2d-game-forge/.worktrees/village-domain-modules/games/inflation-rpg


 Test Files  6 passed (6)
      Tests  182 passed (182)
   Start at 17:59:57
   Duration 635ms (transform 797ms, setup 320ms, import 1.05s, tests 92ms, environment 769ms)

[exit 0]
```

정적 test declaration/`expect` count 대조 결과:

```text
original test declarations: 150
current test declarations: 151
original expect calls: 669
current expect calls: 670
titles only in current: ["it('does not allow production domain modules to import the façade'"]
titles only in original: []
```

기존 181개 실행 테스트는 유지되고 façade import scan 1개가 추가되어 182개가 되었다. 기존 test title/assertion은 누락되지 않았다.

## Typecheck 및 의존성 경계

```text
$ pnpm --filter @forge/game-inflation-rpg typecheck

> @forge/game-inflation-rpg@0.1.0 typecheck /Users/joel/Desktop/git/2d-game-forge/.worktrees/village-domain-modules/games/inflation-rpg
> tsc --noEmit

[exit 0]
```

```text
$ pnpm circular

> 2d-game-forge@0.1.0 circular /Users/joel/Desktop/git/2d-game-forge/.worktrees/village-domain-modules
> madge --circular --extensions ts,tsx --ts-config tsconfig.madge.json apps packages games

- Finding files
Processed 522 files (1.8s) (5 warnings)


✔ No circular dependency found!
[exit 0]
```

production `src/village/domain/` 파일의 façade import scan 위반은 없었고, `domain.ts`는 direct module export만 제공하는 compatibility re-export façade로 남아 있다.

## Diff 및 보호 대상

```text
$ git diff --check
[exit 0]

$ git diff --cached --check
[exit 0]
```

보호 대상 hash:

```text
c3e64b5c7c3d95d58c6616e285bef3d14aad3293  games/inflation-rpg/src/systems/paradoxSpiral.ts
b2a380205c329582ade87ca9b029e2910b71ac77  games/inflation-rpg/src/systems/paradoxSpiral.test.ts
a0c017ee6b300494a5a31c424ad0aa939b320c4e  games/inflation-rpg/src/systems/paradoxSpiralBalance.test.ts
```

`games/inflation-rpg/src/systems/`의 보호 파일과 사용자 `output/`, `tmp/`에는 변경이 없다.
