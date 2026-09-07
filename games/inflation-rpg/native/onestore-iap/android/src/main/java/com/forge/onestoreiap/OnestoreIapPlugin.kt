package com.forge.onestoreiap

import android.os.Handler
import android.os.Looper
import com.gaa.sdk.iap.AcknowledgeListener
import com.gaa.sdk.iap.AcknowledgeParams
import com.gaa.sdk.iap.ConsumeListener
import com.gaa.sdk.iap.ConsumeParams
import com.gaa.sdk.iap.IapResult
import com.gaa.sdk.iap.ProductDetail
import com.gaa.sdk.iap.ProductDetailsListener
import com.gaa.sdk.iap.ProductDetailsParams
import com.gaa.sdk.iap.PurchaseClient
import com.gaa.sdk.iap.PurchaseClientStateListener
import com.gaa.sdk.iap.PurchaseData
import com.gaa.sdk.iap.PurchaseFlowParams
import com.gaa.sdk.iap.PurchasesUpdatedListener
import com.gaa.sdk.iap.QueryPurchasesListener
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Capacitor bridge for ONE store IAP SDK V21.
 *
 * The SDK reports the final purchase through PurchasesUpdatedListener. The
 * purchase PluginCall therefore remains pending after a successful launch and
 * is resolved only when a verified PurchaseData arrives. PurchaseData is
 * cached by token so the later acknowledge/consume call can use the SDK model
 * instead of trying to reconstruct it from a token string.
 */
@CapacitorPlugin(name = "OnestoreIap")
class OnestoreIapPlugin : Plugin() {

    private companion object {
        const val NATIVE_OPERATION_TIMEOUT_MS = 60_000L
    }

    private data class PendingPurchase(val productId: String, val call: PluginCall)
    private data class PendingNativeCall(val call: PluginCall, val timeout: Runnable)

    private var purchaseClient: PurchaseClient? = null
    private var licenseKey: String? = null
    private var connected = false
    private var connectionInFlight = false
    private var initializeTimeout: Runnable? = null
    private val pendingPurchase = PendingPurchaseSlot<PendingPurchase>()
    private var pendingPurchaseTimeout: Runnable? = null
    private val purchaseTimeoutHandler = Handler(Looper.getMainLooper())
    private val initializeCalls = mutableListOf<PluginCall>()
    private val pendingNativeCalls = mutableListOf<PendingNativeCall>()
    private val purchaseDataByToken = mutableMapOf<String, PurchaseData>()

    private val purchasesUpdatedListener = object : PurchasesUpdatedListener {
        override fun onPurchasesUpdated(result: IapResult, purchases: List<PurchaseData>?) {
            if (!result.isSuccess) {
                resolvePendingPurchaseFailure(result)
                return
            }

            val purchased = purchases.orEmpty().filter { purchase ->
                purchase.getPurchaseState() == PurchaseData.PurchaseState.PURCHASED
                    && purchase.getProductId().isNotBlank()
                    && purchase.getPurchaseToken().isNotBlank()
            }
            purchased.forEach { purchase ->
                rememberPurchase(purchase)
                val purchaseObject = purchaseToJs(purchase)
                emitPurchaseUpdated(purchaseObject)

                if (pendingPurchase.peekProductId() == purchase.getProductId()) {
                    val response = JSObject()
                    response.put("status", "success")
                    response.put("purchase", purchaseObject)
                    pendingPurchase.takeIfMatches(purchase.getProductId())?.call?.resolve(response)
                }
            }

            if (purchased.isEmpty()) {
                if (pendingPurchase.hasPending()) {
                    takePendingPurchase()?.call?.resolve(failedPurchase("구매 결과를 확인하지 못했습니다.", result))
                }
            } else {
                val pendingProductId = pendingPurchase.peekProductId()
                if (pendingProductId != null && purchased.none { it.getProductId() == pendingProductId }) {
                    takePendingPurchase()?.call?.resolve(failedPurchase("요청한 상품의 구매 결과를 확인하지 못했습니다.", result))
                }
            }
        }
    }

    @PluginMethod
    fun initialize(call: PluginCall) {
        val key = call.getString("licenseKey")?.trim()
        if (key.isNullOrEmpty()) {
            call.reject("licenseKey is required")
            return
        }
        val configuredKey = licenseKey
        if (configuredKey != null && configuredKey != key) {
            call.reject("licenseKey cannot change after initialization")
            return
        }
        licenseKey = key

        if (connected) {
            call.resolve()
            return
        }

        initializeCalls += call
        if (connectionInFlight) return
        connectionInFlight = true

        try {
            if (purchaseClient == null) {
                purchaseClient = PurchaseClient.newBuilder(context)
                    .setListener(purchasesUpdatedListener)
                    .setBase64PublicKey(key)
                    .build()
            }
            purchaseClient?.startConnection(object : PurchaseClientStateListener {
                override fun onSetupFinished(result: IapResult) {
                    clearInitializeTimeout()
                    connectionInFlight = false
                    connected = result.isSuccess
                    if (connected) resolveInitializeCalls() else rejectInitializeCalls(result)
                }

                override fun onServiceDisconnected() {
                    connected = false
                    if (connectionInFlight) {
                        clearInitializeTimeout()
                        connectionInFlight = false
                        rejectInitializeCalls("ONE store IAP service disconnected")
                    }
                    if (pendingPurchase.hasPending()) {
                        takePendingPurchase()?.call?.resolve(failedPurchase("ONE store IAP service disconnected"))
                    }
                }
            })
            if (connectionInFlight) scheduleInitializeTimeout()
        } catch (error: Exception) {
            clearInitializeTimeout()
            connectionInFlight = false
            connected = false
            rejectInitializeCalls(error.message ?: "ONE store IAP initialization failed")
        }
    }

    @PluginMethod
    fun queryProducts(call: PluginCall) {
        val client = requireClient(call) ?: return
        val productIdsArray = call.getArray("productIds")
        if (productIdsArray == null || productIdsArray.length() == 0) {
            call.reject("productIds is required")
            return
        }

        val productIds = mutableListOf<String>()
        try {
            for (index in 0 until productIdsArray.length()) {
                val productId = productIdsArray.getString(index).trim()
                if (productId.isNotEmpty()) productIds += productId
            }
        } catch (error: Exception) {
            call.reject(error.message ?: "productIds is invalid")
            return
        }
        if (productIds.isEmpty()) {
            call.reject("productIds is required")
            return
        }

        val params = ProductDetailsParams.newBuilder()
            .setProductIdList(productIds)
            .setProductType(PurchaseClient.ProductType.INAPP)
            .build()
        val pending = beginNativeCall(call, "상품 조회 응답 제한 시간이 지나 상품을 확인하지 못했습니다.")
        try {
            client.queryProductDetailsAsync(params, object : ProductDetailsListener {
                override fun onProductDetailsResponse(result: IapResult, products: List<ProductDetail>?) {
                    if (!finishNativeCall(pending)) return
                    if (!result.isSuccess) {
                        call.reject("queryProducts failed: ${result.getMessage()}", result.getResponseCode().toString())
                        return
                    }

                    val productArray = JSArray()
                    products.orEmpty().forEach { product -> productArray.put(productToJs(product)) }
                    val response = JSObject()
                    response.put("products", productArray)
                    call.resolve(response)
                }
            })
        } catch (error: Exception) {
            if (finishNativeCall(pending)) call.reject(error.message ?: "queryProducts failed")
        }
    }

    @PluginMethod
    fun purchase(call: PluginCall) {
        val client = requireClient(call) ?: return
        val productId = call.getString("productId")?.trim()
        if (productId.isNullOrEmpty()) {
            call.reject("productId is required")
            return
        }
        if (pendingPurchase.hasPending()) {
            call.reject("another purchase is already in progress")
            return
        }
        val currentActivity = activity
        if (currentActivity == null) {
            call.reject("activity unavailable")
            return
        }

        val params = PurchaseFlowParams.newBuilder()
            .setProductId(productId)
            .setProductType(PurchaseClient.ProductType.INAPP)
            .build()
        pendingPurchase.start(productId, PendingPurchase(productId, call))
        try {
            val launchResult = client.launchPurchaseFlow(currentActivity, params)
            if (!launchResult.isSuccess) {
                takePendingPurchase()?.call?.resolve(purchaseResult(launchResult))
                return
            }
            if (pendingPurchase.peekProductId() == productId) schedulePendingPurchaseTimeout(productId)
            // The final result is delivered by onPurchasesUpdated. Keeping the
            // call here prevents a successful dialog launch from being
            // mistaken for a completed and grantable purchase.
        } catch (error: Exception) {
            takePendingPurchase()?.call?.resolve(failedPurchase(error.message ?: "purchase launch failed"))
        }
    }

    @PluginMethod
    fun acknowledge(call: PluginCall) {
        val client = requireClient(call) ?: return
        val token = call.getString("purchaseToken")?.trim()
        if (token.isNullOrEmpty()) {
            call.reject("purchaseToken is required")
            return
        }
        val purchase = purchaseDataByToken[token]
        if (purchase == null) {
            call.reject("purchase data is unavailable; restore the purchase first")
            return
        }

        val pending = beginNativeCall(call, "구매 확인 응답 제한 시간이 지나 결제를 확정하지 못했습니다.")
        if (isConsumable(purchase.getProductId())) {
            val params = ConsumeParams.newBuilder().setPurchaseData(purchase).build()
            try {
                client.consumeAsync(params, object : ConsumeListener {
                    override fun onConsumeResponse(result: IapResult, ignoredPurchase: PurchaseData?) {
                        if (!finishNativeCall(pending)) return
                        if (result.isSuccess) call.resolve()
                        else call.reject("consume failed: ${result.getMessage()}", result.getResponseCode().toString())
                    }
                })
            } catch (error: Exception) {
                if (finishNativeCall(pending)) call.reject(error.message ?: "consume failed")
            }
        } else {
            val params = AcknowledgeParams.newBuilder().setPurchaseData(purchase).build()
            try {
                client.acknowledgeAsync(params, object : AcknowledgeListener {
                    override fun onAcknowledgeResponse(result: IapResult, ignoredPurchase: PurchaseData?) {
                        if (!finishNativeCall(pending)) return
                        if (result.isSuccess) call.resolve()
                        else call.reject("acknowledge failed: ${result.getMessage()}", result.getResponseCode().toString())
                    }
                })
            } catch (error: Exception) {
                if (finishNativeCall(pending)) call.reject(error.message ?: "acknowledge failed")
            }
        }
    }

    @PluginMethod
    fun restorePurchases(call: PluginCall) {
        val client = requireClient(call) ?: return
        val pending = beginNativeCall(call, "복원 응답 제한 시간이 지나 구매 내역을 확인하지 못했습니다.")
        try {
            client.queryPurchasesAsync(PurchaseClient.ProductType.INAPP, object : QueryPurchasesListener {
                override fun onPurchasesResponse(result: IapResult, purchases: List<PurchaseData>?) {
                    if (!finishNativeCall(pending)) return
                    if (!result.isSuccess) {
                        call.reject("restorePurchases failed: ${result.getMessage()}", result.getResponseCode().toString())
                        return
                    }

                    val purchaseArray = JSArray()
                    purchases.orEmpty()
                        .filter { purchase ->
                            purchase.getPurchaseState() == PurchaseData.PurchaseState.PURCHASED
                                && purchase.getProductId().isNotBlank()
                                && purchase.getPurchaseToken().isNotBlank()
                        }
                        .forEach { purchase ->
                            rememberPurchase(purchase)
                            purchaseArray.put(purchaseToJs(purchase))
                        }
                    val response = JSObject()
                    response.put("purchases", purchaseArray)
                    call.resolve(response)
                }
            })
        } catch (error: Exception) {
            if (finishNativeCall(pending)) call.reject(error.message ?: "restorePurchases failed")
        }
    }

    override fun handleOnDestroy() {
        clearInitializeTimeout()
        initializeCalls.forEach { it.reject("ONE store IAP plugin was destroyed") }
        initializeCalls.clear()
        cancelNativeCalls("ONE store IAP plugin was destroyed")
        takePendingPurchase()?.call?.reject("ONE store IAP plugin was destroyed")
        connectionInFlight = false
        purchaseClient?.endConnection()
        purchaseClient = null
        purchaseDataByToken.clear()
        connected = false
        super.handleOnDestroy()
    }

    private fun scheduleInitializeTimeout() {
        clearInitializeTimeout()
        val timeout = Runnable {
            initializeTimeout = null
            if (!connectionInFlight) return@Runnable
            connectionInFlight = false
            connected = false
            rejectInitializeCalls("ONE store IAP initialization timed out")
        }
        initializeTimeout = timeout
        purchaseTimeoutHandler.postDelayed(timeout, NATIVE_OPERATION_TIMEOUT_MS)
    }

    private fun clearInitializeTimeout() {
        initializeTimeout?.let { purchaseTimeoutHandler.removeCallbacks(it) }
        initializeTimeout = null
    }

    private fun beginNativeCall(call: PluginCall, message: String): PendingNativeCall {
        lateinit var pending: PendingNativeCall
        val timeout = Runnable {
            if (!pendingNativeCalls.remove(pending)) return@Runnable
            call.reject(message)
        }
        pending = PendingNativeCall(call, timeout)
        pendingNativeCalls += pending
        purchaseTimeoutHandler.postDelayed(timeout, NATIVE_OPERATION_TIMEOUT_MS)
        return pending
    }

    private fun finishNativeCall(pending: PendingNativeCall): Boolean {
        if (!pendingNativeCalls.remove(pending)) return false
        purchaseTimeoutHandler.removeCallbacks(pending.timeout)
        return true
    }

    private fun cancelNativeCalls(message: String) {
        val pending = pendingNativeCalls.toList()
        pendingNativeCalls.clear()
        pending.forEach {
            purchaseTimeoutHandler.removeCallbacks(it.timeout)
            it.call.reject(message)
        }
    }

    private fun schedulePendingPurchaseTimeout(productId: String) {
        pendingPurchaseTimeout?.let { purchaseTimeoutHandler.removeCallbacks(it) }
        val timeout = Runnable {
            if (pendingPurchase.peekProductId() != productId) return@Runnable
            pendingPurchaseTimeout = null
            pendingPurchase.take()?.call?.resolve(failedPurchase("구매 응답 제한 시간이 지나 결제를 확인하지 못했습니다."))
        }
        pendingPurchaseTimeout = timeout
        purchaseTimeoutHandler.postDelayed(timeout, NATIVE_OPERATION_TIMEOUT_MS)
    }

    private fun takePendingPurchase(): PendingPurchase? {
        val pending = pendingPurchase.take()
        pendingPurchaseTimeout?.let { purchaseTimeoutHandler.removeCallbacks(it) }
        pendingPurchaseTimeout = null
        return pending
    }

    private fun requireClient(call: PluginCall): PurchaseClient? {
        val client = purchaseClient
        if (client == null || !connected) {
            call.reject("plugin not initialized or service not connected")
            return null
        }
        return client
    }

    private fun resolveInitializeCalls() {
        val calls = initializeCalls.toList()
        initializeCalls.clear()
        calls.forEach { it.resolve() }
    }

    private fun rejectInitializeCalls(result: IapResult) {
        rejectInitializeCalls("ONE store IAP connection failed: ${result.getMessage()}", result.getResponseCode().toString())
    }

    private fun rejectInitializeCalls(message: String, code: String? = null) {
        val calls = initializeCalls.toList()
        initializeCalls.clear()
        calls.forEach { call ->
            if (code == null) call.reject(message) else call.reject(message, code)
        }
    }

    private fun rememberPurchase(purchase: PurchaseData) {
        val token = purchase.getPurchaseToken().trim()
        if (token.isNotEmpty()) purchaseDataByToken[token] = purchase
    }

    private fun resolvePendingPurchaseFailure(result: IapResult) {
        takePendingPurchase()?.call?.resolve(purchaseResult(result))
    }

    private fun productToJs(product: ProductDetail): JSObject {
        val productId = product.getProductId()
        val response = JSObject()
        response.put("productId", productId)
        response.put("type", if (isConsumable(productId)) "consumable" else "non-consumable")
        response.put("title", product.getTitle() ?: productId)
        response.put("description", "")
        response.put("price", product.getPrice() ?: "")
        response.put("priceAmountMicros", product.getPriceAmountMicros()?.toDoubleOrNull() ?: 0.0)
        response.put("priceCurrencyCode", product.getPriceCurrencyCode() ?: "")
        return response
    }

    private fun purchaseToJs(purchase: PurchaseData): JSObject {
        val response = JSObject()
        response.put("productId", purchase.getProductId())
        response.put("purchaseToken", purchase.getPurchaseToken())
        response.put("purchaseTime", purchase.getPurchaseTime())
        response.put("acknowledged", purchase.isAcknowledged())
        return response
    }

    private fun purchaseResult(result: IapResult): JSObject {
        val response = JSObject()
        response.put(
            "status",
            if (result.getResponseCode() == PurchaseClient.ResponseCode.RESULT_USER_CANCELED) "canceled" else "failed",
        )
        response.put("errorCode", result.getResponseCode())
        response.put("errorMessage", result.getMessage() ?: "purchase failed")
        return response
    }

    private fun failedPurchase(message: String, result: IapResult? = null): JSObject {
        val response = JSObject()
        response.put("status", "failed")
        if (result != null) response.put("errorCode", result.getResponseCode())
        response.put("errorMessage", message)
        return response
    }

    private fun isConsumable(productId: String): Boolean = productId.startsWith("crack_stone_pack_")

    internal fun emitPurchaseUpdated(data: JSObject) {
        notifyListeners("purchaseUpdated", data)
    }
}
