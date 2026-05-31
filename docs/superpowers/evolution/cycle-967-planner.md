# Cycle 967 Planner — C968-C970 Roadmap

## C968 [system]: VC remaining duration getter + buff name clarity
- getVeteransChallengeExpRemaining / AtkRemaining 추가
- BuffCatalog 'vc_atk' 이름 변경: '도전 위안' → '도전의 대가'

## C969 [structure]: MidGameEventResolver → EventHandler[] 리팩터
- 13-event if/else chain → priority-sorted handler 배열
- EventHandler interface (canHandle, handle, priority, name)
- LOC Δ: -55 (prod), +5 (test)

## C970 [balance]: VC priority 상향 + DPS invariant
- VC priority를 12→7로 상향 (one-shot > repeatable 원칙)
- VC DPS ratio invariant test 추가
