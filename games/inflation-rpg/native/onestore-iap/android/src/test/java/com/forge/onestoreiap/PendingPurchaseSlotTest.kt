package com.forge.onestoreiap

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test

class PendingPurchaseSlotTest {
    @Test
    fun matchingPurchaseConsumesThePendingCallExactlyOnce() {
        val slot = PendingPurchaseSlot<String>()
        slot.start("ad_free", "call")

        assertEquals("call", slot.takeIfMatches("ad_free"))
        assertNull(slot.takeIfMatches("ad_free"))
        assertFalse(slot.hasPending())
    }

    @Test
    fun unrelatedPurchaseDoesNotConsumeThePendingCall() {
        val slot = PendingPurchaseSlot<String>()
        slot.start("ad_free", "call")

        assertNull(slot.takeIfMatches("crack_stone_pack_small"))
        assertEquals("call", slot.take())
        assertFalse(slot.hasPending())
    }
}
