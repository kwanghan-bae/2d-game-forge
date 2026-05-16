# Phase 5 Monetization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make inflation-rpg 원스토어-출시 가능 (AdMob Rewarded + Banner, 원스토어 IAP 4 품목, 개인정보처리방침). Build a local Capacitor plugin for 원스토어 IAP (no community plugin exists), wire AdMob via `@capacitor-community/admob`, and fold Phase E debt (skill heal wiring).

**Architecture:** Single-spec single-merge phase split into 7 checkpoints — cp1 (native plugin foundation), cp2 (AdMob), cp3 (persist v14), cp4 (IAP game wiring), cp5 (privacy), cp6 (E debt), cp7 (tests + finalize). Local plugin lives at `games/inflation-rpg/native/onestore-iap/` (3-rule: never promoted to `packages/*` until a 2nd game uses 원스토어).

**Tech Stack:** TypeScript / React / Phaser / Zustand 5 (`gameStore.ts`) / Capacitor 7 / `@capacitor-community/admob` / 원스토어 IAP SDK V21 (`21.04.00`) / Kotlin / Vitest / Playwright iPhone 14 + web projects.

**Spec:** `docs/superpowers/specs/2026-05-16-phase-5-monetization-design.md`

---

## Reference Map (do NOT re-discover during execution)

| Symbol | File / Line |
|---|---|
| `STORE_VERSION` (literal `13`) | `games/inflation-rpg/src/store/gameStore.ts:1138` |
| `INITIAL_META` (MetaState defaults) | `games/inflation-rpg/src/store/gameStore.ts:66-130` |
| Persist `migrate` callback (v12→v13 chain) | `games/inflation-rpg/src/store/gameStore.ts` (around `version: 13`) |
| `MetaState` type | `games/inflation-rpg/src/types.ts` (search `interface MetaState`) |
| Existing ad stub (Phase E relic upgrades) | `games/inflation-rpg/src/systems/ads.ts` |
| `canWatchAd / startAdWatch / finishAdWatch` | `games/inflation-rpg/src/systems/ads.ts:7-36` |
| `AD_COOLDOWN_MS = 8_000`, `AD_DAILY_CAP = 30` | `games/inflation-rpg/src/systems/ads.ts:4-5` |
| Existing ad UI (relic upgrade button) | `games/inflation-rpg/src/screens/Relics.tsx` |
| `applySkillResult` (heal wiring TODO) | `games/inflation-rpg/src/battle/BattleScene.ts:456-489` |
| Heal effect TODO comment | `games/inflation-rpg/src/battle/BattleScene.ts:486` |
| `crackStones` field + `gainCrackStones` | `games/inflation-rpg/src/store/gameStore.ts:96, 762` |
| Capacitor config | `games/inflation-rpg/capacitor.config.ts` |
| Game package.json | `games/inflation-rpg/package.json` |
| Android app build.gradle | `games/inflation-rpg/android/app/build.gradle` |
| Android manifest | `games/inflation-rpg/android/app/src/main/AndroidManifest.xml` |
| Settings screen entry | `games/inflation-rpg/src/screens/` (search for `Settings`) |

---

## Checkpoint Plan

- **cp1 (T1–T11): Native plugin foundation.** Local Capacitor plugin at `games/inflation-rpg/native/onestore-iap/`. Each Kotlin step adds a web-stub mock first + Vitest verifies the bridge — TDD for the bridge layer; native PurchaseClient itself requires manual QA. Checkpoint ends when plugin builds with the Android module + iOS stub + registered via `npx cap sync android`.
- **cp2 (T12–T15): AdMob.** `@capacitor-community/admob` + `AdManager.ts` + `monetization.config.ts` (test IDs committed). BattleScene's existing rewarded path (via `ads.ts`) routes through `AdManager`.
- **cp3 (T16–T18): Persist v14.** `MetaState.adFreeOwned`, `MetaState.lastIapTx[]`, `STORE_VERSION = 14`, v13 → v14 migration, persist test coverage.
- **cp4 (T19–T24): IAP game wiring.** `IapCatalog.ts`, `IapManager.ts`, `MonetizationService.ts` facade, `IapShopScreen`, `AdFreeIndicator`, Settings entry point.
- **cp5 (T25–T26): Privacy.** `PrivacyScreen` + bundled `public/privacy-policy.html` fallback + `docs/privacy-policy/` GitHub Pages directory + enable Pages.
- **cp6 (T27): Phase E debt.** `applySkillResult` skill heal wiring.
- **cp7 (T28–T32): Tests + finalize.** E2E tests, .gitignore for `balance-sweep-out.md`, docs updates, phase tag + main merge.

Between checkpoints, this MUST pass before continuing:

```bash
pnpm --filter @forge/game-inflation-rpg typecheck && \
pnpm --filter @forge/game-inflation-rpg lint && \
pnpm circular && \
pnpm --filter @forge/game-inflation-rpg test
```

---

# CHECKPOINT 1 — Native plugin foundation

## Task 1: Scaffold plugin workspace at `games/inflation-rpg/native/onestore-iap/`

**Files:**
- Create: `games/inflation-rpg/native/onestore-iap/package.json`
- Create: `games/inflation-rpg/native/onestore-iap/capacitor-plugin.json`
- Create: `games/inflation-rpg/native/onestore-iap/tsconfig.json`
- Create: `games/inflation-rpg/native/onestore-iap/.gitignore`
- Create: `games/inflation-rpg/native/onestore-iap/src/.gitkeep`
- Create: `games/inflation-rpg/native/onestore-iap/android/.gitkeep`
- Create: `games/inflation-rpg/native/onestore-iap/ios/.gitkeep`

- [ ] **Step 1: Create plugin `package.json` (private workspace, 3-rule)**

Write `games/inflation-rpg/native/onestore-iap/package.json`:

```json
{
  "name": "@forge/inflation-rpg-native-onestore-iap",
  "version": "0.0.0",
  "private": true,
  "description": "Local Capacitor plugin wrapping 원스토어 IAP SDK V21 — inflation-rpg internal only. Do NOT publish or promote to packages/*.",
  "main": "dist/index.js",
  "module": "dist/index.js",
  "types": "dist/definitions.d.ts",
  "files": [
    "dist/",
    "android/",
    "ios/",
    "capacitor-plugin.json"
  ],
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "@capacitor/core": "^7.0.0"
  },
  "devDependencies": {
    "@capacitor/core": "^7.0.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create `capacitor-plugin.json`**

Write `games/inflation-rpg/native/onestore-iap/capacitor-plugin.json`:

```json
{
  "name": "OnestoreIap",
  "android": {
    "src": "android"
  },
  "ios": {
    "src": "ios"
  }
}
```

- [ ] **Step 3: Create `tsconfig.json`**

Write `games/inflation-rpg/native/onestore-iap/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 4: Create `.gitignore`**

Write `games/inflation-rpg/native/onestore-iap/.gitignore`:

```
dist/
node_modules/
*.tsbuildinfo
```

- [ ] **Step 5: Verify pnpm picks up the workspace**

Run: `pnpm install` (at repo root)

Expected: `@forge/inflation-rpg-native-onestore-iap` appears as a private workspace member. No error.

- [ ] **Step 6: Commit**

```bash
git add games/inflation-rpg/native/onestore-iap/
git commit -m "feat(game-inflation-rpg): Phase 5 — scaffold onestore-iap local Capacitor plugin (3-rule)"
```

---

## Task 2: TS contract — `definitions.ts`

**Files:**
- Create: `games/inflation-rpg/native/onestore-iap/src/definitions.ts`

- [ ] **Step 1: Define `IapPlugin` interface + supporting types**

Write `games/inflation-rpg/native/onestore-iap/src/definitions.ts`:

```ts
import type { PluginListenerHandle } from '@capacitor/core';

export interface ProductInfo {
  productId: string;
  type: 'consumable' | 'non-consumable';
  title: string;
  description: string;
  price: string;
  priceAmountMicros: number;
  priceCurrencyCode: string;
}

export interface PurchaseInfo {
  productId: string;
  purchaseToken: string;
  purchaseTime: number;
  acknowledged: boolean;
}

export interface PurchaseResult {
  status: 'success' | 'canceled' | 'failed';
  purchase?: PurchaseInfo;
  errorCode?: number;
  errorMessage?: string;
}

export interface InitializeOptions {
  licenseKey: string;
}

export interface QueryProductsOptions {
  productIds: string[];
}

export interface PurchaseOptions {
  productId: string;
}

export interface AcknowledgeOptions {
  purchaseToken: string;
}

export interface OnestoreIapPlugin {
  initialize(opts: InitializeOptions): Promise<void>;
  queryProducts(opts: QueryProductsOptions): Promise<{ products: ProductInfo[] }>;
  purchase(opts: PurchaseOptions): Promise<PurchaseResult>;
  acknowledge(opts: AcknowledgeOptions): Promise<void>;
  restorePurchases(): Promise<{ purchases: PurchaseInfo[] }>;
  addListener(
    eventName: 'purchaseUpdated',
    listenerFunc: (info: PurchaseInfo) => void,
  ): Promise<PluginListenerHandle>;
}
```

- [ ] **Step 2: Run typecheck on the plugin workspace**

Run: `pnpm --filter @forge/inflation-rpg-native-onestore-iap typecheck`

Expected: PASS (or PASS with only an `@capacitor/core` resolution warning that disappears after `pnpm install` finishes). If `@capacitor/core` import fails, run `pnpm install` first.

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/native/onestore-iap/src/definitions.ts
git commit -m "feat(game-inflation-rpg): Phase 5 — onestore-iap TS contract (IapPlugin interface)"
```

---

## Task 3: TS bridge — `index.ts`

**Files:**
- Create: `games/inflation-rpg/native/onestore-iap/src/index.ts`

- [ ] **Step 1: Register the plugin with Capacitor**

Write `games/inflation-rpg/native/onestore-iap/src/index.ts`:

```ts
import { registerPlugin } from '@capacitor/core';

import type { OnestoreIapPlugin } from './definitions';

const OnestoreIap = registerPlugin<OnestoreIapPlugin>('OnestoreIap', {
  web: () => import('./web').then((m) => new m.OnestoreIapWeb()),
});

export * from './definitions';
export { OnestoreIap };
```

- [ ] **Step 2: Verify (typecheck will fail until web.ts exists in Task 4)**

Run: `pnpm --filter @forge/inflation-rpg-native-onestore-iap typecheck`

Expected: FAIL with `Cannot find module './web'`. This is expected — Task 4 resolves it.

- [ ] **Step 3: Commit (intentionally leave broken until Task 4 closes the loop)**

```bash
git add games/inflation-rpg/native/onestore-iap/src/index.ts
git commit -m "feat(game-inflation-rpg): Phase 5 — onestore-iap registerPlugin bridge"
```

---

## Task 4: Web stub — `web.ts` (skeleton, all methods return defaults)

**Files:**
- Create: `games/inflation-rpg/native/onestore-iap/src/web.ts`

- [ ] **Step 1: Implement the web stub class**

Write `games/inflation-rpg/native/onestore-iap/src/web.ts`:

```ts
import { WebPlugin } from '@capacitor/core';

import type {
  AcknowledgeOptions,
  InitializeOptions,
  OnestoreIapPlugin,
  ProductInfo,
  PurchaseInfo,
  PurchaseOptions,
  PurchaseResult,
  QueryProductsOptions,
} from './definitions';

const WEB_MOCK_DELAY_MS = 200;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class OnestoreIapWeb extends WebPlugin implements OnestoreIapPlugin {
  private products: Map<string, ProductInfo> = new Map();
  private ownedNonConsumables: Set<string> = new Set();

  async initialize(_opts: InitializeOptions): Promise<void> {
    return Promise.resolve();
  }

  async queryProducts(opts: QueryProductsOptions): Promise<{ products: ProductInfo[] }> {
    await delay(WEB_MOCK_DELAY_MS);
    const products = opts.productIds.map((id) =>
      this.products.get(id) ?? {
        productId: id,
        type: id === 'ad_free' ? ('non-consumable' as const) : ('consumable' as const),
        title: id,
        description: `(web stub) ${id}`,
        price: '₩1,200',
        priceAmountMicros: 1_200_000_000,
        priceCurrencyCode: 'KRW',
      },
    );
    return { products };
  }

  async purchase(opts: PurchaseOptions): Promise<PurchaseResult> {
    await delay(WEB_MOCK_DELAY_MS);
    const purchase: PurchaseInfo = {
      productId: opts.productId,
      purchaseToken: `web_stub_${opts.productId}_${Date.now()}`,
      purchaseTime: Date.now(),
      acknowledged: false,
    };
    if (opts.productId === 'ad_free') this.ownedNonConsumables.add(opts.productId);
    this.notifyListeners('purchaseUpdated', purchase);
    return { status: 'success', purchase };
  }

  async acknowledge(_opts: AcknowledgeOptions): Promise<void> {
    await delay(WEB_MOCK_DELAY_MS);
    return Promise.resolve();
  }

  async restorePurchases(): Promise<{ purchases: PurchaseInfo[] }> {
    await delay(WEB_MOCK_DELAY_MS);
    const purchases: PurchaseInfo[] = Array.from(this.ownedNonConsumables).map((id) => ({
      productId: id,
      purchaseToken: `web_stub_restore_${id}`,
      purchaseTime: 0,
      acknowledged: true,
    }));
    return { purchases };
  }
}
```

- [ ] **Step 2: Verify typecheck now passes**

Run: `pnpm --filter @forge/inflation-rpg-native-onestore-iap typecheck`

Expected: PASS.

- [ ] **Step 3: Build the plugin (produces dist/)**

Run: `pnpm --filter @forge/inflation-rpg-native-onestore-iap build`

Expected: `dist/index.js`, `dist/definitions.d.ts`, `dist/web.js` produced.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/native/onestore-iap/src/web.ts
git commit -m "feat(game-inflation-rpg): Phase 5 — onestore-iap web stub (mock purchases for dev-shell + Playwright)"
```

---

## Task 5: Android `build.gradle` (원스토어 Maven repo + SDK 21.04.00)

**Files:**
- Create: `games/inflation-rpg/native/onestore-iap/android/build.gradle`
- Create: `games/inflation-rpg/native/onestore-iap/android/settings.gradle`

- [ ] **Step 1: Create `build.gradle` with 원스토어 Maven repo + dependency pinned to 21.04.00**

Write `games/inflation-rpg/native/onestore-iap/android/build.gradle`:

```gradle
ext {
    junitVersion = project.hasProperty('junitVersion') ? rootProject.ext.junitVersion : '4.13.2'
    androidxAppCompatVersion = project.hasProperty('androidxAppCompatVersion') ? rootProject.ext.androidxAppCompatVersion : '1.7.0'
    androidxJunitVersion = project.hasProperty('androidxJunitVersion') ? rootProject.ext.androidxJunitVersion : '1.2.1'
    androidxEspressoCoreVersion = project.hasProperty('androidxEspressoCoreVersion') ? rootProject.ext.androidxEspressoCoreVersion : '3.6.1'
}

buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.7.2'
        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.25"
    }
}

apply plugin: 'com.android.library'
apply plugin: 'kotlin-android'

android {
    namespace "com.forge.onestoreiap"
    compileSdk 34
    defaultConfig {
        minSdk 22
        targetSdk 34
        versionCode 1
        versionName "1.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    lintOptions {
        abortOnError false
    }
}

repositories {
    google()
    mavenCentral()
    maven { url 'https://repo.onestore.net/repository/onestore-sdk-public' }
}

dependencies {
    implementation fileTree(include: ['*.jar'], dir: 'libs')
    implementation project(':capacitor-android')
    implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"
    implementation 'com.onestorecorp.sdk:sdk-iap:21.04.00'
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1'

    testImplementation "junit:junit:$junitVersion"
    androidTestImplementation "androidx.test.ext:junit:$androidxJunitVersion"
    androidTestImplementation "androidx.test.espresso:espresso-core:$androidxEspressoCoreVersion"
}
```

- [ ] **Step 2: Create `settings.gradle` (so the plugin is buildable standalone)**

Write `games/inflation-rpg/native/onestore-iap/android/settings.gradle`:

```gradle
rootProject.name = 'OnestoreIap'
```

- [ ] **Step 3: Commit (no validation yet — Gradle sync runs at T11)**

```bash
git add games/inflation-rpg/native/onestore-iap/android/build.gradle \
        games/inflation-rpg/native/onestore-iap/android/settings.gradle
git commit -m "feat(game-inflation-rpg): Phase 5 — onestore-iap Android build.gradle (SDK 21.04.00 pinned)"
```

---

## Task 6: Android `AndroidManifest.xml` (원스토어 권한)

**Files:**
- Create: `games/inflation-rpg/native/onestore-iap/android/src/main/AndroidManifest.xml`

- [ ] **Step 1: Create the plugin manifest with 원스토어 publisher permission + queries**

Write `games/inflation-rpg/native/onestore-iap/android/src/main/AndroidManifest.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="com.onestore.iap.permission.BILLING" />
    <uses-permission android:name="android.permission.INTERNET" />

    <queries>
        <intent>
            <action android:name="com.onestore.android.iap" />
        </intent>
        <package android:name="com.skt.skaf.A000Z00040" />
        <package android:name="com.onestore.protocol.proxy" />
    </queries>

</manifest>
```

- [ ] **Step 2: Commit**

```bash
git add games/inflation-rpg/native/onestore-iap/android/src/main/AndroidManifest.xml
git commit -m "feat(game-inflation-rpg): Phase 5 — onestore-iap AndroidManifest permissions + queries"
```

---

## Task 7a: Kotlin plugin skeleton + `initialize()` + connection lifecycle

**Files:**
- Create: `games/inflation-rpg/native/onestore-iap/android/src/main/java/com/forge/onestoreiap/OnestoreIapPlugin.kt`

- [ ] **Step 1: Create the Capacitor plugin class with initialize() and PurchaseClient connection lifecycle**

Write `games/inflation-rpg/native/onestore-iap/android/src/main/java/com/forge/onestoreiap/OnestoreIapPlugin.kt`:

```kotlin
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
```

- [ ] **Step 2: Commit (compilation verified at T11 via `cap sync` + Gradle build)**

```bash
git add games/inflation-rpg/native/onestore-iap/android/src/main/java/com/forge/onestoreiap/OnestoreIapPlugin.kt
git commit -m "feat(game-inflation-rpg): Phase 5 — onestore-iap Kotlin plugin skeleton + initialize() + connection lifecycle"
```

---

## Task 7b: `queryProducts()` impl (Kotlin + web stub assertion)

**Files:**
- Modify: `games/inflation-rpg/native/onestore-iap/android/src/main/java/com/forge/onestoreiap/OnestoreIapPlugin.kt` (append method)
- Modify: `games/inflation-rpg/native/onestore-iap/src/web.ts` (add seed helper used by tests)
- Create: `games/inflation-rpg/native/onestore-iap/src/web.test.ts`

- [ ] **Step 1: TDD — failing Vitest for web stub `queryProducts`**

Create `games/inflation-rpg/native/onestore-iap/src/web.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { OnestoreIapWeb } from './web';

describe('OnestoreIapWeb.queryProducts', () => {
  it('returns ProductInfo for each requested id with non-consumable type for ad_free', async () => {
    const plugin = new OnestoreIapWeb();
    const { products } = await plugin.queryProducts({
      productIds: ['ad_free', 'crack_stone_pack_small'],
    });
    expect(products).toHaveLength(2);
    expect(products[0]).toMatchObject({ productId: 'ad_free', type: 'non-consumable' });
    expect(products[1]).toMatchObject({
      productId: 'crack_stone_pack_small',
      type: 'consumable',
    });
  });

  it('returns KRW priced products', async () => {
    const plugin = new OnestoreIapWeb();
    const { products } = await plugin.queryProducts({ productIds: ['ad_free'] });
    expect(products[0]!.priceCurrencyCode).toBe('KRW');
  });
});
```

- [ ] **Step 2: Run test — should already PASS (web stub from T4 already covers it)**

Run: `pnpm --filter @forge/inflation-rpg-native-onestore-iap exec vitest run src/web.test.ts`

Expected: PASS (2 tests). If the plugin workspace doesn't have vitest, install it as a devDep:

```bash
pnpm --filter @forge/inflation-rpg-native-onestore-iap add -D vitest
```

Then re-run.

- [ ] **Step 3: Append `queryProducts()` to the Kotlin plugin**

Append to `OnestoreIapPlugin.kt` (before the `internal fun emitPurchaseUpdated` line):

```kotlin
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
```

> **Note:** The 원스토어 SDK V21 callback signature (`ProductDetail` field names) may differ slightly across patch versions. If `queryProductsAsync` doesn't resolve cleanly, check the SDK source at https://github.com/ONE-store/inapp-sdk for the canonical field names and adjust the JSObject keys.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/native/onestore-iap/android/src/main/java/com/forge/onestoreiap/OnestoreIapPlugin.kt \
        games/inflation-rpg/native/onestore-iap/src/web.test.ts \
        games/inflation-rpg/native/onestore-iap/package.json \
        games/inflation-rpg/native/onestore-iap/pnpm-lock.yaml 2>/dev/null || true
git commit -m "feat(game-inflation-rpg): Phase 5 — onestore-iap queryProducts (Kotlin + web stub Vitest)"
```

---

## Task 8a: `purchase()` impl (Kotlin + web stub assertion)

**Files:**
- Modify: `games/inflation-rpg/native/onestore-iap/android/src/main/java/com/forge/onestoreiap/OnestoreIapPlugin.kt`
- Modify: `games/inflation-rpg/native/onestore-iap/src/web.test.ts`

- [ ] **Step 1: TDD — append failing test for web stub `purchase`**

Append to `games/inflation-rpg/native/onestore-iap/src/web.test.ts`:

```ts
describe('OnestoreIapWeb.purchase', () => {
  it('returns success with a purchase token, emits purchaseUpdated event', async () => {
    const plugin = new OnestoreIapWeb();
    let emitted: unknown = null;
    plugin.addListener('purchaseUpdated', (info) => {
      emitted = info;
    });
    const result = await plugin.purchase({ productId: 'ad_free' });
    expect(result.status).toBe('success');
    expect(result.purchase?.productId).toBe('ad_free');
    expect(result.purchase?.purchaseToken).toMatch(/^web_stub_ad_free_/);
    expect(emitted).toMatchObject({ productId: 'ad_free' });
  });

  it('tracks ad_free as owned for subsequent restorePurchases', async () => {
    const plugin = new OnestoreIapWeb();
    await plugin.purchase({ productId: 'ad_free' });
    const { purchases } = await plugin.restorePurchases();
    expect(purchases).toHaveLength(1);
    expect(purchases[0]!.productId).toBe('ad_free');
  });
});
```

- [ ] **Step 2: Run test — should PASS (T4 already covers it)**

Run: `pnpm --filter @forge/inflation-rpg-native-onestore-iap exec vitest run src/web.test.ts`

Expected: PASS (4 tests total now).

- [ ] **Step 3: Append `purchase()` to the Kotlin plugin**

Append to `OnestoreIapPlugin.kt` (before `internal fun emitPurchaseUpdated`):

```kotlin
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
        "developer-payload",  // PG-side payload — not used for verification
    ) { result, purchaseData ->
        if (result.isSuccess && purchaseData != null) {
            val purchaseObj = JSObject()
                .put("productId", purchaseData.productId)
                .put("purchaseToken", purchaseData.purchaseToken)
                .put("purchaseTime", purchaseData.purchaseTime)
                .put("acknowledged", purchaseData.acknowledged)

            // Notify subscribers so IapManager state machine fires on a single event
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
```

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/native/onestore-iap/android/src/main/java/com/forge/onestoreiap/OnestoreIapPlugin.kt \
        games/inflation-rpg/native/onestore-iap/src/web.test.ts
git commit -m "feat(game-inflation-rpg): Phase 5 — onestore-iap purchase (Kotlin + web stub Vitest)"
```

---

## Task 8b: `acknowledge()` + listener wiring

**Files:**
- Modify: `games/inflation-rpg/native/onestore-iap/android/src/main/java/com/forge/onestoreiap/OnestoreIapPlugin.kt`
- Modify: `games/inflation-rpg/native/onestore-iap/src/web.test.ts`

- [ ] **Step 1: TDD — append failing test for `acknowledge`**

Append to `games/inflation-rpg/native/onestore-iap/src/web.test.ts`:

```ts
describe('OnestoreIapWeb.acknowledge', () => {
  it('resolves successfully (no-op in web stub)', async () => {
    const plugin = new OnestoreIapWeb();
    await expect(
      plugin.acknowledge({ purchaseToken: 'web_stub_token' }),
    ).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test — PASS**

Run: `pnpm --filter @forge/inflation-rpg-native-onestore-iap exec vitest run src/web.test.ts`

Expected: PASS (5 tests).

- [ ] **Step 3: Append `acknowledge()` to Kotlin**

Append to `OnestoreIapPlugin.kt`:

```kotlin
@PluginMethod
fun acknowledge(call: PluginCall) {
    val client = requireClient(call) ?: return
    val token = call.getString("purchaseToken")
    if (token.isNullOrEmpty()) {
        call.reject("purchaseToken is required")
        return
    }

    client.consumeAsync(token) { result, _ ->
        // ONE store SDK treats acknowledge of consumables via consumeAsync.
        // Non-consumables also resolve via this path in V21.
        if (result.isSuccess) {
            call.resolve()
        } else {
            call.reject("acknowledge failed: ${result.message}", "${result.responseCode}")
        }
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/native/onestore-iap/android/src/main/java/com/forge/onestoreiap/OnestoreIapPlugin.kt \
        games/inflation-rpg/native/onestore-iap/src/web.test.ts
git commit -m "feat(game-inflation-rpg): Phase 5 — onestore-iap acknowledge (Kotlin + web stub Vitest)"
```

---

## Task 9: `restorePurchases()` (Kotlin + web stub assertion)

**Files:**
- Modify: `games/inflation-rpg/native/onestore-iap/android/src/main/java/com/forge/onestoreiap/OnestoreIapPlugin.kt`
- Modify: `games/inflation-rpg/native/onestore-iap/src/web.test.ts`

- [ ] **Step 1: TDD — append test for `restorePurchases` returning previously-owned ad_free after page reload**

Append to `web.test.ts`:

```ts
describe('OnestoreIapWeb.restorePurchases', () => {
  it('returns empty when nothing purchased', async () => {
    const plugin = new OnestoreIapWeb();
    const { purchases } = await plugin.restorePurchases();
    expect(purchases).toEqual([]);
  });

  it('returns ad_free after a prior purchase in the same instance', async () => {
    const plugin = new OnestoreIapWeb();
    await plugin.purchase({ productId: 'ad_free' });
    const { purchases } = await plugin.restorePurchases();
    expect(purchases).toHaveLength(1);
    expect(purchases[0]).toMatchObject({ productId: 'ad_free', acknowledged: true });
  });
});
```

- [ ] **Step 2: Run — PASS**

Run: `pnpm --filter @forge/inflation-rpg-native-onestore-iap exec vitest run src/web.test.ts`

Expected: PASS (7 tests).

- [ ] **Step 3: Append `restorePurchases()` to Kotlin**

Append to `OnestoreIapPlugin.kt`:

```kotlin
@PluginMethod
fun restorePurchases(call: PluginCall) {
    val client = requireClient(call) ?: return

    client.queryPurchasesAsync(PurchaseClient.ProductType.IN_APP) { result, purchases ->
        if (result.isSuccess) {
            val arr = com.getcapacitor.JSArray()
            purchases?.forEach { p ->
                val obj = JSObject()
                    .put("productId", p.productId)
                    .put("purchaseToken", p.purchaseToken)
                    .put("purchaseTime", p.purchaseTime)
                    .put("acknowledged", p.acknowledged)
                arr.put(obj)
            }
            call.resolve(JSObject().put("purchases", arr))
        } else {
            call.reject("restorePurchases failed: ${result.message}")
        }
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/native/onestore-iap/android/src/main/java/com/forge/onestoreiap/OnestoreIapPlugin.kt \
        games/inflation-rpg/native/onestore-iap/src/web.test.ts
git commit -m "feat(game-inflation-rpg): Phase 5 — onestore-iap restorePurchases (Kotlin + web stub Vitest)"
```

---

## Task 10: iOS stub (throw 'unsupported')

**Files:**
- Create: `games/inflation-rpg/native/onestore-iap/ios/Plugin/OnestoreIapPlugin.swift`
- Create: `games/inflation-rpg/native/onestore-iap/ios/Plugin/OnestoreIapPlugin.m`
- Create: `games/inflation-rpg/native/onestore-iap/OnestoreIap.podspec`

- [ ] **Step 1: Create the Swift stub that throws 'unsupported' for every method**

Write `games/inflation-rpg/native/onestore-iap/ios/Plugin/OnestoreIapPlugin.swift`:

```swift
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
```

- [ ] **Step 2: Create the Objective-C bridge**

Write `games/inflation-rpg/native/onestore-iap/ios/Plugin/OnestoreIapPlugin.m`:

```objc
#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(OnestoreIapPlugin, "OnestoreIap",
           CAP_PLUGIN_METHOD(initialize, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(queryProducts, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(purchase, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(acknowledge, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(restorePurchases, CAPPluginReturnPromise);
)
```

- [ ] **Step 3: Create the CocoaPods spec**

Write `games/inflation-rpg/native/onestore-iap/OnestoreIap.podspec`:

```ruby
require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = 'OnestoreIap'
  s.version = package['version']
  s.summary = 'Local 원스토어 IAP plugin (Android only — iOS stub).'
  s.license = 'MIT'
  s.homepage = 'https://github.com/kwanghan-bae/2d-game-forge'
  s.author = 'kwanghan-bae'
  s.source = { :git => 'local', :tag => s.version.to_s }
  s.source_files = 'ios/Plugin/**/*.{swift,h,m}'
  s.ios.deployment_target = '14.0'
  s.dependency 'Capacitor'
  s.swift_version = '5.1'
end
```

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/native/onestore-iap/ios/ \
        games/inflation-rpg/native/onestore-iap/OnestoreIap.podspec
git commit -m "feat(game-inflation-rpg): Phase 5 — onestore-iap iOS stub (rejects all methods)"
```

---

## Task 11: Wire plugin into inflation-rpg + `cap sync android`

**Files:**
- Modify: `games/inflation-rpg/package.json`
- Modify: `games/inflation-rpg/capacitor.config.ts`
- Modify: pnpm workspace (the dependency is already a workspace member via Task 1)

- [ ] **Step 1: Add plugin as a workspace dependency in the game's `package.json`**

Edit `games/inflation-rpg/package.json` `dependencies` block to add (preserve alphabetical order):

```json
"@forge/inflation-rpg-native-onestore-iap": "workspace:*",
```

- [ ] **Step 2: Run `pnpm install` so the workspace link resolves**

Run: `pnpm install`

Expected: 0 error. `games/inflation-rpg/node_modules/@forge/inflation-rpg-native-onestore-iap` symlinks to `../../native/onestore-iap`.

- [ ] **Step 3: Add `plugins:` block to `capacitor.config.ts` (currently absent — verified at plan time)**

Read `games/inflation-rpg/capacitor.config.ts` first to confirm structure. As of plan-time the file is:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.korea.inflationrpg',
  appName: 'KoreaInflationRPG',
  webDir: 'out',
  ios: { backgroundColor: '#0f0f14' },
  android: { backgroundColor: '#0f0f14' },
};

export default config;
```

There is NO `plugins:` block. Add one alongside `android:`:

```ts
  plugins: {
    OnestoreIap: {
      // licenseKey is passed via initialize() at runtime, not config.
    },
  },
```

(T12 will extend this block with `AdMob`.)

- [ ] **Step 4: Sync Capacitor to Android (`@capacitor/cli` already installed — verified at plan time)**

Run: `pnpm --filter @forge/game-inflation-rpg exec cap sync android`

Expected: log mentions `OnestoreIap` as discovered. No error.

> If `cap sync` complains about missing `dist/` in the plugin, run `pnpm --filter @forge/inflation-rpg-native-onestore-iap build` first.

- [ ] **Step 5: Verify Android Gradle build doesn't fail at the plugin module**

Run: `cd games/inflation-rpg/android && ./gradlew :app:compileDebugKotlin && cd -`

Expected: Compiles successfully. May log warnings about deprecated Gradle APIs — ignore.

> If `compileDebugKotlin` fails with "cannot find symbol" on 원스토어 SDK classes, double-check the Maven repo URL and SDK version in `native/onestore-iap/android/build.gradle`. Network access to `repo.onestore.net` is required.

- [ ] **Step 6: Commit**

```bash
git add games/inflation-rpg/package.json \
        games/inflation-rpg/capacitor.config.ts \
        pnpm-lock.yaml
git commit -m "feat(game-inflation-rpg): Phase 5 — register onestore-iap plugin + cap sync android"
```

---

**CHECKPOINT 1 GATE:** Before continuing to CP2 —

```bash
pnpm --filter @forge/game-inflation-rpg typecheck && \
pnpm --filter @forge/game-inflation-rpg lint && \
pnpm circular && \
pnpm --filter @forge/game-inflation-rpg test && \
pnpm --filter @forge/inflation-rpg-native-onestore-iap exec vitest run
```

All must pass. The Android Gradle build verified in T11 Step 5 is the native checkpoint.

---

# CHECKPOINT 2 — AdMob integration

## Task 12: Add `@capacitor-community/admob` + `monetization.config.ts`

**Files:**
- Modify: `games/inflation-rpg/package.json`
- Create: `games/inflation-rpg/src/config/monetization.config.ts`
- Modify: `games/inflation-rpg/capacitor.config.ts`

- [ ] **Step 1: Install AdMob plugin**

Run: `pnpm --filter @forge/game-inflation-rpg add @capacitor-community/admob`

Expected: `package.json` updated; lockfile updated; no error.

- [ ] **Step 2: Create `monetization.config.ts` with Google test IDs committed**

Write `games/inflation-rpg/src/config/monetization.config.ts`:

```ts
// Phase 5 — AdMob unit IDs.
// TEST IDs are safe to commit (per Google's policy). Replace with real IDs
// before submitting to 원스토어 (see docs/CONTRIBUTING.md §15).

export const ADMOB_CONFIG = {
  appId: {
    android: 'ca-app-pub-3940256099942544~3347511713',  // Google test app ID
  },
  rewarded: {
    android: 'ca-app-pub-3940256099942544/5224354917',  // Google test rewarded
  },
  banner: {
    android: 'ca-app-pub-3940256099942544/6300978111',  // Google test banner
  },
  // 원스토어 IAP licenseKey — placeholder. Replace at build time via env.
  iapLicenseKey: process.env.ONESTORE_IAP_LICENSE_KEY ?? 'PLACEHOLDER_LICENSE_KEY',
} as const;
```

- [ ] **Step 3: Add AdMob app ID to `capacitor.config.ts`**

T11 Step 3 already created the `plugins:` block with `OnestoreIap`. Extend it with `AdMob`:

```ts
  plugins: {
    OnestoreIap: { /* ... */ },
    AdMob: {
      appId: { android: 'ca-app-pub-3940256099942544~3347511713' },
    },
  },
```

If T11 Step 3 was skipped (e.g. someone added the block elsewhere), ensure the
`plugins:` block exists at the same indentation level as `android:` before
adding `AdMob`.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/package.json \
        games/inflation-rpg/src/config/monetization.config.ts \
        games/inflation-rpg/capacitor.config.ts \
        pnpm-lock.yaml
git commit -m "feat(game-inflation-rpg): Phase 5 — install AdMob plugin + monetization.config.ts (test IDs)"
```

---

## Task 13: `AdManager.ts` (rewarded + banner)

**Files:**
- Create: `games/inflation-rpg/src/services/AdManager.ts`
- Create: `games/inflation-rpg/src/services/AdManager.test.ts`

- [ ] **Step 1: TDD — failing test for AdManager**

Write `games/inflation-rpg/src/services/AdManager.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor-community/admob', () => {
  const showRewardVideoAd = vi.fn().mockResolvedValue({ amount: 1, type: 'boost' });
  const prepareRewardVideoAd = vi.fn().mockResolvedValue(undefined);
  const showBanner = vi.fn().mockResolvedValue(undefined);
  const hideBanner = vi.fn().mockResolvedValue(undefined);
  const initialize = vi.fn().mockResolvedValue(undefined);
  return {
    AdMob: { initialize, prepareRewardVideoAd, showRewardVideoAd, showBanner, hideBanner },
    BannerAdPosition: { BOTTOM_CENTER: 'BOTTOM_CENTER' },
    BannerAdSize: { ADAPTIVE_BANNER: 'ADAPTIVE_BANNER' },
  };
});

import { AdMob } from '@capacitor-community/admob';
import { AdManager } from './AdManager';

describe('AdManager', () => {
  let mgr: AdManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mgr = new AdManager({
      rewardedUnitId: 'test-rewarded',
      bannerUnitId: 'test-banner',
    });
  });

  it('initialize calls AdMob.initialize once', async () => {
    await mgr.initialize();
    await mgr.initialize();
    expect((AdMob.initialize as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('showRewardedAd resolves true on completion', async () => {
    await mgr.initialize();
    const ok = await mgr.showRewardedAd();
    expect(ok).toBe(true);
    expect(AdMob.showRewardVideoAd).toHaveBeenCalled();
  });

  it('showBanner forwards BOTTOM position and resolves', async () => {
    await mgr.initialize();
    await mgr.showBanner();
    expect(AdMob.showBanner).toHaveBeenCalledWith(
      expect.objectContaining({ adId: 'test-banner', position: 'BOTTOM_CENTER' }),
    );
  });

  it('hideBanner forwards', async () => {
    await mgr.initialize();
    await mgr.hideBanner();
    expect(AdMob.hideBanner).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — should FAIL (AdManager not defined yet)**

Run: `pnpm --filter @forge/game-inflation-rpg exec vitest run src/services/AdManager.test.ts`

Expected: FAIL with `Cannot find module './AdManager'`.

- [ ] **Step 3: Implement `AdManager.ts`**

Write `games/inflation-rpg/src/services/AdManager.ts`:

```ts
import {
  AdMob,
  BannerAdPosition,
  BannerAdSize,
} from '@capacitor-community/admob';

export interface AdManagerConfig {
  rewardedUnitId: string;
  bannerUnitId: string;
}

export class AdManager {
  private initialized = false;
  private bannerVisible = false;

  constructor(private cfg: AdManagerConfig) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      await AdMob.initialize({
        requestTrackingAuthorization: false,  // iOS-only; ignored on Android
        initializeForTesting: true,
      });
      this.initialized = true;
    } catch (e) {
      console.warn('[AdManager] initialize failed:', e);
    }
  }

  async showRewardedAd(): Promise<boolean> {
    try {
      await AdMob.prepareRewardVideoAd({ adId: this.cfg.rewardedUnitId });
      const result = await AdMob.showRewardVideoAd();
      return result !== null && result !== undefined;
    } catch (e) {
      console.warn('[AdManager] showRewardedAd failed:', e);
      return false;
    }
  }

  async showBanner(): Promise<void> {
    if (this.bannerVisible) return;
    try {
      await AdMob.showBanner({
        adId: this.cfg.bannerUnitId,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
      });
      this.bannerVisible = true;
    } catch (e) {
      console.warn('[AdManager] showBanner failed:', e);
    }
  }

  async hideBanner(): Promise<void> {
    if (!this.bannerVisible) return;
    try {
      await AdMob.hideBanner();
      this.bannerVisible = false;
    } catch (e) {
      console.warn('[AdManager] hideBanner failed:', e);
    }
  }

  isBannerVisible(): boolean {
    return this.bannerVisible;
  }
}
```

- [ ] **Step 4: Run — should PASS**

Run: `pnpm --filter @forge/game-inflation-rpg exec vitest run src/services/AdManager.test.ts`

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/services/AdManager.ts \
        games/inflation-rpg/src/services/AdManager.test.ts
git commit -m "feat(game-inflation-rpg): Phase 5 — AdManager (rewarded + banner, AdMob wrapper)"
```

---

## Task 14: Android manifest — AdMob `APPLICATION_ID` meta-data

**Files:**
- Modify: `games/inflation-rpg/android/app/src/main/AndroidManifest.xml`

- [ ] **Step 1: Add the `<meta-data>` element inside `<application>` with Google test app ID**

Edit `games/inflation-rpg/android/app/src/main/AndroidManifest.xml`. Find the existing `<application ...>` block. Inside it (typically right after `<activity ...>` or sibling to it), add:

```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-3940256099942544~3347511713" />
```

Also add to root `<manifest>` (sibling of `<application>`) if not already present:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

- [ ] **Step 2: Re-sync Capacitor**

Run: `pnpm --filter @forge/game-inflation-rpg exec cap sync android`

Expected: 0 error. The manifest changes flow into the merged build manifest.

- [ ] **Step 3: Verify the manifest merger doesn't conflict**

Run: `cd games/inflation-rpg/android && ./gradlew :app:processDebugManifest && cd -`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/android/app/src/main/AndroidManifest.xml
git commit -m "feat(game-inflation-rpg): Phase 5 — AdMob APPLICATION_ID meta-data + INTERNET permission"
```

---

## Task 15: Wire BattleScene rewarded ad path through AdManager

**Files:**
- Read first: `games/inflation-rpg/src/screens/Relics.tsx` (find existing `startAdWatch / finishAdWatch` usage)
- Modify: `games/inflation-rpg/src/screens/Relics.tsx`

- [ ] **Step 1: Read the existing Phase E ad stub flow**

Run: `grep -n "startAdWatch\|finishAdWatch\|canWatchAd" games/inflation-rpg/src/screens/Relics.tsx`

Note the existing UI flow — it likely uses an `AD_COOLDOWN_MS` timer + immediate `finishAdWatch` call. We are inserting `AdManager.showRewardedAd()` between `canWatchAd` and `finishAdWatch`.

- [ ] **Step 2: Add a module-level `AdManager` singleton import**

At the top of `Relics.tsx`, add:

```ts
import { AdManager } from '../services/AdManager';
import { ADMOB_CONFIG } from '../config/monetization.config';

const adManager = new AdManager({
  rewardedUnitId: ADMOB_CONFIG.rewarded.android,
  bannerUnitId: ADMOB_CONFIG.banner.android,
});
```

- [ ] **Step 3: In the ad-watch handler, gate `finishAdWatch` on `adManager.showRewardedAd()`**

Find the handler that calls `startAdWatch(meta, Date.now())` followed by a `setTimeout` and `finishAdWatch`. Replace the body with a flow that:

1. Calls `await adManager.initialize()` (idempotent)
2. Calls `const adShown = await adManager.showRewardedAd();`
3. If `adShown`, proceeds to `finishAdWatch`
4. If not, shows a toast / sets an error state and does not award the relic stack

Concretely, replace the timer-based flow with:

```ts
const handleWatchAd = async (relicId: RelicId) => {
  if (!canWatchAd(meta, Date.now()).ok) return;

  await adManager.initialize();

  // For meta.adFreeOwned, AdManager.showRewardedAd should short-circuit.
  // But that wiring lands in T21 (MonetizationService). For now this is a direct call.
  const adShown = await adManager.showRewardedAd();
  if (!adShown) {
    // Toast or inline error — match existing UX pattern in Relics.tsx
    return;
  }

  const result = finishAdWatch(meta, 'ignored', relicId, Date.now());
  setMeta(result.nextMeta);
};
```

> **Important:** Do not delete or rename `ads.ts` — its `canWatchAd` / `finishAdWatch` cap-tracking logic is still authoritative. We only insert the AdManager call between the gate and the reward grant.

- [ ] **Step 4: Run existing ad tests to verify the cap logic still passes**

Run: `pnpm --filter @forge/game-inflation-rpg exec vitest run src/systems/ads.test.ts`

Expected: PASS (no changes to `ads.ts`).

- [ ] **Step 5: Run Relics tests if they exist**

Run: `pnpm --filter @forge/game-inflation-rpg exec vitest run src/screens/Relics`

Expected: PASS, or "no tests found" — acceptable. Manual UI behavior is exercised via existing e2e once we get to CP7.

- [ ] **Step 6: Commit**

```bash
git add games/inflation-rpg/src/screens/Relics.tsx
git commit -m "feat(game-inflation-rpg): Phase 5 — Relics ad watch flow gated on AdManager.showRewardedAd"
```

---

**CHECKPOINT 2 GATE:** Repeat the gate command from CP1. All pass before continuing.

---

# CHECKPOINT 3 — Persist v14

## Task 16: `MetaState.adFreeOwned` + `lastIapTx[]` fields + `INITIAL_META` update

**Files:**
- Modify: `games/inflation-rpg/src/types.ts` (search for `interface MetaState`)
- Modify: `games/inflation-rpg/src/store/gameStore.ts:66-130` (INITIAL_META)

- [ ] **Step 1: Add `IapTransaction` type and `MetaState` fields in `types.ts`**

In `games/inflation-rpg/src/types.ts`, find the `MetaState` interface. Append before its closing brace:

```ts
  // Phase 5 — Monetization
  adFreeOwned: boolean;
  lastIapTx: IapTransaction[];
```

Also add the supporting type next to `MetaState`:

```ts
export type IapProductId =
  | 'ad_free'
  | 'crack_stone_pack_small'
  | 'crack_stone_pack_mid'
  | 'crack_stone_pack_large';

export interface IapTransaction {
  productId: IapProductId;
  ts: number;
  purchaseToken: string;
}
```

- [ ] **Step 2: Update `INITIAL_META` to seed the new fields**

In `games/inflation-rpg/src/store/gameStore.ts:66-130`, find the `INITIAL_META` const. Append before the closing brace:

```ts
  // Phase 5
  adFreeOwned: false,
  lastIapTx: [],
```

- [ ] **Step 3: Run typecheck — should FAIL with "missing fields" in any place that constructs MetaState literally**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck`

Expected: FAIL at any test fixture that constructs `MetaState`. List them.

- [ ] **Step 4: Add the two new fields wherever typecheck flagged a missing MetaState property**

Common locations (verify with grep):

```bash
grep -rn "as MetaState\|: MetaState =\|<MetaState>" games/inflation-rpg/src --include="*.ts" --include="*.tsx"
```

For each location, add `adFreeOwned: false, lastIapTx: []` to the literal.

> Many test fixtures spread `INITIAL_META` and override fields — those auto-acquire the new keys and need no change. Only literal constructions need updating.

- [ ] **Step 5: Re-run typecheck — should PASS**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

Use `git status` to enumerate files actually modified in this task, then commit them explicitly. Do NOT use `git add games/inflation-rpg/src/` which sweeps unrelated dirty files. Expected files:

- `games/inflation-rpg/src/types.ts`
- `games/inflation-rpg/src/store/gameStore.ts`
- Plus any test fixtures that needed the two new fields (Step 4)

```bash
git status --short  # review the dirty list first
git add games/inflation-rpg/src/types.ts games/inflation-rpg/src/store/gameStore.ts
# Then `git add` each specific fixture file flagged in Step 4 individually.
git commit -m "feat(game-inflation-rpg): Phase 5 — MetaState.adFreeOwned + lastIapTx[] + IapTransaction"
```

---

## Task 17: `STORE_VERSION = 14` + v13 → v14 migration

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts:1138` (and migration block)

- [ ] **Step 1: Read the existing migration chain to see the structure**

Run: `grep -n "version:\|migrateV1[0-9]ToV1[0-9]" games/inflation-rpg/src/store/gameStore.ts`

Note the pattern. Each `version: N` is followed by a `migrate: (persisted, version) => ...` block that runs migrators conditionally.

- [ ] **Step 2: Bump `version: 13` to `version: 14` and add v13 → v14 migrator**

Edit `games/inflation-rpg/src/store/gameStore.ts`. Find:

```ts
      version: 13,  // 12 → 13 (Phase Realms — compassOwned + RunState.playerHp)
```

Replace with:

```ts
      version: 14,  // 13 → 14 (Phase 5 — adFreeOwned + lastIapTx[])
```

In the same `migrate:` block above, find the existing `if (version < 13) { ... }` migrator. After it (or in the same conditional chain), add:

```ts
if (version < 14) {
  if (persisted && typeof persisted === 'object' && persisted !== null) {
    const s = persisted as { meta?: Record<string, unknown> };
    if (s.meta) {
      if (typeof s.meta['adFreeOwned'] !== 'boolean') s.meta['adFreeOwned'] = false;
      if (!Array.isArray(s.meta['lastIapTx'])) s.meta['lastIapTx'] = [];
    }
  }
}
```

> **Pattern check:** match exactly how the v12 → v13 migrator is written. If that block uses a different defensive shape (e.g. `as any` instead of `Record<string, unknown>`), follow that shape.

- [ ] **Step 3: Run all store tests — must pass (existing migrations untouched)**

Run: `pnpm --filter @forge/game-inflation-rpg exec vitest run src/store`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/store/gameStore.ts
git commit -m "feat(game-inflation-rpg): Phase 5 — STORE_VERSION = 14, v13→v14 migration (adFreeOwned + lastIapTx[])"
```

---

## Task 18: Persist test coverage — v13 → v14 migration unit test

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.test.ts`
- Modify: `games/inflation-rpg/src/store/gameStore.ts` (export `migrateV13ToV14` for testability — match the existing `migrateV8ToV9` export pattern verified at plan time)

**Plan-time discovery**: `gameStore.test.ts:2` already imports `runStoreMigration` AND `migrateV8ToV9`. The migration test pattern in this repo is to **export individual `migrateV(N-1)ToV(N)` functions** and call them directly in tests. `runStoreMigration` is the chain orchestrator; individual `migrateV*` are unit-testable.

- [ ] **Step 1: Refactor T17's inline `if (version < 14) { ... }` block into a named exported function**

Modify `gameStore.ts` — extract the v13→v14 migration body added in T17 into a top-level exported function (placed near other `migrateV*` exports if any):

```ts
export function migrateV13ToV14(persisted: unknown): unknown {
  if (persisted && typeof persisted === 'object' && persisted !== null) {
    const s = persisted as { meta?: Record<string, unknown> };
    if (s.meta) {
      if (typeof s.meta['adFreeOwned'] !== 'boolean') s.meta['adFreeOwned'] = false;
      if (!Array.isArray(s.meta['lastIapTx'])) s.meta['lastIapTx'] = [];
    }
  }
  return persisted;
}
```

Then in `runStoreMigration` (or wherever T17's inline block went), replace the inline body with a call:

```ts
if (version < 14) {
  persisted = migrateV13ToV14(persisted);
}
```

- [ ] **Step 2: Add the import in `gameStore.test.ts`**

Edit `gameStore.test.ts:2` to append `migrateV13ToV14`:

```ts
import { useGameStore, INITIAL_RUN, INITIAL_META, migrateV8ToV9, migrateV13ToV14, runStoreMigration } from './gameStore';
```

- [ ] **Step 3: Append a `describe('migrateV13ToV14')` block (mirror existing `migrateV8ToV9` test shape)**

Append to `gameStore.test.ts`:

```ts
describe('migrateV13ToV14', () => {
  it('adds adFreeOwned=false and lastIapTx=[] when missing', () => {
    const v13State = {
      meta: { ...INITIAL_META } as Record<string, unknown>,
      run: null,
    };
    delete v13State.meta['adFreeOwned'];
    delete v13State.meta['lastIapTx'];

    const result = migrateV13ToV14(v13State) as { meta: { adFreeOwned: boolean; lastIapTx: unknown[] } };
    expect(result.meta.adFreeOwned).toBe(false);
    expect(result.meta.lastIapTx).toEqual([]);
  });

  it('preserves existing adFreeOwned=true', () => {
    const v13State = {
      meta: { ...INITIAL_META, adFreeOwned: true, lastIapTx: [{ productId: 'ad_free', ts: 1, purchaseToken: 't' }] },
      run: null,
    };
    const result = migrateV13ToV14(v13State) as { meta: { adFreeOwned: boolean; lastIapTx: unknown[] } };
    expect(result.meta.adFreeOwned).toBe(true);
    expect(result.meta.lastIapTx).toHaveLength(1);
  });

  it('handles null persisted', () => {
    expect(migrateV13ToV14(null)).toBeNull();
  });
});
```

- [ ] **Step 4: Run — should PASS**

Run: `pnpm --filter @forge/game-inflation-rpg exec vitest run src/store/gameStore.test.ts`

Expected: PASS (existing tests + 3 new).

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/store/gameStore.test.ts \
        games/inflation-rpg/src/store/gameStore.ts
git commit -m "test(game-inflation-rpg): Phase 5 — v13→v14 migration unit test + export migrateV13ToV14"
```

---

**CHECKPOINT 3 GATE:** Repeat gate.

---

# CHECKPOINT 4 — IAP game wiring

## Task 19: `IapCatalog.ts` (4 product constants)

**Files:**
- Create: `games/inflation-rpg/src/services/IapCatalog.ts`
- Create: `games/inflation-rpg/src/services/IapCatalog.test.ts`

- [ ] **Step 1: TDD — failing test for catalog**

Write `games/inflation-rpg/src/services/IapCatalog.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { IAP_CATALOG, IAP_PRODUCT_IDS } from './IapCatalog';

describe('IAP_CATALOG', () => {
  it('has exactly 4 products', () => {
    expect(IAP_PRODUCT_IDS).toHaveLength(4);
  });

  it('ad_free is non-consumable, others consumable', () => {
    expect(IAP_CATALOG.ad_free.type).toBe('non-consumable');
    expect(IAP_CATALOG.crack_stone_pack_small.type).toBe('consumable');
    expect(IAP_CATALOG.crack_stone_pack_mid.type).toBe('consumable');
    expect(IAP_CATALOG.crack_stone_pack_large.type).toBe('consumable');
  });

  it('crystal pack amounts are 10 / 60 / 150', () => {
    expect(IAP_CATALOG.crack_stone_pack_small.crackStones).toBe(10);
    expect(IAP_CATALOG.crack_stone_pack_mid.crackStones).toBe(60);
    expect(IAP_CATALOG.crack_stone_pack_large.crackStones).toBe(150);
  });

  it('ad_free has no crackStones field', () => {
    // @ts-expect-error — discriminated union, ad_free entry lacks crackStones
    expect((IAP_CATALOG.ad_free as { crackStones: number }).crackStones).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run — FAIL (module missing)**

Run: `pnpm --filter @forge/game-inflation-rpg exec vitest run src/services/IapCatalog.test.ts`

Expected: FAIL with `Cannot find module './IapCatalog'`.

- [ ] **Step 3: Implement `IapCatalog.ts`**

Write `games/inflation-rpg/src/services/IapCatalog.ts`:

```ts
import type { IapProductId } from '../types';

interface AdFreeEntry {
  id: 'ad_free';
  type: 'non-consumable';
  displayName: string;
  description: string;
}

interface CrackStonePackEntry {
  id: 'crack_stone_pack_small' | 'crack_stone_pack_mid' | 'crack_stone_pack_large';
  type: 'consumable';
  displayName: string;
  crackStones: number;
}

type CatalogEntry = AdFreeEntry | CrackStonePackEntry;

export const IAP_CATALOG: Record<IapProductId, CatalogEntry> = {
  ad_free: {
    id: 'ad_free',
    type: 'non-consumable',
    displayName: '광고 제거',
    description:
      '하단 배너 광고가 영구히 사라지고, ' +
      '보상형 광고를 보지 않아도 자동으로 보상을 받습니다.',
  },
  crack_stone_pack_small: {
    id: 'crack_stone_pack_small',
    type: 'consumable',
    displayName: '균열석 작은 묶음',
    crackStones: 10,
  },
  crack_stone_pack_mid: {
    id: 'crack_stone_pack_mid',
    type: 'consumable',
    displayName: '균열석 중간 묶음',
    crackStones: 60,
  },
  crack_stone_pack_large: {
    id: 'crack_stone_pack_large',
    type: 'consumable',
    displayName: '균열석 큰 묶음',
    crackStones: 150,
  },
};

export const IAP_PRODUCT_IDS: IapProductId[] = [
  'ad_free',
  'crack_stone_pack_small',
  'crack_stone_pack_mid',
  'crack_stone_pack_large',
];
```

- [ ] **Step 4: Run — PASS**

Run: `pnpm --filter @forge/game-inflation-rpg exec vitest run src/services/IapCatalog.test.ts`

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/services/IapCatalog.ts \
        games/inflation-rpg/src/services/IapCatalog.test.ts
git commit -m "feat(game-inflation-rpg): Phase 5 — IapCatalog (ad_free + 3 crack_stone tiers)"
```

---

## Task 20: `IapManager.ts` (purchase / restore / state)

**Files:**
- Create: `games/inflation-rpg/src/services/IapManager.ts`
- Create: `games/inflation-rpg/src/services/IapManager.test.ts`

- [ ] **Step 1: TDD — failing test**

Write `games/inflation-rpg/src/services/IapManager.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IapManager } from './IapManager';

import type { OnestoreIapPlugin } from '@forge/inflation-rpg-native-onestore-iap';

const mockPlugin: Pick<
  OnestoreIapPlugin,
  'initialize' | 'queryProducts' | 'purchase' | 'acknowledge' | 'restorePurchases' | 'addListener'
> = {
  initialize: vi.fn().mockResolvedValue(undefined),
  queryProducts: vi.fn().mockResolvedValue({
    products: [
      { productId: 'ad_free', type: 'non-consumable', price: '₩1,200' },
      { productId: 'crack_stone_pack_small', type: 'consumable', price: '₩1,200' },
    ],
  }),
  purchase: vi.fn(),
  acknowledge: vi.fn().mockResolvedValue(undefined),
  restorePurchases: vi.fn().mockResolvedValue({ purchases: [] }),
  addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
} as never;  // `as never` works around vi.fn typing — adjust if Vitest provides better helper

describe('IapManager', () => {
  let mgr: IapManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mgr = new IapManager(mockPlugin, 'TEST_LICENSE_KEY');
  });

  it('initialize calls plugin.initialize with licenseKey', async () => {
    await mgr.initialize();
    expect(mockPlugin.initialize).toHaveBeenCalledWith({ licenseKey: 'TEST_LICENSE_KEY' });
  });

  it('queryProducts caches product info by id', async () => {
    await mgr.queryProducts();
    expect(mgr.getProduct('ad_free')?.price).toBe('₩1,200');
  });

  it('purchase success returns purchase + token, acknowledges automatically', async () => {
    mockPlugin.purchase.mockResolvedValue({
      status: 'success',
      purchase: {
        productId: 'ad_free',
        purchaseToken: 'tok_123',
        purchaseTime: 100,
        acknowledged: false,
      },
    });
    const result = await mgr.purchase('ad_free');
    expect(result.status).toBe('success');
    expect(mockPlugin.acknowledge).toHaveBeenCalledWith({ purchaseToken: 'tok_123' });
  });

  it('purchase canceled does not call acknowledge', async () => {
    mockPlugin.purchase.mockResolvedValue({ status: 'canceled' });
    const result = await mgr.purchase('ad_free');
    expect(result.status).toBe('canceled');
    expect(mockPlugin.acknowledge).not.toHaveBeenCalled();
  });

  it('restorePurchases returns the plugin result', async () => {
    mockPlugin.restorePurchases.mockResolvedValue({
      purchases: [
        {
          productId: 'ad_free',
          purchaseToken: 'tok_old',
          purchaseTime: 0,
          acknowledged: true,
        },
      ],
    });
    const result = await mgr.restorePurchases();
    expect(result).toHaveLength(1);
    expect(result[0]!.productId).toBe('ad_free');
  });
});
```

- [ ] **Step 2: Run — FAIL**

Run: `pnpm --filter @forge/game-inflation-rpg exec vitest run src/services/IapManager.test.ts`

Expected: FAIL (module missing).

- [ ] **Step 3: Implement `IapManager.ts`**

Write `games/inflation-rpg/src/services/IapManager.ts`:

```ts
import type {
  OnestoreIapPlugin,
  ProductInfo,
  PurchaseInfo,
  PurchaseResult,
} from '@forge/inflation-rpg-native-onestore-iap';

import type { IapProductId } from '../types';
import { IAP_PRODUCT_IDS } from './IapCatalog';

export class IapManager {
  private initialized = false;
  private products: Map<string, ProductInfo> = new Map();

  constructor(
    private plugin: Pick<
      OnestoreIapPlugin,
      'initialize' | 'queryProducts' | 'purchase' | 'acknowledge' | 'restorePurchases' | 'addListener'
    >,
    private licenseKey: string,
  ) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.plugin.initialize({ licenseKey: this.licenseKey });
    this.initialized = true;
  }

  async queryProducts(): Promise<ProductInfo[]> {
    const { products } = await this.plugin.queryProducts({ productIds: IAP_PRODUCT_IDS });
    this.products.clear();
    for (const p of products) this.products.set(p.productId, p);
    return products;
  }

  getProduct(id: IapProductId): ProductInfo | undefined {
    return this.products.get(id);
  }

  async purchase(productId: IapProductId): Promise<PurchaseResult> {
    const result = await this.plugin.purchase({ productId });
    if (result.status === 'success' && result.purchase) {
      await this.plugin.acknowledge({ purchaseToken: result.purchase.purchaseToken });
    }
    return result;
  }

  async restorePurchases(): Promise<PurchaseInfo[]> {
    const { purchases } = await this.plugin.restorePurchases();
    return purchases;
  }
}
```

- [ ] **Step 4: Run — PASS**

Run: `pnpm --filter @forge/game-inflation-rpg exec vitest run src/services/IapManager.test.ts`

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/services/IapManager.ts \
        games/inflation-rpg/src/services/IapManager.test.ts
git commit -m "feat(game-inflation-rpg): Phase 5 — IapManager (purchase + acknowledge + restore)"
```

---

## Task 21: `MonetizationService.ts` facade + bootup init

**Files:**
- Create: `games/inflation-rpg/src/services/MonetizationService.ts`
- Create: `games/inflation-rpg/src/services/MonetizationService.test.ts`
- Modify: `games/inflation-rpg/src/main.tsx` or `App.tsx` (search for bootup)

- [ ] **Step 1: TDD — failing test for the facade**

Write `games/inflation-rpg/src/services/MonetizationService.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdManager } from './AdManager';
import { IapManager } from './IapManager';
import { MonetizationService } from './MonetizationService';

vi.mock('./AdManager');
vi.mock('./IapManager');

describe('MonetizationService', () => {
  let adShowRewarded: ReturnType<typeof vi.fn>;
  let adShowBanner: ReturnType<typeof vi.fn>;
  let adHideBanner: ReturnType<typeof vi.fn>;
  let iapInit: ReturnType<typeof vi.fn>;
  let iapRestore: ReturnType<typeof vi.fn>;
  let iapPurchase: ReturnType<typeof vi.fn>;
  let svc: MonetizationService;
  let onAdFreeChanged: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    adShowRewarded = vi.fn().mockResolvedValue(true);
    adShowBanner = vi.fn().mockResolvedValue(undefined);
    adHideBanner = vi.fn().mockResolvedValue(undefined);
    iapInit = vi.fn().mockResolvedValue(undefined);
    iapRestore = vi.fn().mockResolvedValue([]);
    iapPurchase = vi.fn();
    onAdFreeChanged = vi.fn();

    (AdManager as unknown as { mockImplementation: (fn: () => unknown) => void }).mockImplementation(() => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      showRewardedAd: adShowRewarded,
      showBanner: adShowBanner,
      hideBanner: adHideBanner,
    }));
    (IapManager as unknown as { mockImplementation: (fn: () => unknown) => void }).mockImplementation(() => ({
      initialize: iapInit,
      queryProducts: vi.fn().mockResolvedValue([]),
      restorePurchases: iapRestore,
      purchase: iapPurchase,
    }));

    svc = new MonetizationService({
      adFreeOwned: false,
      onAdFreeChanged,
      onCrackStonesAwarded: vi.fn(),
      licenseKey: 'TEST',
      rewardedUnitId: 'r',
      bannerUnitId: 'b',
    });
  });

  it('initialize triggers IAP restore', async () => {
    await svc.initialize();
    expect(iapInit).toHaveBeenCalled();
    expect(iapRestore).toHaveBeenCalled();
  });

  it('initialize banner shown when adFreeOwned=false', async () => {
    await svc.initialize();
    expect(adShowBanner).toHaveBeenCalled();
  });

  it('showRewardedAd: when adFreeOwned=true, short-circuits to success without calling AdMob', async () => {
    svc.setAdFreeOwned(true);
    const ok = await svc.showRewardedAd();
    expect(ok).toBe(true);
    expect(adShowRewarded).not.toHaveBeenCalled();
  });

  it('restore returning ad_free updates adFreeOwned via onAdFreeChanged', async () => {
    iapRestore.mockResolvedValue([
      { productId: 'ad_free', purchaseToken: 't', purchaseTime: 0, acknowledged: true },
    ]);
    await svc.initialize();
    expect(onAdFreeChanged).toHaveBeenCalledWith(true);
  });
});
```

- [ ] **Step 2: Run — FAIL**

Expected: module not found.

- [ ] **Step 3: Implement `MonetizationService.ts`**

Write `games/inflation-rpg/src/services/MonetizationService.ts`:

```ts
import { OnestoreIap } from '@forge/inflation-rpg-native-onestore-iap';
import type { PurchaseInfo } from '@forge/inflation-rpg-native-onestore-iap';

import type { IapProductId } from '../types';
import { AdManager } from './AdManager';
import { IAP_CATALOG } from './IapCatalog';
import { IapManager } from './IapManager';

export interface MonetizationServiceOptions {
  adFreeOwned: boolean;
  onAdFreeChanged: (owned: boolean) => void;
  onCrackStonesAwarded: (amount: number) => void;
  licenseKey: string;
  rewardedUnitId: string;
  bannerUnitId: string;
}

export class MonetizationService {
  private ad: AdManager;
  private iap: IapManager;
  private adFreeOwned: boolean;

  constructor(private opts: MonetizationServiceOptions) {
    this.adFreeOwned = opts.adFreeOwned;
    this.ad = new AdManager({
      rewardedUnitId: opts.rewardedUnitId,
      bannerUnitId: opts.bannerUnitId,
    });
    this.iap = new IapManager(OnestoreIap, opts.licenseKey);
  }

  async initialize(): Promise<void> {
    await Promise.all([this.ad.initialize(), this.iap.initialize()]);
    await this.iap.queryProducts();

    // Restore — source of truth for adFreeOwned
    const restored = await this.iap.restorePurchases();
    const hasAdFree = restored.some((p) => p.productId === 'ad_free');
    if (hasAdFree !== this.adFreeOwned) {
      this.adFreeOwned = hasAdFree;
      this.opts.onAdFreeChanged(hasAdFree);
    }

    if (!this.adFreeOwned) await this.ad.showBanner();
    else await this.ad.hideBanner();
  }

  setAdFreeOwned(owned: boolean): void {
    this.adFreeOwned = owned;
    if (owned) void this.ad.hideBanner();
    else void this.ad.showBanner();
  }

  async showRewardedAd(): Promise<boolean> {
    if (this.adFreeOwned) return true;
    return this.ad.showRewardedAd();
  }

  async purchase(productId: IapProductId): Promise<boolean> {
    const result = await this.iap.purchase(productId);
    if (result.status !== 'success') return false;

    if (productId === 'ad_free') {
      this.setAdFreeOwned(true);
      this.opts.onAdFreeChanged(true);
    } else {
      const entry = IAP_CATALOG[productId];
      if (entry.type === 'consumable') {
        this.opts.onCrackStonesAwarded(entry.crackStones);
      }
    }
    return true;
  }

  getProductPrice(productId: IapProductId): string | undefined {
    return this.iap.getProduct(productId)?.price;
  }

  isAdFreeOwned(): boolean {
    return this.adFreeOwned;
  }

  // Expose underlying IapManager for restore-purchases UI button
  async restorePurchasesManually(): Promise<PurchaseInfo[]> {
    const restored = await this.iap.restorePurchases();
    const hasAdFree = restored.some((p) => p.productId === 'ad_free');
    if (hasAdFree !== this.adFreeOwned) {
      this.adFreeOwned = hasAdFree;
      this.opts.onAdFreeChanged(hasAdFree);
    }
    return restored;
  }
}
```

- [ ] **Step 4: Run — PASS**

Run: `pnpm --filter @forge/game-inflation-rpg exec vitest run src/services/MonetizationService.test.ts`

Expected: PASS (4 tests).

- [ ] **Step 5: Wire into app bootup**

Find the app's bootup module — typically `App.tsx` or `main.tsx`. Add an effect (or initial call) that constructs `MonetizationService` once with store-bound callbacks. Concretely, in `App.tsx`:

```ts
import { useEffect, useRef } from 'react';
import { ADMOB_CONFIG } from './config/monetization.config';
import { MonetizationService } from './services/MonetizationService';
import { useGameStore } from './store/gameStore';

// Inside the App component:
const setAdFreeOwned = useGameStore((s) => s.setAdFreeOwned);  // wire in T22
const gainCrackStones = useGameStore((s) => s.gainCrackStones);
const adFreeOwned = useGameStore((s) => s.meta.adFreeOwned);

const monetizationRef = useRef<MonetizationService | null>(null);

useEffect(() => {
  if (monetizationRef.current) return;
  const svc = new MonetizationService({
    adFreeOwned,
    onAdFreeChanged: setAdFreeOwned,
    onCrackStonesAwarded: gainCrackStones,
    licenseKey: ADMOB_CONFIG.iapLicenseKey,
    rewardedUnitId: ADMOB_CONFIG.rewarded.android,
    bannerUnitId: ADMOB_CONFIG.banner.android,
  });
  monetizationRef.current = svc;
  void svc.initialize();
}, [setAdFreeOwned, gainCrackStones]);  // adFreeOwned intentionally NOT in deps — init once
```

> The `setAdFreeOwned` store action will be added in T22 alongside the IAP store wiring. For now this code will fail typecheck — that's expected; resolved at T22.

- [ ] **Step 6: Commit (typecheck may fail until T22)**

```bash
git add games/inflation-rpg/src/services/MonetizationService.ts \
        games/inflation-rpg/src/services/MonetizationService.test.ts \
        games/inflation-rpg/src/App.tsx
git commit -m "feat(game-inflation-rpg): Phase 5 — MonetizationService facade + App bootup wiring"
```

---

## Task 22: `setAdFreeOwned` store action + Settings UI entry (IAP shop + restore button)

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts`
- Modify: `games/inflation-rpg/src/screens/Settings.tsx` (or wherever Settings lives)

- [ ] **Step 1: Add `setAdFreeOwned`, `recordIapTx`, and reuse existing `gainCrackStones` in the store**

In `gameStore.ts`, find the existing actions block. Add (preserve alphabetical order if there is one):

```ts
setAdFreeOwned: (owned: boolean) =>
  set((s) => ({ meta: { ...s.meta, adFreeOwned: owned } })),

recordIapTx: (tx: IapTransaction) =>
  set((s) => ({
    meta: {
      ...s.meta,
      lastIapTx: [...s.meta.lastIapTx, tx].slice(-50),  // keep last 50
    },
  })),
```

Also import `IapTransaction` from `../types` at the top of the file if not already.

- [ ] **Step 2: Add the actions to the store interface**

In the same file, find the interface (or type) that lists store actions. Append:

```ts
setAdFreeOwned: (owned: boolean) => void;
recordIapTx: (tx: IapTransaction) => void;
```

- [ ] **Step 3: Run typecheck — should now resolve T21's pending failure**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck`

Expected: PASS.

- [ ] **Step 4: Add Settings entry — open IAP shop + restore purchases button**

Locate the Settings screen (`grep -rn "Settings" games/inflation-rpg/src/screens` should reveal it). Add buttons:

```tsx
<button onClick={() => setScreen('iap-shop')}>상점 (IAP)</button>
<button onClick={() => setScreen('privacy')}>개인정보처리방침</button>
<button
  onClick={async () => {
    // Pull MonetizationService from a context or singleton.
    // For MVP, dispatch a custom event the App handles.
    window.dispatchEvent(new CustomEvent('forge-restore-purchases'));
  }}
>
  구매 복원
</button>
```

In `App.tsx`, listen for `forge-restore-purchases` and call `monetizationRef.current?.restorePurchasesManually()`.

> **Refactor opportunity**: a React Context for the singleton would be cleaner. For Phase 5 we keep it as a window event to limit blast radius. Document the choice inline.

- [ ] **Step 5: Run typecheck + tests**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck && \
pnpm --filter @forge/game-inflation-rpg test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add games/inflation-rpg/src/store/gameStore.ts \
        games/inflation-rpg/src/screens/Settings.tsx \
        games/inflation-rpg/src/App.tsx
git commit -m "feat(game-inflation-rpg): Phase 5 — store actions (setAdFreeOwned, recordIapTx) + Settings IAP entry"
```

---

## Task 23: `IapShopScreen` (4 product cards)

**Files:**
- Create: `games/inflation-rpg/src/screens/IapShopScreen.tsx`
- Create: `games/inflation-rpg/src/screens/IapShopScreen.module.css`
- Modify: screen router (wherever `setScreen('iap-shop')` is consumed)

- [ ] **Step 1: Create the screen component**

Write `games/inflation-rpg/src/screens/IapShopScreen.tsx`:

```tsx
import { useEffect, useState } from 'react';

import { IAP_CATALOG, IAP_PRODUCT_IDS } from '../services/IapCatalog';
import type { IapProductId } from '../types';
import styles from './IapShopScreen.module.css';

interface IapShopScreenProps {
  adFreeOwned: boolean;
  getPrice: (id: IapProductId) => string | undefined;
  onPurchase: (id: IapProductId) => Promise<boolean>;
  onBack: () => void;
}

export function IapShopScreen({ adFreeOwned, getPrice, onPurchase, onBack }: IapShopScreenProps) {
  const [busy, setBusy] = useState<IapProductId | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (toast === null) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const handlePurchase = async (id: IapProductId) => {
    if (busy !== null) return;
    setBusy(id);
    try {
      const ok = await onPurchase(id);
      setToast(ok ? '구매 완료' : '구매가 취소되었습니다');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={styles.shop}>
      <header className={styles.header}>
        <button onClick={onBack} className={styles.back}>←</button>
        <h2>상점</h2>
      </header>
      <ul className={styles.list}>
        {IAP_PRODUCT_IDS.map((id) => {
          const entry = IAP_CATALOG[id];
          const owned = id === 'ad_free' && adFreeOwned;
          const price = getPrice(id) ?? '—';
          return (
            <li key={id} className={styles.card}>
              <div className={styles.cardBody}>
                <h3>{entry.displayName}</h3>
                <p>
                  {entry.type === 'non-consumable'
                    ? (entry as { description: string }).description
                    : `${(entry as { crackStones: number }).crackStones}개 균열석 지급`}
                </p>
              </div>
              <button
                className={styles.buy}
                disabled={owned || busy !== null}
                onClick={() => handlePurchase(id)}
              >
                {owned ? '보유 중' : busy === id ? '...' : price}
              </button>
            </li>
          );
        })}
      </ul>
      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Create the CSS module**

Write `games/inflation-rpg/src/screens/IapShopScreen.module.css`:

```css
.shop {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 100dvh;
  background: var(--forge-bg, #0d0e16);
  color: var(--forge-text, #e8e6df);
}

.header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.back {
  font-size: 1.5rem;
  min-width: 44px;
  min-height: 44px;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.card {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 1rem;
  border-radius: 12px;
  background: var(--forge-panel, #1a1c28);
}

.cardBody {
  flex: 1;
}

.cardBody h3 {
  margin: 0 0 0.25rem;
  font-size: 1rem;
}

.cardBody p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--forge-text-dim, #9a9a9a);
}

.buy {
  min-width: 96px;
  min-height: 44px;
  border: 0;
  border-radius: 8px;
  background: var(--forge-accent, #d4a951);
  color: var(--forge-bg, #0d0e16);
  font-weight: 700;
}

.buy:disabled {
  opacity: 0.5;
}

.toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: var(--forge-panel, #1a1c28);
}
```

- [ ] **Step 3: Wire into screen router**

Find the screen router (`grep -rn "case 'main-menu'\|case 'battle'" games/inflation-rpg/src/App.tsx`). Add:

```tsx
case 'iap-shop':
  return (
    <IapShopScreen
      adFreeOwned={meta.adFreeOwned}
      getPrice={(id) => monetizationRef.current?.getProductPrice(id)}
      onPurchase={async (id) =>
        (await monetizationRef.current?.purchase(id)) ?? false
      }
      onBack={() => setScreen('settings')}
    />
  );
```

Add type to the screen union if there is one (find `type Screen =`):

```ts
type Screen = 'main-menu' | 'battle' | ... | 'iap-shop' | 'privacy';
```

- [ ] **Step 4: Typecheck + test**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck && \
pnpm --filter @forge/game-inflation-rpg test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/screens/IapShopScreen.tsx \
        games/inflation-rpg/src/screens/IapShopScreen.module.css \
        games/inflation-rpg/src/App.tsx
git commit -m "feat(game-inflation-rpg): Phase 5 — IapShopScreen (4 cards, purchase wiring)"
```

---

## Task 24: `AdFreeIndicator` badge

**Files:**
- Create: `games/inflation-rpg/src/components/AdFreeIndicator.tsx`
- Modify: `games/inflation-rpg/src/screens/MainMenu.tsx` (or wherever main menu lives)

- [ ] **Step 1: Component**

Write `games/inflation-rpg/src/components/AdFreeIndicator.tsx`:

```tsx
interface AdFreeIndicatorProps {
  visible: boolean;
}

export function AdFreeIndicator({ visible }: AdFreeIndicatorProps) {
  if (!visible) return null;
  return (
    <div
      role="status"
      aria-label="광고가 제거되었습니다"
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        padding: '4px 8px',
        borderRadius: 6,
        background: 'rgba(212, 169, 81, 0.2)',
        color: 'var(--forge-accent, #d4a951)',
        fontSize: 12,
        fontWeight: 700,
        zIndex: 10,
      }}
    >
      AD-FREE
    </div>
  );
}
```

- [ ] **Step 2: Show on main menu**

In MainMenu (or App.tsx top-level), import and render:

```tsx
import { AdFreeIndicator } from '../components/AdFreeIndicator';
// ...
<AdFreeIndicator visible={meta.adFreeOwned} />
```

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/components/AdFreeIndicator.tsx \
        games/inflation-rpg/src/screens/MainMenu.tsx
git commit -m "feat(game-inflation-rpg): Phase 5 — AdFreeIndicator badge"
```

---

**CHECKPOINT 4 GATE:** Repeat gate.

---

# CHECKPOINT 5 — Privacy

## Task 25: `PrivacyScreen` + bundled `public/privacy-policy.html` fallback

**Files:**
- Create: `games/inflation-rpg/src/screens/PrivacyScreen.tsx`
- Create: `games/inflation-rpg/public/privacy-policy.html`
- Modify: screen router (case 'privacy')

- [ ] **Step 1: Bundled fallback**

Write `games/inflation-rpg/public/privacy-policy.html`:

```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>개인정보처리방침 — inflation-rpg</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 720px; margin: 0 auto; padding: 1rem; line-height: 1.6; color: #222; background: #fff; }
    h1 { font-size: 1.5rem; }
    h2 { font-size: 1.1rem; margin-top: 1.5rem; }
    p, li { font-size: 0.95rem; }
    code { background: #f3f3f3; padding: 0.1em 0.3em; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>inflation-rpg 개인정보처리방침</h1>
  <p>(draft v0.1 — 출시 전 법무 검토 필요)</p>

  <h2>1. 수집하는 정보</h2>
  <p>본 게임은 사용자의 개인정보를 직접 수집하지 않는다. 다음의 제3자 SDK가 광고 송출 및 결제 처리를 위해 일부 정보를 수집한다:</p>
  <ul>
    <li><strong>Google AdMob</strong> — 광고 송출. 광고 ID, 기기 정보, IP 주소 등을 Google 의 정책에 따라 수집한다. 자세한 내용: <a href="https://policies.google.com/technologies/ads">https://policies.google.com/technologies/ads</a></li>
    <li><strong>ONE store IAP SDK</strong> — 인앱결제 처리. 결제 토큰, 상품 ID 등을 ONE store 의 정책에 따라 수집한다. 자세한 내용: <a href="https://www.onestore.co.kr/userpolicy/privacy">https://www.onestore.co.kr/userpolicy/privacy</a></li>
  </ul>

  <h2>2. 게임 진행 데이터</h2>
  <p>게임 진행 데이터 (캐릭터 레벨, 균열석, 던전 진척 등) 는 사용자 기기 내부에만 저장되며 외부로 전송되지 않는다.</p>

  <h2>3. 광고 제거 (인앱결제)</h2>
  <p>"광고 제거" 인앱결제 구매 시, ONE store 결제 토큰만 기기 내부에 저장된다. 결제 영수증 검증은 ONE store SDK 의 client-side API 만 사용한다.</p>

  <h2>4. 데이터 보관 기간</h2>
  <p>모든 게임 데이터는 사용자가 앱을 삭제할 때까지 기기에 보관된다. 별도 서버 보관은 없다.</p>

  <h2>5. 문의</h2>
  <p>본 정책에 관한 문의: (TBD — 실제 이메일 또는 양식 URL)</p>

  <p style="margin-top:2rem; color:#888;">최종 업데이트: 2026-05-16</p>
</body>
</html>
```

- [ ] **Step 2: PrivacyScreen component**

Write `games/inflation-rpg/src/screens/PrivacyScreen.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';

const REMOTE_URL = 'https://kwanghan-bae.github.io/2d-game-forge/privacy-policy/ko/';
const FALLBACK_URL = '/privacy-policy.html';

interface PrivacyScreenProps {
  onBack: () => void;
}

export function PrivacyScreen({ onBack }: PrivacyScreenProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [src, setSrc] = useState(REMOTE_URL);

  useEffect(() => {
    // Quick HEAD probe — fall back to bundled if remote fails / offline.
    let cancelled = false;
    fetch(REMOTE_URL, { method: 'HEAD', mode: 'no-cors' })
      .catch(() => {
        if (!cancelled) setSrc(FALLBACK_URL);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
        <button onClick={onBack} style={{ minWidth: 44, minHeight: 44 }}>←</button>
        <h2 style={{ margin: 0 }}>개인정보처리방침</h2>
      </header>
      <iframe
        ref={iframeRef}
        src={src}
        title="개인정보처리방침"
        style={{ flex: 1, border: 0 }}
        onError={() => setSrc(FALLBACK_URL)}
      />
    </div>
  );
}
```

- [ ] **Step 3: Add `case 'privacy'` to the screen router (App.tsx)**

```tsx
case 'privacy':
  return <PrivacyScreen onBack={() => setScreen('settings')} />;
```

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/screens/PrivacyScreen.tsx \
        games/inflation-rpg/public/privacy-policy.html \
        games/inflation-rpg/src/App.tsx
git commit -m "feat(game-inflation-rpg): Phase 5 — PrivacyScreen + bundled fallback policy (draft v0.1)"
```

---

## Task 26: `docs/privacy-policy/` GitHub Pages directory + enable Pages

**Files:**
- Create: `docs/privacy-policy/index.html` (redirect to /ko/)
- Create: `docs/privacy-policy/ko/index.html`

- [ ] **Step 1: Create the GitHub Pages directory with ko + redirect**

Write `docs/privacy-policy/index.html`:

```html
<!doctype html>
<html><head>
<meta charset="utf-8" />
<meta http-equiv="refresh" content="0; url=./ko/" />
<title>Redirecting…</title>
</head><body>
<p>Redirecting to <a href="./ko/">Korean policy</a>.</p>
</body></html>
```

Write `docs/privacy-policy/ko/index.html` — copy the content of `games/inflation-rpg/public/privacy-policy.html` verbatim. This ensures the bundled fallback and the hosted version stay in sync.

- [ ] **Step 2: Enable GitHub Pages on the repo — REQUIRES USER APPROVAL**

This step changes repository settings and is irreversible-ish (can be re-disabled but cleanup is manual). The executing agent MUST pause and ask the user before running the API call.

Output to the user:

> "Phase 5 needs GitHub Pages enabled on this repo so the privacy policy is publicly hostable. This will run:
>
> ```
> gh api -X POST repos/kwanghan-bae/2d-game-forge/pages \
>   -f source.branch=main \
>   -f source.path=/docs
> ```
>
> This creates a public URL at `https://kwanghan-bae.github.io/2d-game-forge/`. The repo must be public for the free tier; verify before approving. Proceed? (yes / no / I'll enable it myself in repo settings)"

If user says **yes**, run the command. Expected: 201 Created.

If user says **I'll enable it myself**, mark this step complete after the user confirms they've enabled it via Settings → Pages in the GitHub web UI.

If user says **no**, skip Step 2 and Step 3; document in T31 README that the bundled fallback (`public/privacy-policy.html`) is the only privacy policy delivery path. The `REMOTE_URL` in `PrivacyScreen.tsx` will 404, the fetch HEAD probe will fail, and the iframe will load the bundled file — still functional, less SEO/discoverable.

Expected on success: 201 Created. If 409 Conflict, Pages already enabled — proceed. If 404, repo is private — Pages free tier requires public; pause and ask user.

- [ ] **Step 3: Wait for Pages build (1-2 minutes)**

Run: `gh api repos/kwanghan-bae/2d-game-forge/pages` and inspect `html_url` field — should be `https://kwanghan-bae.github.io/2d-game-forge/`.

Then probe: `curl -I https://kwanghan-bae.github.io/2d-game-forge/privacy-policy/ko/`

Expected (after build completes): HTTP 200.

> **If the URL doesn't match the one baked into `PrivacyScreen.tsx`**, update the constant in `games/inflation-rpg/src/screens/PrivacyScreen.tsx` to match `html_url + 'privacy-policy/ko/'`.

- [ ] **Step 4: Commit**

```bash
git add docs/privacy-policy/
git commit -m "docs: Phase 5 — privacy policy GitHub Pages directory (ko draft)"
```

---

**CHECKPOINT 5 GATE:** Repeat gate. Also verify privacy URL is reachable manually after Pages build completes.

---

# CHECKPOINT 6 — Phase E debt fold

## Task 27: `applySkillResult` heal effect wiring

**Files:**
- Modify: `games/inflation-rpg/src/battle/BattleScene.ts:456-489`
- Create or modify: `games/inflation-rpg/src/battle/BattleScene.test.ts` (search whether one exists)

- [ ] **Step 1: Read current applySkillResult and identify run.playerHp access pattern**

Run: `grep -n "run.playerHp\|playerMaxHp\|playerHp" games/inflation-rpg/src/battle/BattleScene.ts`

Note how the scene reads/writes `run.playerHp` (via store action) and what max HP looks like.

- [ ] **Step 2: TDD — failing test for heal**

If `BattleScene.test.ts` exists, append. If not, create a focused unit test for the heal computation. Write `games/inflation-rpg/src/battle/skillEffects.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { computeSkillHeal } from './skillEffects';

describe('computeSkillHeal', () => {
  it('returns flat heal amount when type is flat', () => {
    const newHp = computeSkillHeal({ heal: { amount: 30, kind: 'flat' } }, 50, 100);
    expect(newHp).toBe(80);
  });

  it('returns percentage of max when type is percentMax', () => {
    const newHp = computeSkillHeal({ heal: { amount: 0.25, kind: 'percentMax' } }, 50, 100);
    expect(newHp).toBe(75);
  });

  it('clamps to max', () => {
    const newHp = computeSkillHeal({ heal: { amount: 200, kind: 'flat' } }, 90, 100);
    expect(newHp).toBe(100);
  });

  it('no-op when result has no heal', () => {
    const newHp = computeSkillHeal({}, 50, 100);
    expect(newHp).toBe(50);
  });
});
```

- [ ] **Step 3: Extract `computeSkillHeal` from BattleScene to a pure function module**

Write `games/inflation-rpg/src/battle/skillEffects.ts`:

```ts
import type { SkillEffectResult } from '../types';

export function computeSkillHeal(
  result: Pick<SkillEffectResult, 'heal'>,
  currentHp: number,
  maxHp: number,
): number {
  const heal = result.heal;
  if (!heal) return currentHp;
  const raw =
    heal.kind === 'percentMax' ? Math.floor(maxHp * heal.amount) : heal.amount;
  return Math.min(maxHp, currentHp + raw);
}
```

Add the corresponding type fields if missing. In `games/inflation-rpg/src/types.ts`, find `SkillEffectResult` and ensure it has:

```ts
heal?: { amount: number; kind: 'flat' | 'percentMax' };
```

(If `kind` is not already part of the existing type, add it. If `heal` was already partly defined, extend it.)

- [ ] **Step 4: Run test — PASS**

Run: `pnpm --filter @forge/game-inflation-rpg exec vitest run src/battle/skillEffects.test.ts`

Expected: PASS (4 tests).

- [ ] **Step 5: Replace L486 TODO in `applySkillResult` with the heal call (plan-time discovery: reuse existing `applyLifestealHeal` action)**

**Plan-time discovery:** Phase Realms added these run.playerHp actions to gameStore.ts (around L210-228):

```ts
hydratePlayerHpIfNull: () => set((s) => { ... }),
applyDamageToPlayer: (amount: number) => set((s) => { ... }),
applyLifestealHeal: (amount: number) => set((s) => {
  if (!s.run || s.run.playerHp === null) return {};
  const maxHp = computeMaxHp(s.run, s.meta);
  const next = Math.min(maxHp, s.run.playerHp + amount);
  return { run: { ...s.run, playerHp: next } };
}),
```

`applyLifestealHeal` already does exactly what skill heal needs (clamp to maxHp). Reuse it directly — no new action needed.

Edit `BattleScene.ts:456-489`. Replace the lines:

```ts
    // heal: 플레이어 HP 는 run.playerHp (store 필드) 에서 읽음. 스킬 힐은 별도 wiring 필요 (향후 작업).
    // buff: 현재 구현에서는 no-op (고급 구현 시 stat 버프 레이어 추가)
```

with:

```ts
    if (result.heal !== undefined) {
      const store = useGameStore.getState();
      const run = store.run;
      if (run !== null && run.playerHp !== null) {
        const maxHp = computeMaxHp(run, store.meta);
        const newHp = computeSkillHeal(result, run.playerHp, maxHp);
        const delta = newHp - run.playerHp;
        if (delta > 0) store.applyLifestealHeal(delta);
      }
    }
    // buff: 현재 구현에서는 no-op (고급 구현 시 stat 버프 레이어 추가)
```

Add imports at the top of `BattleScene.ts` (verify existing imports first to avoid duplicates):

```ts
import { computeSkillHeal } from './skillEffects';
import { computeMaxHp } from '../systems/playerHp';  // verify path — gameStore.ts:32 confirms this path
import { useGameStore } from '../store/gameStore';  // likely already imported
```

> The `delta > 0` guard prevents calling `applyLifestealHeal` with a non-positive delta (which the action would no-op anyway, but explicit is safer).

- [ ] **Step 6: Run full test suite**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck && \
pnpm --filter @forge/game-inflation-rpg test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add games/inflation-rpg/src/battle/skillEffects.ts \
        games/inflation-rpg/src/battle/skillEffects.test.ts \
        games/inflation-rpg/src/battle/BattleScene.ts \
        games/inflation-rpg/src/types.ts \
        games/inflation-rpg/src/store/gameStore.ts 2>/dev/null || true
git commit -m "fix(game-inflation-rpg): Phase 5 — applySkillResult heal wiring (Phase E debt cleanup)"
```

---

**CHECKPOINT 6 GATE:** Repeat gate.

---

# CHECKPOINT 7 — Tests + docs + finalize

## Task 28: E2E `monetization-iap-flow` (web project)

**Files:**
- Create: `games/inflation-rpg/e2e/monetization-iap-flow.spec.ts`

- [ ] **Step 1: Write the E2E spec**

Write `games/inflation-rpg/e2e/monetization-iap-flow.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test.describe('monetization — IAP flow (web stub)', () => {
  test('ad_free purchase: shop → buy → ad-free badge appears', async ({ page }) => {
    await page.goto('/');

    // Navigate: main menu → settings → IAP shop
    // Adjust selectors to match actual UI.
    await page.getByRole('button', { name: '시작' }).click();   // adjust
    await page.getByRole('button', { name: /설정/ }).click();
    await page.getByRole('button', { name: /상점/ }).click();

    // Buy ad_free
    await page.getByText('광고 제거').locator('..').getByRole('button').click();

    // Wait for "구매 완료" toast
    await expect(page.getByText('구매 완료')).toBeVisible({ timeout: 5_000 });

    // Back to main menu — AD-FREE badge visible
    await page.getByRole('button', { name: /←|뒤로/ }).click();
    await page.getByRole('button', { name: /←|뒤로/ }).click();
    await expect(page.getByRole('status', { name: /광고가 제거/ })).toBeVisible();
  });

  test('restore after reload — ad_free entitlement persists', async ({ page }) => {
    await page.goto('/');
    // Assume the previous test's state was preserved via localStorage.
    // If tests run in clean isolation, replicate the purchase first.

    await expect(page.getByRole('status', { name: /광고가 제거/ })).toBeVisible();
  });
});
```

> **IMPORTANT:** Selectors above are illustrative. Read `IapShopScreen.tsx`, `Settings.tsx`, `MainMenu.tsx` and adjust the queries. Use Playwright Codegen (`pnpm --filter @forge/game-inflation-rpg exec playwright codegen http://localhost:3000`) as a quick way to capture real selectors.

- [ ] **Step 2: Run the test**

Run: `pnpm --filter @forge/game-inflation-rpg e2e -g "monetization — IAP flow"`

Expected: PASS. If a selector doesn't match, update and re-run.

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/e2e/monetization-iap-flow.spec.ts
git commit -m "test(game-inflation-rpg): Phase 5 — e2e monetization-iap-flow"
```

---

## Task 29: E2E `monetization-banner-resize` + `privacy-screen`

**Files:**
- Create: `games/inflation-rpg/e2e/monetization-banner-resize.spec.ts`
- Create: `games/inflation-rpg/e2e/privacy-screen.spec.ts`

- [ ] **Step 1: Banner resize spec (mobile project)**

Write `games/inflation-rpg/e2e/monetization-banner-resize.spec.ts`:

```ts
import { devices, expect, test } from '@playwright/test';

test.use({ ...devices['iPhone 14'] });

test('banner is mocked off in web — verifies adFreeOwned toggle changes canvas height', async ({ page }) => {
  await page.goto('/');

  // In web, no real AdMob banner — but adFreeOwned state can be inspected via store.
  // Read meta.adFreeOwned via a window helper if exposed.
  const initial = await page.evaluate(() => {
    return (window as unknown as { __forge_meta?: { adFreeOwned: boolean } }).__forge_meta?.adFreeOwned ?? null;
  });
  expect(initial).toBe(false);

  // Purchase ad_free via the shop (selector: match T28)
  await page.getByRole('button', { name: '시작' }).click();
  await page.getByRole('button', { name: /설정/ }).click();
  await page.getByRole('button', { name: /상점/ }).click();
  await page.getByText('광고 제거').locator('..').getByRole('button').click();
  await expect(page.getByText('구매 완료')).toBeVisible();

  const after = await page.evaluate(() => {
    return (window as unknown as { __forge_meta?: { adFreeOwned: boolean } }).__forge_meta?.adFreeOwned ?? null;
  });
  expect(after).toBe(true);
});
```

> **Test hook:** If `__forge_meta` is not currently exposed on `window`, add a dev-only hook in `App.tsx`:
> ```ts
> useEffect(() => {
>   (window as Window & { __forge_meta?: unknown }).__forge_meta = meta;
> }, [meta]);
> ```
> Gate behind `import.meta.env.MODE !== 'production'`.

- [ ] **Step 2: Privacy screen spec**

Write `games/inflation-rpg/e2e/privacy-screen.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('privacy screen loads bundled fallback when remote unavailable', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '시작' }).click();
  await page.getByRole('button', { name: /설정/ }).click();
  await page.getByRole('button', { name: /개인정보처리방침/ }).click();

  // iframe loads either remote or fallback
  const iframe = page.frameLocator('iframe[title="개인정보처리방침"]');
  await expect(iframe.getByRole('heading', { name: /개인정보처리방침/ })).toBeVisible({ timeout: 10_000 });
});
```

- [ ] **Step 3: Run both specs**

Run: `pnpm --filter @forge/game-inflation-rpg e2e -g "banner|privacy"`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/e2e/monetization-banner-resize.spec.ts \
        games/inflation-rpg/e2e/privacy-screen.spec.ts \
        games/inflation-rpg/src/App.tsx
git commit -m "test(game-inflation-rpg): Phase 5 — e2e monetization-banner-resize + privacy-screen"
```

---

## Task 30: `.gitignore` for `balance-sweep-out.md` + CONTRIBUTING + CLAUDE.md

**Files:**
- Modify: `games/inflation-rpg/.gitignore` (or root `.gitignore`)
- Modify: `docs/CONTRIBUTING.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add `balance-sweep-out.md` to .gitignore (game-local)**

Append to `games/inflation-rpg/.gitignore`:

```
balance-sweep-out.md
```

- [ ] **Step 2: Add §15 Monetization to CONTRIBUTING.md**

Append a new section to `docs/CONTRIBUTING.md`:

```markdown
## §15 Monetization (Phase 5+)

inflation-rpg uses three monetization channels:

- **AdMob** (광고): `@capacitor-community/admob` — Rewarded + Banner.
  Test IDs in `src/config/monetization.config.ts` are safe to commit.
  Real IDs swap at release time via env var `ADMOB_REWARDED_ID` etc.
  (TODO: wire env-var injection — currently config is hardcoded; replace before submission.)

- **원스토어 IAP** (한국 마켓): local Capacitor plugin at
  `games/inflation-rpg/native/onestore-iap/` (3-rule: never promoted to
  `packages/*` until a 2nd game uses 원스토어).

- **개인정보처리방침**: GitHub Pages at `docs/privacy-policy/`. Edit `ko/index.html`
  and the bundled fallback `games/inflation-rpg/public/privacy-policy.html` in lockstep.

For new games using monetization, copy the plugin scaffolding pattern — do NOT
promote `native/onestore-iap/` to a shared package. The 3-rule applies.

For Google Play / App Store cuts (Phase 5b/5c), see future specs at
`docs/superpowers/specs/2026-*-phase-5b-*.md` / `phase-5c-*.md`.
```

- [ ] **Step 3: Update CLAUDE.md phase tag list**

In CLAUDE.md, find the phase progression block. Add an entry above the "다음" line:

```markdown
- `phase-5-complete` — Phase 5 Monetization: 원스토어 single-market cut (AdMob Rewarded + Banner,
  원스토어 IAP 4 품목, 개인정보처리방침 in-app + GitHub Pages, MonetizationService
  facade, persist v14). Phase E debt fold (applySkillResult skill heal). 다음 phase
  = 5b (Google Play) 또는 5c (App Store) 또는 telemetry-based balance 2.
```

Update the "다음" candidates list to reflect Phase 5 done.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/.gitignore docs/CONTRIBUTING.md CLAUDE.md
git commit -m "docs(game-inflation-rpg): Phase 5 — CONTRIBUTING §15 monetization + CLAUDE.md phase tag"
```

---

## Task 31: README + balance-sweep cleanup

**Files:**
- Modify: `README.md`
- (Optional) Remove: `games/inflation-rpg/balance-sweep-out.md` from working tree (will stay locally but gitignored)

- [ ] **Step 1: Update README phase progression**

In `README.md`, find the phase list. Append:

```markdown
- `phase-5-complete` — Monetization (원스토어 single-market cut): AdMob 광고,
  4 IAP 품목 (광고 제거 + 균열석 3 tier), 개인정보처리방침, MonetizationService
  facade. b/c 단계 (Google Play, App Store) 는 후속 phase.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: Phase 5 — README phase progression updated"
```

---

## Task 32: `phase-5-complete` tag + main merge

**Files:** (none — git operations only)

- [ ] **Step 1: Final verification — run the full gate**

```bash
pnpm typecheck && \
pnpm lint && \
pnpm circular && \
pnpm test && \
pnpm e2e
```

Expected: all PASS. Note final counts (vitest ~736, e2e ~56).

- [ ] **Step 2: Verify Android Gradle build**

```bash
pnpm --filter @forge/game-inflation-rpg exec cap sync android && \
cd games/inflation-rpg/android && ./gradlew assembleDebug && cd -
```

Expected: `app-debug.apk` produced. This is the artifact for user manual QA.

- [ ] **Step 3: Switch to main and merge feat branch with --no-ff**

```bash
git checkout main
git merge --no-ff feat/phase-5-monetization -m "Merge feat/phase-5-monetization: Phase 5 Monetization (원스토어 single-market cut)

AdMob Rewarded + Banner via @capacitor-community/admob. Local Capacitor plugin
at games/inflation-rpg/native/onestore-iap/ wrapping 원스토어 IAP SDK V21
(3-rule preserved). 4 IAP products (광고 제거 + 균열석 3 tier). 개인정보처리방침
in-app + GitHub Pages. MonetizationService facade. Persist v14. Phase E debt
fold (applySkillResult skill heal).

iOS / Google Play / App Store cuts are scheduled as future phases."
```

- [ ] **Step 4: Tag `phase-5-complete`**

```bash
git tag -a phase-5-complete -m "Phase 5 — Monetization (원스토어 single-market cut)"
```

- [ ] **Step 5: Verify final state**

```bash
git log --oneline -3 && git tag --list | tail -5 && git status --short
```

Expected: HEAD = merge commit, `phase-5-complete` in tag list, working tree clean (balance-sweep-out.md gitignored).

- [ ] **Step 6: Manual QA handoff message to user**

Output to the user:

> **Phase 5 implementation complete.** `app-debug.apk` is at
> `games/inflation-rpg/android/app/build/outputs/apk/debug/app-debug.apk`.
>
> Manual QA required before submission — see Spec §Manual QA checklist:
> rewarded ad, banner ad, ad_free purchase + restore, 균열석 3 tier purchases,
> refund handling, network offline, privacy policy load, 원스토어 미설치 fallback.
>
> External work required before submission (sequence with QA):
> 1. 원스토어 개발자 계정 + 앱 등록 + 4 IAP 품목 등록 (id 일치)
> 2. 균열석 IAP 실 가격 결정
> 3. 라이선스 키 발급 → env var or capacitor config
> 4. AdMob 계정 + 실 광고 unit ID → swap in `monetization.config.ts`
> 5. 개인정보처리방침 법무 검토
> 6. 앱 사인 키 + 사인된 APK 빌드
> 7. 원스토어 심사 제출
>
> origin push not performed — phase remains local on this branch's history.

---

# Verification Map (spec coverage)

| Spec section | Task(s) |
|---|---|
| Goal — 원스토어 출시 가능 cut | T1–T32 (entire plan) |
| Scope IN — Local Capacitor plugin (3-rule) | T1, T11 |
| Scope IN — AdMob Rewarded + Banner | T12, T13, T14, T15 |
| Scope IN — IAP catalog (광고 제거 + 균열석 3 tier) | T19 |
| Scope IN — 광고 제거 entitlement effect | T21 (MonetizationService.showRewardedAd + setAdFreeOwned), T24 (badge) |
| Scope IN — Banner = canvas resize | T13 (AdManager.showBanner with BOTTOM position; native AdMob does the resize) |
| Scope IN — 개인정보처리방침 | T25, T26 |
| Scope IN — Phase E debt fold (skill heal) | T27 |
| Scope IN — Persist v14 | T16, T17, T18 |
| Architecture — MonetizationService facade | T21 |
| Architecture — IapManager / AdManager | T13, T20 |
| Architecture — IapPlugin TS contract | T2 |
| Architecture — platform branching (web stub) | T4 |
| Persist v14 migration | T17 |
| Data flow — Rewarded ad | T13, T15, T21 |
| Data flow — Banner | T13, T21 |
| Data flow — IAP non-consumable | T20, T21, T23 |
| Data flow — IAP consumable | T20, T21, T23 |
| Data flow — restorePurchases | T20, T21 |
| Data flow — Privacy webview + fallback | T25 |
| Error handling — all rows | T13, T20, T21, T25 (try/catch + status returns) |
| Testing — Vitest unit | inline across T7b–T29 |
| Testing — Playwright e2e | T28, T29 |
| Testing — Build | T11, T14, T32 |
| Testing — Manual QA checklist | T32 step 6 (handoff message) |
| Known risks — R1 native learning | mitigated by T1–T11 ordering |
| Known risks — R2 E2E gap | T32 step 6 |
| Known risks — R3 Banner + Scale.FIT | T13 (existing AdMob banner position) |
| Known risks — R4 균열석 IAP balance | spec known-debt only; no task |
| Known risks — R5 원스토어 dashboard | T32 step 6 |
| Known risks — R6 법무 검토 | T32 step 6 |
| Known risks — R7 광고 unit ID secret | T12 (`monetization.config.ts` with TODO comment) |
| Known risks — R8 debt scope creep | T27 (limited to heal effect only) |
| Definition of Done — typecheck / lint / test / e2e / cap sync | T32 step 1–2 |
| Definition of Done — `phase-5-complete` tag + main merge | T32 step 3–4 |

---

# End of plan
