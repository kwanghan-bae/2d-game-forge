# Phase 5a-1 — 원스토어 IAP V21 Native Wire (real-device manual-QA session)

## 한 줄 요약

Phase 5 의 Kotlin compile-only stub (`call.reject(...)`) 을 실제 원스토어 IAP
SDK V21 의 Builder/Listener 패턴으로 wire. 실 Android 기기 + 원스토어 sandbox
계정이 필수라 manual QA 세션에 같이 진행하는 sub-phase.

## 배경

Phase 5 plan 작성 시 spec 이 V19/V20-era API 패턴 (단순 constructor + 3-method
`ServiceConnectionListener` + lambda callback) 가정. T11 Gradle compile 시 R1
risk (native learning curve) 가 실현되어 다음 발견:

- Maven coordinate: `com.onestorecorp.sdk:sdk-iap:21.04.00` (Phase 5 plan 정확)
- **실 패키지 root**: `com.gaa.sdk.iap.*` (NOT `com.onestore.iap.api.*`)
- API 패턴: Google Play Billing 7-style **Builder + listener interface**
- `ServiceConnectionListener` → `PurchaseClientStateListener` (2 methods, not 3)
- `queryProductsAsync` → `queryProductDetailsAsync(params, listener)`
- `launchPurchaseFlowAsync` → `launchPurchaseFlow(activity, purchaseFlowParams)` (sync, not async)
- `consumeAsync` 와 `acknowledgeAsync` 가 별개 listener 사용

V21 wire 는 compile 통과만으로는 의미 없음 — 실 결제 flow 동작 검증이 본질.
실 기기 + 원스토어 앱 설치 + sandbox 계정 + 사인된 APK 가 필요하며 Claude
session 에서 수행 불가. 따라서 Phase 5 는 **monetization shell** 까지 완성하고,
실 native wire 는 별도 Phase 5a-1 로 분리.

## Phase 5 종료 시점의 상태

- `games/inflation-rpg/native/onestore-iap/android/src/main/java/com/forge/onestoreiap/OnestoreIapPlugin.kt`
  — V21 실 imports 사용한 compile-only stub. 5 `@PluginMethod` 모두 `call.reject`
- `:forge-inflation-rpg-native-onestore-iap:compileDebugKotlin` — PASS
- Web stub (`web.ts`) — fully functional, IapManager/IapShop UI/e2e 모두 동작

## Scope (Phase 5a-1)

### IN

- `OnestoreIapPlugin.kt` 의 `initialize()` 를 실 `PurchaseClient.Builder` + connect 으로 wire
- `queryProducts()` 를 `queryProductDetailsAsync` 로 wire
- `purchase()` 를 `launchPurchaseFlow` 로 wire
- `acknowledge()` 를 `acknowledgeAsync` 와 `consumeAsync` 분기 (non-consumable vs consumable) 로 wire
- `restorePurchases()` 를 `queryPurchasesAsync` 로 wire
- `PurchasesUpdatedListener` 를 통한 `purchaseUpdated` event 발화
- 사용자 manual QA: 실 기기에서 결제 flow / restore / refund / 환불 / 네트워크 끊김 동작 검증
- 원스토어 dashboard 에 4 IAP 품목 등록 (id 일치)

### OUT

- TS contract 변경 (Phase 5 이미 정의)
- Web stub 변경 (Phase 5 이미 충실)
- 게임 UI / persist / Privacy / E debt — Phase 5 이미 완료
- iOS StoreKit — Phase 5c
- Google Play Billing — Phase 5b

## V21 SDK API 매핑

추출된 AAR (`~/.gradle/caches/modules-2/files-2.1/com.onestorecorp.sdk/sdk-iap/21.04.00/.../sdk-iap-21.04.00.aar`)
의 `classes.jar` 검사 결과 확인된 V21 클래스들:

| 용도 | 클래스 / 메서드 |
|---|---|
| Main client | `com.gaa.sdk.iap.PurchaseClient` (Builder pattern) |
| Builder | `PurchaseClient.Builder` |
| Connection state | `PurchaseClient.ConnectionState` (DISCONNECTED, CONNECTING, CONNECTED, CLOSED) |
| Product type | `PurchaseClient.ProductType` (IN_APP, AUTO) |
| Response code | `PurchaseClient.ResponseCode` (RESULT_OK, RESULT_USER_CANCELED, ...) |
| Connection listener | `PurchaseClientStateListener` (`onSetupFinished(IapResult)`, `onServiceDisconnected()`) |
| Purchase update listener | `PurchasesUpdatedListener` (`onPurchasesUpdated(IapResult, List<PurchaseData>?)`) |
| Product info | `ProductDetail` (productId, type, title, description, price, priceAmountMicros, priceCurrencyCode 등) |
| Product details query | `queryProductDetailsAsync(ProductDetailsParams, ProductDetailsListener)` |
| Product details params | `ProductDetailsParams.Builder().setProductIdList(...).setProductType(...).build()` |
| Product details listener | `ProductDetailsListener` (`onProductDetailsResponse(IapResult, List<ProductDetail>?)`) |
| Purchase flow | `launchPurchaseFlow(Activity, PurchaseFlowParams)` |
| Purchase flow params | `PurchaseFlowParams.Builder().setProductId(...).setProductType(...).build()` |
| Purchase data | `PurchaseData` (productId, purchaseToken, purchaseTime, acknowledged 등) |
| Purchase state | `PurchaseData.PurchaseState`, `PurchaseData.AcknowledgeState`, `PurchaseData.RecurringState` |
| Query purchases | `queryPurchasesAsync(ProductType, PurchaseDataListener? — check exact name)` |
| Acknowledge listener | `AcknowledgeListener` (`onAcknowledgeResponse(IapResult)`) |
| Acknowledge params | `AcknowledgeParams.Builder().setPurchaseData(PurchaseData).build()` |
| Acknowledge | `acknowledgeAsync(AcknowledgeParams, AcknowledgeListener)` |
| Consume listener | `ConsumeListener` (`onConsumeResponse(IapResult, PurchaseData?)`) |
| Consume params | `ConsumeParams.Builder().setPurchaseData(PurchaseData).build()` |
| Consume | `consumeAsync(ConsumeParams, ConsumeListener)` |
| Result wrapper | `IapResult` (isSuccess, message, responseCode 등) |
| Helper | `IapHelper` (utility) |

## 작업 단위 (~6-9 task)

### T1: Refactor stub to PurchaseClient builder

`initialize()` 를 다음 패턴으로:

```kotlin
private val purchasesUpdatedListener = PurchasesUpdatedListener { result, purchases ->
    purchases?.forEach { p ->
        val obj = JSObject()
            .put("productId", p.productId)
            .put("purchaseToken", p.purchaseToken)
            .put("purchaseTime", p.purchaseTime)
            .put("acknowledged", p.acknowledgeState == PurchaseData.AcknowledgeState.ACKNOWLEDGED)
        emitPurchaseUpdated(obj)
    }
}

@PluginMethod
fun initialize(call: PluginCall) {
    val key = call.getString("licenseKey") ?: run {
        call.reject("licenseKey is required")
        return
    }
    val act = activity ?: run {
        call.reject("activity unavailable")
        return
    }
    if (purchaseClient == null) {
        purchaseClient = PurchaseClient.newBuilder(act)
            .setListener(purchasesUpdatedListener)
            .setBase64PublicKey(key)
            .build()
    }
    purchaseClient?.startConnection(object : PurchaseClientStateListener {
        override fun onSetupFinished(result: IapResult) {
            if (result.isSuccess) call.resolve()
            else call.reject("connect failed: ${result.message}")
        }
        override fun onServiceDisconnected() {
            // optional reconnect logic
        }
    })
}
```

### T2: queryProducts → queryProductDetailsAsync

```kotlin
@PluginMethod
fun queryProducts(call: PluginCall) {
    val client = purchaseClient ?: run { call.reject("not initialized"); return }
    val ids = ...  // parse from call.getArray("productIds")
    val params = ProductDetailsParams.newBuilder()
        .setProductIdList(ids)
        .setProductType(PurchaseClient.ProductType.IN_APP)
        .build()
    client.queryProductDetailsAsync(params, object : ProductDetailsListener {
        override fun onProductDetailsResponse(result: IapResult, products: List<ProductDetail>?) {
            // map to JSObject array, call.resolve
        }
    })
}
```

### T3: purchase → launchPurchaseFlow

```kotlin
@PluginMethod
fun purchase(call: PluginCall) {
    val client = purchaseClient ?: run { call.reject("not initialized"); return }
    val productId = call.getString("productId") ?: run { call.reject("productId required"); return }
    val act = activity ?: run { call.reject("activity unavailable"); return }
    val params = PurchaseFlowParams.newBuilder()
        .setProductId(productId)
        .setProductType(PurchaseClient.ProductType.IN_APP)
        .build()
    // launchPurchaseFlow returns the launch result synchronously, but the
    // purchase event itself arrives via PurchasesUpdatedListener (set in initialize).
    // Resolve the call optimistically; emitPurchaseUpdated will fire the real result.
    client.launchPurchaseFlow(act, params)
    call.resolve(JSObject().put("status", "launched"))  // or hold the call and resolve in listener
}
```

> **Design decision needed in T3:** `launchPurchaseFlow` is fire-and-forget; the
> actual result comes through `PurchasesUpdatedListener.onPurchasesUpdated`. The
> Phase 5 TS contract expects `purchase()` to return a `PurchaseResult`. Either:
> (a) hold the `PluginCall` and resolve it in the listener (must correlate by productId), or
> (b) resolve immediately with status='launched' and have TS side rely on the
> `purchaseUpdated` event listener for the actual result. (b) is simpler but
> requires Phase 5 TS code change (small — IapManager already listens for events).
> Recommend (a) — closer to current TS contract.

### T4: acknowledge → split into acknowledgeAsync / consumeAsync

```kotlin
@PluginMethod
fun acknowledge(call: PluginCall) {
    val client = purchaseClient ?: run { call.reject("not initialized"); return }
    val token = call.getString("purchaseToken") ?: run { call.reject("token required"); return }
    val productId = call.getString("productId") ?: ""  // need productId to determine type
    val isConsumable = productId.startsWith("crack_stone_pack_")

    // Construct PurchaseData from token — or pass through from purchaseUpdated event
    // The SDK requires PurchaseData object, not just a token string.
    // This means TS contract may need to pass the full PurchaseData payload to acknowledge.

    if (isConsumable) {
        val params = ConsumeParams.newBuilder().setPurchaseData(...).build()
        client.consumeAsync(params, ConsumeListener { result, _ ->
            if (result.isSuccess) call.resolve()
            else call.reject("consume failed: ${result.message}")
        })
    } else {
        val params = AcknowledgeParams.newBuilder().setPurchaseData(...).build()
        client.acknowledgeAsync(params, AcknowledgeListener { result ->
            if (result.isSuccess) call.resolve()
            else call.reject("acknowledge failed: ${result.message}")
        })
    }
}
```

> **TS contract change needed**: `acknowledge` currently accepts only
> `{ purchaseToken: string }`. V21 requires the full `PurchaseData` object.
> Either (a) pass the full PurchaseData from TS (simplest), or (b) cache
> PurchaseData by token in the plugin (kotlin-side state). Recommend (a) —
> requires updating `IapManager.purchase` to pass purchase data through.

### T5: restorePurchases → queryPurchasesAsync

Similar pattern. Listener exact name (`PurchaseDataListener` or other) verified at impl time.

### T6: Real-device manual QA

Following Phase 5 spec §"Manual QA checklist":

- Rewarded ad (AdMob)
- Banner ad
- 광고 제거 IAP 구매 — banner 사라지는지, rewarded auto-grant 동작하는지
- 균열석 IAP 3 tier 각 구매 → 정확한 수량 (10/60/150)
- restorePurchases 후 ad_free 복구
- 환불 처리 — 원스토어 dashboard 에서 환불 → 부팅 후 adFreeOwned=false 자동
- 네트워크 끊김 → 사용자 안내 + 크래시 없음
- 원스토어 앱 미설치 → 상점 진입 시 적절한 안내

### T7: External 사용자 작업 (Phase 5 spec 의 §"출시-준비 외부 작업" 참조)

- 원스토어 개발자 계정 등록 + 앱 등록
- dashboard 에 4 IAP 품목 등록 (id 일치)
- 균열석 IAP 실 가격 결정
- 라이선스 키 발급 → env 또는 capacitor config 주입
- AdMob 계정 + 실 광고 unit ID
- 개인정보처리방침 법무 검토
- 사인 키 + 사인된 APK 빌드
- 원스토어 심사 제출

### T8: Phase 5 → 5a-1 통합 검증 회귀

- Phase 5 의 Vitest 711 + 새로운 25 = 736 모두 그대로 PASS
- e2e (web project) 그대로 동작
- 실 기기에서 Phase 5 의 web stub 이 native 로 자연 전환되는지 (Capacitor 의 platform 분기)

### T9: `phase-5a1-complete` tag + main merge

## Known risks (Phase 5a-1 specific)

- **R1.** SDK API 의 추가 drift — V21 patch (21.04.x) 별로 listener interface 시그니처 미세 변경 가능
- **R2.** TS contract 변경 필요 — acknowledge() 가 PurchaseData 전체를 요구. Phase 5 의 IapManager 도 미세 조정 필요
- **R3.** PurchasesUpdatedListener 의 비동기 특성과 PluginCall hold 패턴 — Capacitor lifecycle 과 충돌 가능 (Activity restart 시 call 손실)
- **R4.** 원스토어 sandbox 환경의 결제 flow 가 production 과 differ — 사용자가 production submission 직전 추가 검증 필요

## Definition of Done (Phase 5a-1)

- All 5 `@PluginMethod` 메서드 real V21 SDK call
- `./gradlew assembleDebug` 성공 (이미 Phase 5 의 cp1 에서 통과한 상태에서 변경)
- 실 Android 기기 + 원스토어 sandbox 계정으로 결제 / restore / 환불 flow 검증 (사용자 작업)
- TS contract 변경 필요 시 IapManager / MonetizationService 동기 갱신
- Phase 5 의 712-736 Vitest 회귀 0
- `phase-5a1-complete` 태그

## 참고

- AAR 추출 경로: `~/.gradle/caches/modules-2/files-2.1/com.onestorecorp.sdk/sdk-iap/21.04.00/.../sdk-iap-21.04.00.aar`
- 원스토어 개발자 문서: https://onestore-dev.gitbook.io/dev/eng/tools/billing/v21/sdk
- 원스토어 GitHub: https://github.com/ONE-store/inapp-sdk (Note: source code 미포함, README only)
- Phase 5 spec: `docs/superpowers/specs/2026-05-16-phase-5-monetization-design.md`
- Phase 5 plan: `docs/superpowers/plans/2026-05-16-phase-5-monetization.md`
