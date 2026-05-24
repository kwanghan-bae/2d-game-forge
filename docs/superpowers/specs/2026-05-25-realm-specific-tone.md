# Realm-Specific Narrative Tone Spec

## 한 줄
NarrationVariants 의 age tier tone 이후, realm 별 특유 어휘 layer 추가. base/sea/volcano/underworld/heaven/chaos 의 narrative 분위기 차별화.

## 현재 상태
- Age tier tone: cycle 35-42 6 tier × 4 variant 모두 cover
- Realm tone: REALM_ENTER_VARIANTS 만 cover (진입 narrative)
- 배틀/levelUp/drop 등의 realm-specific tone 부재

## 제안
- 새 `realmTone(text, realm, seed)` helper
- 각 realm 의 특유 어휘:
  - base: "들판에서" / "바람에 흔들리며"
  - sea: "파도 곁에서" / "심해의 침묵 속"
  - volcano: "용암의 열기 속" / "검은 재 위에서"
  - underworld: "황천의 그림자 속" / "차가운 손 사이"
  - heaven: "빛의 다리 위" / "구름의 결 사이"
  - chaos: "혼돈의 중심에서" / "시간을 잊은 곳"

## 위치 (구현 시)
- narrationVariants.ts 의 ageTone 처럼 dispatcher
- 모든 9 channel wrapper 에서 realm prop 전달 필요

## Scope
- Type 변경 (battle/levelUp/... 등이 realm prop 받아야 함)
- ctx 객체 모든 곳 update
- Test fixture update

## 자원 추정
- 중간 scope — typecheck/lint 안정성 위해 cycle 60+ 의 검토 권장
