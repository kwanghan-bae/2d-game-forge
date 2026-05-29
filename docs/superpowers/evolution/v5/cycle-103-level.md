# Cycle 103 — 레벨디자이너 평가

## 핵심 발견
- inflationCurve.ts가 정의한 6개 파워곡선 함수를 AutoBattleController가 전혀 사용하지 않음
- 전투가 선형(heroLv*2, enemyLv*20, heroLv*3)으로 계산됨
- Hero HP compound 5%/lv → lv30+ 무적
- EXP 감속곡선(lv^-0.3) → inflation 정체성 위배

## #1 개선안
AutoBattleController.ts에서 inflationCurve.ts의 함수들을 wire:
- heroAtkAtLevel(), enemyHpAtLevel(), enemyAtkAtLevel()
- heroHpMaxAtLevel(), expGainForKill(), expRequiredForLevel()

## wire 후 예상
- expGain/expReq = lv^0.6 → 가속 레벨링 (진정한 inflation)
- hero HP power-law(0.7) vs enemy ATK power-law(0.8) → 점진적 위험 증가
