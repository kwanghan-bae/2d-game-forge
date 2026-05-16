import Foundation
import Capacitor

@objc(OnestoreIapPlugin)
public class OnestoreIapPlugin: CAPPlugin {
    @objc func initialize(_ call: CAPPluginCall) {
        call.reject("ONE store IAP is Android only. Use StoreKit on iOS — wired in a later phase.")
    }

    @objc func queryProducts(_ call: CAPPluginCall) {
        call.reject("ONE store IAP is Android only")
    }

    @objc func purchase(_ call: CAPPluginCall) {
        call.reject("ONE store IAP is Android only")
    }

    @objc func acknowledge(_ call: CAPPluginCall) {
        call.reject("ONE store IAP is Android only")
    }

    @objc func restorePurchases(_ call: CAPPluginCall) {
        call.reject("ONE store IAP is Android only")
    }
}
