#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(OnestoreIapPlugin, "OnestoreIap",
           CAP_PLUGIN_METHOD(initialize, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(queryProducts, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(purchase, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(acknowledge, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(restorePurchases, CAPPluginReturnPromise);
)
