# Cycle 651 협의

## 참여 에이전트

- **game-critic**: Fun 3/10, Agency 2/10. 70+ multiplier→단일 cap 10× = 90%가 dead weight. 플레이어 의사결정 0. 시스템이 invisible — 보이지 않으면 배울 수 없다.
- **level-designer**: ATK cap 10×는 inflation 정체성 위배. 초반 lv1 hero 3턴사망 = onboarding 실패. cap을 prestige 연동(10+prestige×5)으로 점진 해방 제안. 개별 nerf가 이중/삼중 적용됨.
- **game-planner**: 30사이클 로드맵 제시. 구조 추출(→800줄) + 플레이어 선택 시스템 + UI 피드백을 병행. EncounterEngine 2229→780줄 trajectory.
- **ui-ux-designer**: forge-ui 미사용(100% inline style). comboDisplay/momentumDisplay가 set만 되고 render 안 됨. ActiveBuffBar + DamageFloater가 "게임이 살아있음"을 느끼게 할 핵심. OverworldRunner 700줄 god-component.
- **qa-engineer**: combo decay 5경로 중 1개만 테스트됨. killMilestone cap 미테스트. OverworldRunner 3실패 수정 후 extraction 착수 필요. Characterization snapshot(seed=42)으로 추출 안전망 확보.

## 합의 사항

### 다음 3사이클 (C651-C653)

1. **[구조] C651**: Characterization snapshot test 추가 — seed=42로 100 encounters 실행 결과를 golden-master로 저장. combo 5경로 unit test + killMilestone cap test 추가.
2. **[구조] C652**: RewardCalculator 추출 (~220줄 post-win rewards → `src/overworld/encounter/RewardCalculator.ts`). EncounterContext 타입 도입. golden-master가 추출 전후 동일함을 검증.
3. **[UI] C653**: comboDisplay/momentumDisplay를 HUD에 실제 렌더 + forge-gauge 활용. CombatOverlay fontSize 12px 이상으로 수정. (가장 빠르게 "게임이 살아있음"을 느끼게 하는 quick win)

### 우선순위 변경
- 밸런스 작업 일시 중단 (C630-C650에서 과도하게 진행됨)
- 구조 추출 + UI 가시화를 우선
- ATK cap 변경(10→prestige 연동)은 구조 추출 완료 후 검토 (현재 변경 시 golden-master 무효화)

### 거부된 제안

| 제안 | 거부 사유 |
|------|----------|
| ATK cap 즉시 50으로 상향 (level-designer) | 구조 추출 전에 밸런스 대변경은 리스크. 추출 후 C660대에서 재논의 |
| ENEMY_BASE_HP 60→48 (level-designer) | death rate 테스트에 영향. cap 변경과 함께 통합 조정 예정 |
| CombatResolver 즉시 추출 (game-planner C666) | 가장 결합도 높은 부분 — RewardCalc/ExpCalc/GoldCalc 먼저 |
| OverworldRunner 3실패 즉시 수정 (qa) | 당장 extraction 대상 아닌 파일. 별도 사이클에서 처리 |
| StanceSystem 즉시 도입 (game-planner C667) | 구조 미분리 상태에서 새 시스템 추가는 v6 실수 반복 |

## 수치 스냅샷
- EncounterEngine.ts: 2229줄
- 테스트: 65 passed (EncounterEngine) / 1882 total
- Death rate (sim): non-zero (테스트 통과 중)
- Pre-existing failures: 6 (별도 처리)
