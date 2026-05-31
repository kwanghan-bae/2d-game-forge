# Cycle 895 Level-Designer Analysis

## 검증 결과
1. **fight 226-274 dead zone**: ✅ 해결. 선택형 밀도 2× 증가 (1.47→2.94회/49 fights)
2. **Last Stand decline EV**: ✅ 개선. dominant strategy → 상황의존적 선택 (HP<40% decline 우위, HP>80% accept 우위)
3. **fight 501-600 밀도**: ⚠️ 자동형 이벤트 충분하나 선택형 이벤트 0 (choice desert)
4. **Wandering Merchant 500 확장**: ✅ 401-500 선택형 밀도 +3%p 기여

## 수치 제안
| param | 현재 | 제안 | 이유 |
|---|---|---|---|
| WANDERING_MERCHANT_MAX_FIGHTS | 500 | 575 | fight 501-575 choice desert 해소 |
| MERCENARY_OFFER_MAX_FIGHTS | 275 | 290 | Veteran's Trial과 15-fight overlap |
| BUFF_STACK_CAP | 1.65 | 유지 | headroom 1.5% 이나 의도된 설계 |

## 봉인/Outlier
- fight 501-600 choice desert: Last Stand P(미소진@500) = 0.6%
- BUFF_STACK_CAP headroom: veteran_agg(1.25)×lastStand(1.30)=1.625 vs cap 1.65 (1.5% 여유)
