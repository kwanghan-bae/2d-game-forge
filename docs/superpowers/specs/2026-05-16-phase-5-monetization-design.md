# Phase 5 — Monetization (원스토어 single-market cut)

## 한 줄 요약

inflation-rpg 를 **원스토어 출시 가능한 상태**로 만든다. AdMob (Rewarded +
Banner), 원스토어 IAP (광고 제거 + 균열석 3 tier), 개인정보처리방침, Phase E
잔여 polish 까지. b/c 단계 (Google Play, App Store) 는 다음 phase 로 분리.

## 배경

Phase Realms 종료 후 inflation-rpg 의 게임 시스템 (전투, 던전, ascension,
나침반 등) 은 사실상 완성. 다음 갈림길이 **출시 준비** 와 **추가 콘텐츠**
사이였고, 출시 critical path 인 monetization 을 먼저 결정.

Phase E 가 이미 `rewarded ad stub` 을 두어 ascension boost 와 광고를 연결한
모델을 정의했다. Phase F-1 의 균열석은 ascension currency 로 자리잡았다.
Phase 5 는 이 두 stub 위에 실 SDK 와 IAP 카탈로그를 wire.

출시 전략은 사용자 결정에 따라 **a → b → c 단계 출시** (원스토어 → Google
Play → App Store). 각 마켓의 QA 절차가 분리되어 있어 한 마켓씩 끝내는 게
risk 분산. 이번 phase 5 = **a (원스토어 only)**.

## Scope

### IN

- 자체 Capacitor plugin: `games/inflation-rpg/native/onestore-iap/` (로컬,
  3-rule 준수 — `packages/*` 로 승격 안 함)
- `@capacitor-community/admob` 통합 — Rewarded + Banner
- 원스토어 IAP 카탈로그 (4 품목):
  - 광고 제거 (non-consumable, 1)
  - 균열석 묶음 (consumable, 3 tier)
- 광고 제거 IAP entitlement 효과 = **banner 영구 숨김 + rewarded video 자동
  보상 (광고 노출 skip)**
- Banner = Phaser canvas resize (Scale.FIT 영역 줄임)
- 개인정보처리방침 — GitHub Pages 호스팅 (이 레포의 `docs/privacy-policy/`)
  + in-app webview + bundled fallback
- Phase E 잔여 polish: `applySkillResult` 의 skill heal effect wiring
- Persist v14 (광고 제거 entitlement + IAP 이력)

### OUT

- iOS 빌드 / StoreKit / ATT prompt (모두 다음 phase)
- Google Play Billing / RevenueCat (다음 phase)
- 실제 원스토어 dashboard 등록 / 심사 제출 (사용자 작업)
- 실제 AdMob 계정 / 광고 unit ID (테스트 ID 로 개발, 사용자가 출시 직전 교체)
- 실제 균열석 IAP 가격 결정 (placeholder, 사용자가 dashboard 에서 정함)
- 13 비핵심 캐릭터 / 20 던전 확장 / Balance 2 (다른 phase)
- 시즌 패스 / 구독 (다른 phase)
- Receipt 의 server-side 검증 (client-only, indie 표준)

## 결정 (브레인스토밍 Q&A)

| Q | 결정 | 비고 |
|---|---|---|
| 다음 phase 방향 | **A (Monetization) + E (잔여) fold** | 출시 critical path |
| 수익화 모델 범위 | **c — 풀스택** | 광고 + IAP + ATT + 개인정보처리방침 (단 ATT 는 iOS only 라 이번 phase 무관) |
| 플랫폼 | **d — 양쪽 코드, 사용자가 한쪽씩 출시** → Q8 에서 **원스토어 only** 로 좁힘 | |
| IAP 카탈로그 | **b — 광고 제거 + 균열석 3 tier** | F-1 currency 재사용, 신규 시스템 없음 |
| 광고 종류 | **c — Rewarded + Banner** | 광고 제거 IAP 가치 명확. Banner = canvas resize |
| 백엔드 서버 | **a — client-only IAP 검증** | indie 표준 |
| Plugin 선택 | **a → 좁혀서 원스토어 자체** | RevenueCat 은 원스토어 미지원 (조사 결과) |
| 출시 마켓 | **a 단독 (원스토어), 그 다음 b (Google Play), 그 다음 c (App Store)** | 단계 출시, QA 분리 |
| 원스토어 plugin 부재 대응 | **a — 자체 Capacitor plugin 작성** | community plugin 없음 (web search 0 hit) |
| Phase 분할 | **α — 단일 phase** | inflation-rpg 패턴 일관 |
| Plugin 위치 (advisor 발견) | `games/inflation-rpg/native/onestore-iap/` **local plugin** | 3-rule 준수 |
| 광고 제거 정확한 효과 | banner 숨김 + rewarded 자동 보상 | UX 표준 |
| 균열석 IAP balance | Phase 1 spec 가정 깨짐 — `Known balance debt` 로 명시 | 출시 후 D-2 telemetry tuning |
| Banner + Scale.FIT | **canvas resize** (banner 아래 canvas) | AdMob 표준 |
| Privacy 호스팅 | **GitHub Pages (이 레포)** | 무료, 통제 가능 |

## Architecture

### 계층 구조

```
inflation-rpg (game)
  ├─ React Shell
  │    └─ MonetizationService                  (TS singleton, 광고/IAP facade)
  │         ├─ AdManager                       (AdMob: rewarded, banner)
  │         └─ IapManager                      (원스토어: query, purchase, ack, restore)
  ├─ Phaser BattleScene                        (rewarded boost 호출 지점 = MonetizationService)
  ├─ Zustand store (run/meta)                  (adFreeOwned, lastIapTx, crackStones)
  ├─ Persist v14 migration                     (v13 → v14)
  └─ native/onestore-iap/                      (로컬 Capacitor plugin, 3-rule 준수)
       ├─ android/                             (Kotlin: PurchaseClient wrap)
       ├─ ios/                                 (stub: throw 'unsupported')
       ├─ src/definitions.ts                   (IapPlugin TS contract)
       ├─ src/index.ts                         (registerPlugin)
       └─ src/web.ts                           (browser stub for dev-shell + Playwright)
```

### 의존 방향 (CLAUDE.md 단방향)

- `MonetizationService` → `AdManager`, `IapManager` (facade)
- `IapManager` → local plugin (`@/native/onestore-iap` 또는 상대 경로)
- `AdManager` → `@capacitor-community/admob`
- Phaser scene → Zustand store (manager 통해, 직접 plugin 호출 안 함)
- 어떤 코드도 `packages/*` 에서 plugin 구현을 import 하지 않음 (3-rule).

### IapPlugin TS contract

```ts
export interface ProductInfo {
  productId: string;
  type: 'consumable' | 'non-consumable';
  title: string;
  description: string;
  price: string;          // 로컬라이즈된 가격 문자열 ("₩1,200")
  priceAmountMicros: number;
  priceCurrencyCode: string;
}

export interface PurchaseInfo {
  productId: string;
  purchaseToken: string;
  purchaseTime: number;   // unix ms
  acknowledged: boolean;
}

export interface PurchaseResult {
  status: 'success' | 'canceled' | 'failed';
  purchase?: PurchaseInfo;
  errorCode?: number;
  errorMessage?: string;
}

export interface IapPlugin {
  initialize(opts: { licenseKey: string }): Promise<void>;
  queryProducts(productIds: string[]): Promise<ProductInfo[]>;
  purchase(productId: string): Promise<PurchaseResult>;
  acknowledge(purchaseToken: string): Promise<void>;
  restorePurchases(): Promise<PurchaseInfo[]>;
  addListener(
    event: 'purchaseUpdated',
    cb: (p: PurchaseInfo) => void,
  ): { remove: () => Promise<void> };
}
```

### 플랫폼 분기

```ts
import { Capacitor, registerPlugin } from '@capacitor/core';

const plugin = registerPlugin<IapPlugin>('OnestoreIap', {
  web: () => import('./web').then((m) => new m.WebIapPlugin()),
});

// 런타임에 Capacitor.getPlatform() === 'ios' 면 'unsupported' 던짐
```

## Components

### 신규 파일 (~25)

```
games/inflation-rpg/native/onestore-iap/
  package.json                                       private workspace (3-rule)
  capacitor-plugin.json                              Capacitor plugin 메타
  src/definitions.ts                                 IapPlugin TS contract
  src/index.ts                                       registerPlugin
  src/web.ts                                         WebIapPlugin (mock success)
  android/
    build.gradle                                     원스토어 maven repo
    src/main/AndroidManifest.xml                     원스토어 권한
    src/main/java/com/forge/onestore/OnestoreIapPlugin.kt   PurchaseClient wrap
    src/main/java/com/forge/onestore/IapBridge.kt          Listener wiring
  ios/
    OnestoreIapPlugin.swift                          throw 'unsupported'

games/inflation-rpg/src/services/
  MonetizationService.ts                             facade singleton
  AdManager.ts                                       AdMob (rewarded + banner)
  IapManager.ts                                      원스토어 facade
  IapCatalog.ts                                      4 품목 상수

games/inflation-rpg/src/ui/IapShop/
  IapShopScreen.tsx
  IapProductCard.tsx
  IapShop.module.css

games/inflation-rpg/src/ui/PrivacyPolicy/
  PrivacyScreen.tsx

games/inflation-rpg/src/ui/
  AdFreeIndicator.tsx                                'AD-FREE' 배지

games/inflation-rpg/public/
  privacy-policy.html                                in-app fallback (한국어)

games/inflation-rpg/docs/privacy-policy/             GitHub Pages dir
  index.html                                         redirect to ko/
  ko/index.html
  en/index.html                                      선택 (다음 phase 가능)

games/inflation-rpg/scripts/
  build-android-onestore.sh                          원스토어 buildVariant 빌드
```

### 변경 파일 (~12)

```
src/store/metaSlice.ts                               adFreeOwned, lastIapTx[]
src/store/persistVersion.ts                          v13 → v14 migration
src/scene/BattleScene.ts                             rewarded 호출 → MonetizationService
                                                     + skill heal wiring (E debt)
src/ui/MainMenu.tsx                                  Settings → Privacy 진입점
src/ui/Settings.tsx                                  IAP 상점 + restore purchases 버튼
src/App.tsx 또는 src/index.tsx                      MonetizationService.initialize() 부팅 시
capacitor.config.ts                                  Banner safe-area, plugin 등록
games/inflation-rpg/package.json                     @capacitor-community/admob 추가
android/app/build.gradle                             maven repo + 원스토어 SDK
android/app/src/main/AndroidManifest.xml             onestore 권한, AdMob app ID
docs/CONTRIBUTING.md                                 §15 Monetization
CLAUDE.md                                            Phase 5 tag + monetization 섹션
README.md                                            진척 갱신
```

## Data flow

### 광고 (Rewarded)

```
사용자: GameOver → "광고 보고 ascension boost"
  │
  ▼
React: MonetizationService.showRewardedAd()
  │
  ├─ if (meta.adFreeOwned)  →  grantBoost(); resolve(true)   [광고 skip]
  │
  └─ else  →  AdManager.showRewardedAd()
                  │
                  ├─ AdMob.prepareRewardVideoAd(adUnitId)
                  ├─ AdMob.showRewardVideoAd()
                  ├─ on('rewardedVideoCompleted') → grantBoost(); resolve(true)
                  └─ on('rewardedVideoDismissed') → resolve(false)
```

### 광고 (Banner)

```
App.tsx mount:
  if (!meta.adFreeOwned)  →  AdManager.showBanner('BOTTOM')
                                │
                                └─ canvas height = window.innerHeight - banner_height
                                   safe-area-inset-bottom 갱신, Phaser Scale.refresh()

광고 제거 IAP 구매 직후:
  AdManager.hideBanner()  →  canvas height 복귀
```

### IAP — 광고 제거 (non-consumable)

```
사용자: IapShopScreen → "광고 제거" → "구매"
  │
  ▼
IapManager.purchase('ad_free')
  │
  ├─ plugin.purchase('ad_free')
  │     ├─ Android: PurchaseClient.launchPurchaseFlow()  →  원스토어 결제 UI
  │     ├─ Web stub: setTimeout 200ms  →  mock success
  │     └─ onPurchaseUpdated listener 발화
  │
  ├─ on success:
  │     ├─ plugin.acknowledge(purchaseToken)
  │     ├─ store.setAdFreeOwned(true)
  │     ├─ AdManager.hideBanner()
  │     └─ meta.lastIapTx.push({ id: 'ad_free', ts, purchaseToken })
  │
  └─ on cancel/error: 토스트
```

### IAP — 균열석 (consumable)

```
사용자: IapShopScreen → "균열석 묶음 X" → 구매
  │
  ▼
IapManager.purchase('crack_stone_pack_small'|'_mid'|'_large')
  │
  ├─ 결제 → onPurchaseUpdated
  ├─ plugin.acknowledge(purchaseToken)                   [consumable 도 ack]
  ├─ store.gainCrackStones(IAP_CATALOG[id].crackStones)  [10 / 60 / 150]
  └─ meta.lastIapTx.push(...)
```

### restorePurchases (재설치 / 환불)

```
앱 부팅 → MonetizationService.initialize()
  │
  ├─ IapManager.initialize(licenseKey)
  └─ IapManager.restorePurchases()
       │
       └─ plugin.restorePurchases()  →  보유 non-consumable 목록
            │
            ├─ ad_free 포함  →  store.setAdFreeOwned(true)
            └─ ad_free 미포함  →  store.setAdFreeOwned(false)
                                  (refund 가능 — 사용자에게 토스트)
```

### 개인정보처리방침

```
MainMenu → Settings → "개인정보처리방침" → PrivacyScreen
  │
  ├─ try in-app webview load
  │     https://kwanghan-bae.github.io/2d-game-forge/privacy-policy/ko/
  │
  └─ on network error / offline:
       fallback to bundled public/privacy-policy.html
```

## Persist v14

### Version chain

```
v8 → v9 → v10 → v11 → v12 → v13 → v14
```

기존 chain 은 모두 정상 동작 (Phase Realms e2e v9-migration 갱신 시 cover).
v14 만 새로 추가.

### v13 → v14 migration

```ts
function migrateV13ToV14(state: MetaStateV13): MetaStateV14 {
  return {
    ...state,
    adFreeOwned: false,
    lastIapTx: [],
  };
}
```

### MetaState 신규 필드

```ts
interface MetaState {
  // ... 기존 필드 (캐릭터 레벨, 균열석, ascension tree, compass, realms 등)

  // Phase 5 신규
  adFreeOwned: boolean;          // 광고 제거 IAP 보유
  lastIapTx: IapTransaction[];   // IAP 거래 이력 (디버깅 / CS 대응용)
}

interface IapTransaction {
  productId: 'ad_free' | 'crack_stone_pack_small' | 'crack_stone_pack_mid' | 'crack_stone_pack_large';
  ts: number;
  purchaseToken: string;
  // 가격은 저장 안 함 — 원스토어 dashboard 가 authoritative
}
```

### IAP 카탈로그 (코드 상수)

```ts
// IapCatalog.ts
export const IAP_CATALOG = {
  ad_free: {
    id: 'ad_free',
    type: 'non-consumable' as const,
    displayName: '광고 제거',
    description:
      '하단 배너 광고가 영구히 사라지고, ' +
      '보상형 광고를 보지 않아도 자동으로 보상을 받습니다.',
  },
  crack_stone_pack_small: {
    id: 'crack_stone_pack_small',
    type: 'consumable' as const,
    displayName: '균열석 작은 묶음',
    crackStones: 10,
  },
  crack_stone_pack_mid: {
    id: 'crack_stone_pack_mid',
    type: 'consumable' as const,
    displayName: '균열석 중간 묶음',
    crackStones: 60,
  },
  crack_stone_pack_large: {
    id: 'crack_stone_pack_large',
    type: 'consumable' as const,
    displayName: '균열석 큰 묶음',
    crackStones: 150,
  },
} as const;
```

가격은 원스토어 dashboard 가 authoritative — 코드에 가격 안 둔다. UI 는
`queryProducts` 결과의 `price` 필드 (로컬라이즈 문자열) 표시.

## Error handling

### 광고 (AdMob)

| 시나리오 | 처리 |
|---|---|
| `prepareRewardVideoAd` 실패 (네트워크 / no fill) | rewarded 버튼 비활성 + "광고를 불러올 수 없습니다" 토스트 |
| `showRewardVideoAd` 도중 dismiss | `resolve(false)`, boost 미지급 |
| Banner 로딩 실패 | 조용히 실패, canvas resize 발생 안 함 |
| AdMob SDK init 실패 | `AdManager` 메서드 = no-op, 게임 진행 막지 않음 |

### IAP (원스토어)

| 시나리오 | 처리 |
|---|---|
| `initialize` 실패 (원스토어 앱 미설치) | `IapManager.isAvailable() = false`, 상점 진입 시 안내 |
| `purchase` 사용자 취소 | UI 상태 복귀, 토스트 없음 |
| 결제 성공했으나 `acknowledge` 실패 | `meta.pendingAck[]` 큐에 저장, 다음 부팅 시 재시도 |
| 결제 + ack 성공했으나 store 업데이트 실패 (crash) | 다음 부팅 `restorePurchases` 가 source of truth |
| 중복 구매 시도 (이미 ad_free 보유) | 카탈로그 단에서 막음, 토스트 |
| Refund (사용자가 원스토어에서 환불) | 다음 부팅 `restorePurchases` 가 catch, `adFreeOwned = false` 자동 |
| Web stub | 항상 success, 200ms 지연 |

### 광고 제거 entitlement 복구

| 시나리오 | 처리 |
|---|---|
| 신규 설치 + 동일 계정 | 부팅 시 `restorePurchases` 자동 → 복구 |
| 다른 계정으로 로그인 | 보유 없음 → `adFreeOwned = false`, 본인 계정 안내 |

### 원칙

- 결제 실패는 사용자에게 명확히 알림
- 광고 실패는 조용히
- 상태 깨짐은 다음 부팅 시 `restorePurchases` 로 복구
- 모든 IAP 코드는 `try/catch` 로 game crash 방지

## Testing

### A. Claude-verifiable (자동화)

**Vitest unit / integration** (기존 711 + 신규 ~25):

- `MonetizationService` facade — init 시 restorePurchases 자동 호출
- `AdManager` — `adFreeOwned=true` 시 showRewardedAd 즉시 grantBoost (mock)
- `IapManager` — purchase state transition (pending → success → ack),
  pendingAck retry 큐
- `IapCatalog` — 4 품목 무결성 (id, type, crackStones 일치)
- `metaSlice` — `setAdFreeOwned`, `gainCrackStones` 호출 wiring
- `persistVersion` v13→v14 migration
- Web stub plugin — mock callback 발화

**Playwright E2E** (기존 50 + 신규 ~6):

- `monetization-iap-flow` (web project) — IAP 상점 → 광고 제거 구매 →
  adFreeOwned=true → 부팅 후 restore
- `monetization-banner-resize` (mobile project) — adFreeOwned OFF/ON 시 canvas
  height 변화
- `monetization-rewarded-skip` — adFreeOwned=true 시 rewarded 버튼이 즉시 boost
- `v13-migration` (또는 `v9-migration` 갱신) → v14 chain 점검
- `privacy-screen` — Settings → Privacy 진입 후 webview 로드

**Build / typecheck / lint**:

- `pnpm typecheck` — 0 error
- `pnpm lint` — 0 (boundary: plugin 이 `packages/*` import 안 됨)
- `pnpm circular` — 0
- `pnpm --filter @forge/game-inflation-rpg build:android` — Gradle
  assembleDebug 성공
- Plugin `package.json` `private: true` 확인

### B. User-must-verify (manual QA, spec 끝 체크리스트)

실 Android 기기 + 원스토어 앱 + sandbox 계정 필요 — Claude 자동화 불가.
**섹션 `Manual QA checklist` 참조**.

### 분리 이유

자동 테스트 통과해도 출시 가능 보장 안 됨. 사용자가 QA 항목 손수 확인.
spec 에서 분리해서 미리 알린다.

## Known risks

### R1. Native Android plugin authoring 학습 곡선

원스토어 SDK 의 Kotlin wrapping 은 inflation-rpg 가 처음 native 코드를 쓰는
지점. 기존 phase 는 모두 TS/React/Phaser.

- Risk: Gradle 의존성 충돌, Capacitor plugin lifecycle, AndroidManifest 권한
- Mitigation: 작업 초기에 `@capacitor-community/admob` 의 Android 코드를
  reference 로 패턴 학습
- Mitigation: plugin 작업을 phase 의 가장 앞에 배치 — 막히면 다른 작업 잠그지
  않음

### R2. 결제 flow 의 E2E 자동화 불가

- Risk: 자동 테스트 통과 후 실 기기에서 깨지는 경우 출시 직전 발견
- Mitigation: 섹션 `Manual QA checklist` 명시. plugin 1차 cut 완성 직후 사용자
  부분 검증 권장

### R3. Phaser canvas + Banner resize 충돌

- Risk: Phase 4a safe-area / viewport-fit=cover 와 banner native overlay 상호작용
- Mitigation: Banner 노출/숨김 시 `Phaser Scale.refresh()` 패턴. Playwright
  mobile project 의 viewport 테스트로 cover

### R4. 균열석 IAP 가 Phase 1 balance 가정 깸

- Phase 1 balance 는 "균열석 = F-1 ascension 자연 진행" 가정으로 simulate
- 균열석 IAP 추가 시 curve 단축 가능 (현질 사용자)
- Mitigation: 섹션 `Known balance debt` 기록. 출시 후 telemetry tuning 시
  Phase 2 balance patch (D-2) 로 다룬다. **이번 phase 에선 simulate 시도 안 함**

### R5. 원스토어 dashboard 외부 의존

- 원스토어 sandbox 계정, IAP 품목 등록, 라이선스 키, 심사 메타데이터 등은
  사용자 별도 작업
- 가격은 dashboard authoritative
- 빌드 검증은 placeholder key 로 통과, 실 출시 시 `.env` 또는 환경변수 교체

### R6. 개인정보처리방침 법무 검토

- 한국 개인정보보호법 / GDPR / AdMob personalize ad 동의 등
- Mitigation: 초안은 표준 템플릿 + AdMob 광고 사용 / 본 게임의 데이터 수집
  (없음 / 광고 SDK 만) 명시. **법무 검토는 사용자 별도 작업** — spec 명시

### R7. AdMob 광고 unit ID 시크릿 처리

- 실 광고 unit ID 는 git history 에 들어가면 안 됨 (도용 risk)
- Mitigation: `.env.local` 또는 Capacitor plugin config 로 빌드 시 주입. 코드
  에는 테스트 ID 만

### R8. Phase E debt cleanup scope creep

- skill heal wiring 작은 작업이지만 깊이 파면 다른 effect 미연결 발견 가능
- Mitigation: 명시한 `applySkillResult` heal effect 만. 다른 effect 류는 본
  phase 범위 밖

## Known balance debt

Phase 1 (`docs/superpowers/specs/2026-05-10-phase-balance-patch-design.md`)
의 §5.1 곡선은 균열석 = F-1 자연 ascension 진행 가정. Phase 5 에서 균열석
IAP 가 자연 진행을 단축 가능 (현질 시):

- 작은 묶음 = ~F-1 자연 1-2회 분량
- 중간 묶음 = ~F-1 자연 5-8회 분량
- 큰 묶음 = ~F-1 자연 12-15회 분량

**이번 phase 에선 simulate 시도 안 함**. 출시 후 telemetry 기반 Phase 2
balance patch (D-2 / Phase 1-차기) 로 다음 곡선 정합화. 그 phase 의 입력은:

- IAP 구매 분포 (소형/중형/대형 비율)
- ascension 평균 도달 시간 (자연 vs 혼합)
- 광고 제거 IAP 보유율

## Task 진행 순서 (~26-30 task)

### Group A — Native plugin (먼저, R1 우선 해소)

1. `games/inflation-rpg/native/onestore-iap/` 디렉토리 + package.json +
   capacitor-plugin.json
2. `src/definitions.ts` (IapPlugin TS contract)
3. `src/index.ts` (registerPlugin)
4. `src/web.ts` (browser stub — mock success 200ms)
5. Android: `build.gradle` (Maven repo + dependency) + `AndroidManifest.xml`
6. Android: `OnestoreIapPlugin.kt` — PurchaseClient init + queryProducts
7. Android: purchase + acknowledge + listener wiring
8. Android: queryPurchases (restore)
9. iOS stub: throw 'unsupported'

### Group B — AdMob 통합

10. `@capacitor-community/admob` 의존성 + Capacitor config
11. `AdManager.ts` (rewarded prepare/show, banner show/hide)
12. AndroidManifest: AdMob app ID (테스트 ID)
13. BattleScene 의 rewarded 호출 → `MonetizationService.showRewardedAd`

### Group C — Persist + Meta

14. `MetaState.adFreeOwned` + `lastIapTx[]` 필드
15. v13 → v14 migration
16. Vitest persist coverage + e2e v9-migration chain 갱신

### Group D — IAP 게임 wiring

17. `IapCatalog.ts` 상수
18. `IapManager.ts` — purchase / restore / pendingAck retry 큐
19. `MonetizationService.ts` facade + 부팅 시 init/restore
20. `IapShopScreen` 컴포넌트 (4 카드 + 가격 표시)
21. `AdFreeIndicator` 배지 + Banner show/hide entitlement 분기
22. Settings → IAP 상점 진입점 + restore purchases 버튼

### Group E — Privacy + UI

23. `PrivacyScreen` + `public/privacy-policy.html` (in-app fallback)
24. `docs/privacy-policy/` GitHub Pages 디렉토리 (ko/index.html 초안)

### Group F — Phase E debt fold

25. BattleScene `applySkillResult` skill heal effect wiring

### Group G — Tests + docs + finalize

26. Vitest 신규 ~25
27. Playwright E2E 신규 ~6
28. `docs/CONTRIBUTING.md §15 — Monetization`
29. README + CLAUDE.md phase tag 갱신
30. `git tag phase-5-complete` + commit + main merge

## Definition of Done

| 항목 | 기준 |
|---|---|
| `pnpm typecheck` | 0 error |
| `pnpm lint` | 0 error (boundaries) |
| `pnpm circular` | 0 |
| `pnpm test` | ~736 passed (711 + 신규 25) |
| `pnpm e2e` | ~56 passed (50 + 신규 6) |
| `pnpm --filter @forge/game-inflation-rpg build:android` | Gradle assembleDebug 성공 (apk 생성) |
| Persist | v13 → v14 chain 점검 (e2e + unit) |
| Balance milestone | 회귀 0 (Phase E baseline 유지, mythic-OFF) |
| `phase-5-complete` 태그 | main 단일 머지 후 부착 |
| Manual QA checklist | spec 끝에 명시 (Claude 가 확인하지 않음, 사용자 별도) |

## Manual QA checklist

**Claude 가 확인할 수 없는 항목** — 사용자 (개발자 본인) 가 plugin 1차 cut
완성 후, 그리고 phase 종료 후 손수 검증.

- [ ] **Rewarded ad** — 실 Android 기기 + AdMob 테스트 ID 로 광고 노출 / 보상
      지급 확인
- [ ] **Banner ad** — 화면 하단 노출, canvas 영역이 banner 위로 줄어드는지
- [ ] **광고 제거 IAP 구매** — 원스토어 sandbox 계정 (개발자 본인) 으로 결제
      → 즉시 banner 사라짐, rewarded 자동 보상
- [ ] **균열석 IAP 3 tier 구매** — 각 구매 후 정확한 균열석 수량 지급 (10/60/150)
- [ ] **restorePurchases** — 앱 재설치 → 동일 계정 → adFreeOwned 복구
- [ ] **환불 처리** — 원스토어에서 환불 → 부팅 후 adFreeOwned=false 자동
- [ ] **네트워크 끊김** — 비행기 모드 → 결제 시도 → 안내 / 크래시 없음
- [ ] **개인정보처리방침** — Settings → Privacy → GitHub Pages URL 로드 /
      오프라인 fallback
- [ ] **원스토어 앱 미설치** — 일반 폰에 APK 설치 → 상점 진입 시 "원스토어를
      통해서만 결제" 안내
- [ ] **여러 화면 비율** — 작은 폰 / 큰 폰 / 태블릿에서 banner + canvas 정합

## 출시-준비 외부 작업 (사용자 별도)

이 phase 종료 후 사용자가 직접:

1. **원스토어 개발자 계정 등록 + 앱 등록** (https://dev.onestore.co.kr/)
2. **원스토어 dashboard 에 4 IAP 품목 등록** (id 코드 위 카탈로그와 일치 필요)
3. **균열석 IAP 실 가격 결정** (예: ₩1,200 / ₩4,900 / ₩12,000)
4. **라이선스 키 발급** + 빌드 환경에 주입
5. **AdMob 계정 생성** + 광고 unit ID 발급 + 빌드 환경에 주입
6. **개인정보처리방침 법무 검토** + GitHub Pages 배포
7. **앱 사인 키 생성** + 사인된 APK 빌드
8. **원스토어 심사 제출** (메타데이터, 스크린샷, 등급 등)

이상 작업은 phase 의 코드 작업과 직교 — 본 phase 의 코드는 위 작업이 완료된
순간 swap-in 가능한 상태.

## Phase 후 — b/c 단계 인계

본 phase 종료 후 사용자가 원스토어 출시까지 가면, 다음 phase 는:

- **Phase 5b — Google Play 출시 cut**: `@capacitor-community/admob` 동일,
  IAP 는 RevenueCat (옵션 b) 또는 `@capacitor-community/in-app-purchases`
  로 교체 / 추가. 양 마켓 빌드 분리 또는 build-time flag.
- **Phase 5c — App Store 출시 cut**: iOS 빌드 + StoreKit + ATT prompt.
  RevenueCat 이 iOS/Android 통합이라 5b 가 RevenueCat 으로 가면 5c 의 코드는
  적음.

각 phase 의 spec 은 각자 시점에 작성.

## 참고 — 사용 자료

- 원스토어 IAP SDK V21 공식 (Maven): https://onestore-dev.gitbook.io/dev/eng/tools/billing/v21/sdk
- 원스토어 IAP SDK GitHub: https://github.com/ONE-store/inapp-sdk
- `@capacitor-community/admob`: https://github.com/capacitor-community/admob
- Capacitor 6 plugin authoring: https://capacitorjs.com/docs/plugins/creating-plugins

