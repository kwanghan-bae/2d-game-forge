package com.forge.onestoreiap

import com.gaa.sdk.iap.IapResult
import com.gaa.sdk.iap.ProductDetail
import com.gaa.sdk.iap.PurchaseClient
import com.gaa.sdk.iap.PurchaseClientStateListener
import com.gaa.sdk.iap.PurchaseData
import com.gaa.sdk.iap.PurchasesUpdatedListener

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

// Phase 5 — Compile-only stub. Real V21 PurchaseClient wiring lives in Phase 5a-1
// (see docs/superpowers/specs/2026-05-16-phase-5a-1-onestore-native-wire.md).
// The 원스토어 SDK 21.04.00 is Builder-pattern + listener-based (rewritten from
// V19/V20 era). Real Android device + 원스토어 sandbox account are required for
// runtime verification, so the wire is deferred to a manual-QA session.
@CapacitorPlugin(name = "OnestoreIap")
class OnestoreIapPlugin : Plugin() {

    @Suppress("unused")
    private var purchaseClient: PurchaseClient? = null

    @Suppress("unused", "UNUSED_VARIABLE")
    private fun verifyV21ImportsCompile() {
        val state: PurchaseClientStateListener? = null
        val updated: PurchasesUpdatedListener? = null
        val result: IapResult? = null
        val data: PurchaseData? = null
        val detail: ProductDetail? = null
    }

    private val stubReason =
        "Phase 5a-1 pending: 원스토어 V21 PurchaseClient wire requires real device + sandbox account"

    @PluginMethod
    fun initialize(call: PluginCall) {
        call.reject(stubReason)
    }

    @PluginMethod
    fun queryProducts(call: PluginCall) {
        call.reject(stubReason)
    }

    @PluginMethod
    fun purchase(call: PluginCall) {
        call.reject(stubReason)
    }

    @PluginMethod
    fun acknowledge(call: PluginCall) {
        call.reject(stubReason)
    }

    @PluginMethod
    fun restorePurchases(call: PluginCall) {
        call.reject(stubReason)
    }

    @Suppress("unused")
    internal fun emitPurchaseUpdated(data: JSObject) {
        notifyListeners("purchaseUpdated", data)
    }
}
