package com.forge.onestoreiap

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.onestore.iap.api.IapResult
import com.onestore.iap.api.PurchaseClient
import com.onestore.iap.api.PurchaseClient.ServiceConnectionListener

@CapacitorPlugin(name = "OnestoreIap")
class OnestoreIapPlugin : Plugin() {

    private var purchaseClient: PurchaseClient? = null
    private var licenseKey: String? = null
    private var connected: Boolean = false

    @PluginMethod
    fun initialize(call: PluginCall) {
        val key = call.getString("licenseKey")
        if (key.isNullOrEmpty()) {
            call.reject("licenseKey is required")
            return
        }
        licenseKey = key

        val ctx = activity?.applicationContext ?: context
        if (purchaseClient == null) {
            purchaseClient = PurchaseClient(ctx, key)
        }
        purchaseClient?.connect(object : ServiceConnectionListener {
            override fun onConnected() {
                connected = true
                call.resolve()
            }

            override fun onDisconnected() {
                connected = false
            }

            override fun onErrorNeedUpdateException() {
                connected = false
                call.reject("ONE store app needs update")
            }
        })
    }

    override fun handleOnDestroy() {
        purchaseClient?.terminate()
        purchaseClient = null
        connected = false
        super.handleOnDestroy()
    }

    private fun requireClient(call: PluginCall): PurchaseClient? {
        val c = purchaseClient
        if (c == null || !connected) {
            call.reject("plugin not initialized or service not connected")
            return null
        }
        return c
    }

    @PluginMethod
    fun queryProducts(call: PluginCall) {
        val client = requireClient(call) ?: return
        val productIdsArr = call.getArray("productIds")
        if (productIdsArr == null || productIdsArr.length() == 0) {
            call.reject("productIds is required")
            return
        }
        val ids = mutableListOf<String>()
        for (i in 0 until productIdsArr.length()) ids.add(productIdsArr.getString(i))

        client.queryProductsAsync(
            PurchaseClient.ProductType.IN_APP,
            ids,
        ) { result, products ->
            if (result.isSuccess && products != null) {
                val arr = com.getcapacitor.JSArray()
                for (p in products) {
                    val obj = JSObject()
                        .put("productId", p.productId)
                        .put("type", if (p.type == "inapp") "consumable" else "non-consumable")
                        .put("title", p.title)
                        .put("description", p.description ?: "")
                        .put("price", p.price)
                        .put("priceAmountMicros", p.priceAmountMicros)
                        .put("priceCurrencyCode", p.priceCurrencyCode)
                    arr.put(obj)
                }
                call.resolve(JSObject().put("products", arr))
            } else {
                call.reject("queryProducts failed: ${result.message}")
            }
        }
    }

    @PluginMethod
    fun purchase(call: PluginCall) {
        val client = requireClient(call) ?: return
        val productId = call.getString("productId")
        if (productId.isNullOrEmpty()) {
            call.reject("productId is required")
            return
        }
        val act = activity ?: run {
            call.reject("activity unavailable")
            return
        }

        client.launchPurchaseFlowAsync(
            act,
            productId,
            PurchaseClient.ProductType.IN_APP,
            "developer-payload",
        ) { result, purchaseData ->
            if (result.isSuccess && purchaseData != null) {
                val purchaseObj = JSObject()
                    .put("productId", purchaseData.productId)
                    .put("purchaseToken", purchaseData.purchaseToken)
                    .put("purchaseTime", purchaseData.purchaseTime)
                    .put("acknowledged", purchaseData.acknowledged)

                emitPurchaseUpdated(purchaseObj)

                call.resolve(JSObject().put("status", "success").put("purchase", purchaseObj))
            } else if (result.responseCode == IapResult.RESULT_USER_CANCELED) {
                call.resolve(JSObject().put("status", "canceled"))
            } else {
                call.resolve(
                    JSObject()
                        .put("status", "failed")
                        .put("errorCode", result.responseCode)
                        .put("errorMessage", result.message ?: "unknown"),
                )
            }
        }
    }

    internal fun emitPurchaseUpdated(data: JSObject) {
        notifyListeners("purchaseUpdated", data)
    }
}
