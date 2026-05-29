# Cycle 107 Result

**Category**: system (DRY)
**Change**: Wire numberFormat.formatCompact to BattleScene
**Commit**: b77e162

Replace 2 inline number-format blocks (showFloatingDamage, showBattleStats) with shared formatCompact().
BattleScene 1151→1142 lines. Dead code reduction: numberFormat.ts now has callers.
