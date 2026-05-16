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

    internal fun emitPurchaseUpdated(data: JSObject) {
        notifyListeners("purchaseUpdated", data)
    }
}
