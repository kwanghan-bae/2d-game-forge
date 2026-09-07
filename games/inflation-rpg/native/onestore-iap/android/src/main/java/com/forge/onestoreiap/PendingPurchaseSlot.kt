package com.forge.onestoreiap

/**
 * Owns the single purchase callback slot used by the native bridge.
 *
 * Matching callbacks consume the slot exactly once. Unrelated callbacks leave
 * it pending so the original request can still be resolved or timed out.
 */
internal class PendingPurchaseSlot<T> {
    private data class Entry<T>(val productId: String, val value: T)

    private var pending: Entry<T>? = null

    fun start(productId: String, value: T) {
        pending = Entry(productId, value)
    }

    fun hasPending(): Boolean = pending != null

    fun peekProductId(): String? = pending?.productId

    fun takeIfMatches(productId: String): T? {
        if (pending?.productId != productId) return null
        return take()
    }

    fun take(): T? {
        val value = pending?.value
        pending = null
        return value
    }
}
