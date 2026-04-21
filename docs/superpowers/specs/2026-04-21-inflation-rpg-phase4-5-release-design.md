# Inflation RPG Phase 4+5 — 출시 로드맵 설계

**날짜:** 2026-04-21  
**상태:** 승인됨  
**다음 단계:** implementation plan 작성

---

## 1. 목표

Phase 3(메타 진행)까지 완성된 inflation-rpg를 2026년 Q3(9월) 안에 iOS/Android 앱스토어에 출시한다. 수익 모델은 **무료 + 광고 + IAP** 조합.

**핵심 제약:** 솔로 개발자 · 5개월

---

## 2. 경쟁 분석 요약

| 제품 | 카테고리 | 우리와의 차이 |
|------|----------|--------------|
| Inflation RPG (원작) | 모바일 RPG | 원본. 한국 테마 + 메타 진행이 차별점 |
| Unity | 게임 개발 플랫폼 | 웹 기술 스택(React/TS)으로 차별화 · 오버헤드 없음 |
| Godot | 오픈소스 엔진 | 웹/React 생태계 활용 불가 |
| Phaser Studio | Phaser 기반 플랫폼 | 상용 라이선스 · 에디터 의존 |

**포지셔닝:** Phaser 3 + React 19 + Capacitor 기반 모바일 게임 프레임워크. 웹 개발자가 모바일 게임을 출시할 수 있는 최소 마찰 경로.

---

## 3. 접근 방식: 완성도 집중 → 단일 출시

MVP 선출시(A)와 병행 개발(C)을 검토했으나 **솔로 개발자 컨텍스트 스위칭 비용**과 **앱스토어 첫 평점 영구성**을 고려해 B 방식 채택.

월 단위로 집중 영역을 고정해 완결한다.

---

## 4. 월별 마일스톤

| 월 | 집중 영역 | 완료 기준 |
|----|-----------|-----------|
| 5월 | MobileUX Layer + 밸런스 | 실기기(iOS/Android) 정상 동작 · 주요 UX 버그 0 |
| 6월 | SoundManager + 이펙트 | BGM 3트랙 · SFX 12개 · 전투 파티클 통합 |
| 7월 | TutorialSystem + MonetizationLayer | 튜토리얼 7단계 · AdMob 배너+리워드 · IAP 결제 흐름 |
| 8월 | 앱스토어 제출 준비 | 스크린샷 · 앱 설명 · 심사 제출 |
| 9월 | 버퍼 · 출시 | 심사 피드백 대응 · 라이브 |

---

## 5. 신규 시스템 4개

모두 `games/inflation-rpg/src/systems/` 안에 추가. 새 패키지 없음("3의 규칙" 준수).

### 5-1. MobileUX Layer (5월)

**변경 범위:** `App.tsx`, `styles/`, Phaser Scale config

- Safe area 대응: CSS `env(safe-area-inset-*)` 적용. 노치·Dynamic Island·홈 인디케이터 영역 침범 금지.
- Phaser 캔버스 반응형: `Scale.FIT` 모드, `autoMobilePipeline: true`.
- 터치 타겟 최소 44×44pt (iOS HIG 기준).
- 실기기 QA 체크리스트 항목:
  - 화면 방향: Portrait Only 고정 (원작과 동일. `capacitor.config.ts` orientation: 'portrait')
  - 텍스트 가독성 (소형 폰 320px 너비)
  - 스크롤 가능 목록 (인벤토리·상점) 터치 스크롤
  - 뒤로가기 제스처(Android) 처리

**밸런스 플레이테스트 (병행):**
- 인플레이션 곡선 검증 (런 10회 이상 내부 테스트)
- 장비 슬롯 가격표 체감
- 하드모드 진입 조건 재검토

### 5-2. SoundManager (6월)

**파일:** `src/systems/SoundManager.ts`

```ts
// 인터페이스 요약
interface SoundManager {
  playBGM(track: 'lobby' | 'field' | 'battle'): void;
  playSFX(key: SFXKey): void;
  setVolume(type: 'bgm' | 'sfx', value: number): void; // 0~1
  mute(type: 'bgm' | 'sfx' | 'all'): void;
}
```

**아키텍처:**
- Phaser 내장 `this.sound` API 사용.
- 볼륨/음소거 설정은 `MetaState`에 저장 (persist).
- React 화면에서 SFX 트리거: `window.__forgeGame.sound.playSFX(key)`. game 인스턴스가 없으면 no-op.
- iOS Web Audio 언락: Phaser Boot 씬의 `input.once('pointerdown')` 이벤트에서 AudioContext.resume().

**에셋 목록:**

BGM (3트랙, OpenGameArt / 자체 제작):
- `bgm-lobby.mp3` — 메인메뉴·캐릭터 선택
- `bgm-field.mp3` — 월드맵
- `bgm-battle.mp3` — 전투 (일반·보스 공용, 보스 구간에서 인텐시티 레이어 추가)

SFX (12개, Freesound / 자체 제작):
- `sfx-btn.mp3` — 버튼 탭
- `sfx-transition.mp3` — 화면 전환
- `sfx-hit-light.mp3` · `sfx-hit-heavy.mp3` — 전투 히트
- `sfx-levelup.mp3` — 레벨업 팡파레
- `sfx-item-get.mp3` — 아이템 획득
- `sfx-gold.mp3` — 골드 획득
- `sfx-boss-appear.mp3` — 보스 등장
- `sfx-run-clear.mp3` · `sfx-run-fail.mp3` — 런 종료
- `sfx-equip.mp3` — 장비 장착
- `sfx-slot-buy.mp3` — 슬롯 구매

**전투 파티클 (Phaser Particles):**
- 히트 이펙트: 작은 스파크 burst
- 레벨업: 링 형태 파티클 방사
- 보스 사망: 대형 폭발 이펙트

### 5-3. TutorialSystem (7월 전반)

**파일:** `src/systems/TutorialSystem.tsx`

**트리거:** `MetaState.tutorialDone === false` → 앱 첫 실행 시 자동 시작.  
**재실행:** 설정 메뉴 "도움말 다시 보기" → `tutorialDone = false` 리셋.

**7단계 흐름:**

| 단계 | 화면 | 내용 |
|------|------|------|
| 1 | ClassSelect | 캐릭터 차이(ATK·MAG·SPD 특화) 설명 |
| 2 | StatAlloc | BP 배분 방식 · 스탯 역할 설명 |
| 3 | Battle (첫 전투) | 공격 버튼 하이라이트 · 전투 루프 설명 |
| 4 | Battle (레벨업 후) | 인플레이션 개념 · 지수 성장 설명 |
| 5 | WorldMap | 구역 이동 방식 · 레벨 게이팅 안내 |
| 6 | Shop | 장비 구매 · 슬롯 확장 안내 |
| 7 | GameOver 또는 ClassSelect | 캐릭터 레벨 영구 성장 안내 |

**구현 방식:**
- React 오버레이 컴포넌트 (Phaser 캔버스 위 `z-index: 9999`).
- 대상 DOM 요소에 spotlight 하이라이트 (주변 dim overlay + 타겟 요소 cutout).
- 건너뛰기 버튼 항상 표시. 건너뛰면 `tutorialDone = true` 기록.

**MetaState 변경:**
```ts
tutorialDone: boolean; // 기본값 false
```

### 5-4. MonetizationLayer (7월 후반)

**파일:** `src/systems/MonetizationManager.ts`

**플랫폼 분기:**
- 웹: 모든 메서드 no-op stub. 광고 없음, IAP 버튼 숨김.
- iOS/Android: `@capacitor-community/admob` + `@capgo/capacitor-purchases` 실제 호출.

**IAP 상품 3종:**

| 상품 ID | 내용 | 가격 |
|---------|------|------|
| `remove_ads` | 광고 영구 제거 | $0.99 |
| `starter_pack` | 초반 장비 5종 묶음 (일회성) | $1.99 |
| `slot_pack` | 장비 슬롯 즉시 +3 (일회성) | $2.99 |

**광고 배치:**
- **배너**: 메인메뉴·인벤토리·상점 하단. `remove_ads` 구매 시 영구 숨김.
- **리워드 영상**: 게임오버 후 "1회 이어하기" 버튼 → 광고 시청 후 런 재개. 런당 1회 제한.
- **전면광고 없음** — 게임 흐름 방해 최소화.

**구매 상태 저장:**
```ts
// MetaState 추가
adsRemoved: boolean;
starterPackOwned: boolean;
slotPackUsed: boolean;
```

**GDPR / 개인정보 요건:**
- 첫 실행 시 광고 동의 팝업 (ATT — App Tracking Transparency, iOS 14+).
- 개인정보처리방침 URL 필수 (앱스토어 심사 요건).

---

## 6. 앱스토어 제출 준비 (8월)

**선행 준비 (7월 이전):**
- Apple Developer Program 계정 ($99/년)
- Google Play Console 계정 ($25 일회성)
- AdMob 앱 ID (무료)
- 개인정보처리방침 URL (GitHub Pages 등에 호스팅)

**제출 체크리스트:**
- 스크린샷 6.5" · 5.5" (iOS), 폰 · 태블릿 (Android)
- 앱 아이콘 1024×1024 (iOS), 512×512 (Android)
- 앱 설명 (한국어 · 영어)
- 연령 등급 설문 (폭력 수위 등)
- 개인정보 레이블 (Apple Privacy Nutrition Label)

---

## 7. 테스트 전략

**SoundManager:** Vitest unit test — `playSFX` 호출 시 Phaser sound.play() 인자 검증. 볼륨 설정 persist 확인.

**TutorialSystem:** Vitest + React Testing Library — 7단계 순서 렌더링, 건너뛰기 시 `tutorialDone` 변경 확인.

**MonetizationManager:** 웹 환경에서 no-op 동작 확인 (실 결제는 기기 테스트 필요). Capacitor 목업으로 IAP 흐름 단위 테스트.

**MobileUX:** 실기기 수동 테스트 (Xcode Simulator + 실제 iPhone/Android 각 1대).

**E2E:** 기존 Playwright `full-game-flow` 통과 유지. 광고·IAP 미표시 환경(웹)에서 흐름 깨지지 않음 확인.

---

## 8. 아키텍처 결정 사항

- 새 패키지 없음. 4개 시스템 모두 `games/inflation-rpg/src/systems/` 내부.
- Capacitor 플러그인 2개(`@capacitor-community/admob`, `@capgo/capacitor-purchases`)는 npm 의존성 추가만.
- `window.__forgeGame` 노출: Sound 접근용. `exposeTestHooks` 게이트와 별개로 항상 노출. 단, sound API만 (전체 game 인스턴스 아님).
- MetaState 필드 추가: `tutorialDone`, `adsRemoved`, `starterPackOwned`, `slotPackUsed`, `soundVolumeBGM`, `soundVolumeSFX`, `soundMuted`.
- persist migration: 기존 저장 데이터와의 하위 호환을 위해 `version` 증가 + migration 함수 추가.

---

## 9. 범위 경계선

### IN (Phase 4+5)
- MobileUX Layer (safe area, 반응형, 터치 타겟)
- 밸런스 플레이테스트 및 수치 조정
- SoundManager (BGM 3 + SFX 12 + 전투 파티클)
- TutorialSystem (7단계 오버레이)
- MonetizationLayer (AdMob + IAP 3종)
- 앱스토어 제출 (iOS + Android)

### OUT (향후)
- 보스 전용 희귀 아이템 드롭
- 스킬 트리
- 상태 이상 · 보스 패턴 다양화
- 성취 시스템
- 게임 #2 (별도 브레인스토밍)
- 리더보드 · 소셜 기능

---

## 10. 관련 문서

- 선행 구현: `docs/superpowers/plans/2026-04-20-inflation-rpg-phase3-meta-progression-plan.md`
- 아키텍처 규칙: `docs/ARCHITECTURE.md`
- 원작 분석: 브레인스토밍 세션 (2026-04-20, Phase 3)
