# 설계 스펙: Forge-UI 통합 CSS 디자인 시스템

이 문서는 `2d-game-forge` 프레임워크를 위한 통합 CSS 디자인 시스템(**Forge-UI**)의 아키텍처와 규격을 정의한다. 이 시스템은 외부 CSS 오픈소스(NES, RPGUI, Arwes 등)를 부품화하여 다양한 장르의 게임을 효율적으로 찍어내기 위해 설계되었다.

## 1. 아키텍처 (Architecture)

### 1.1. 패키지 분리 (Multi-Package Strategy)
TurboRepo 구조 내에서 UI 관련 패키지를 독립적으로 관리한다.
- **`@forge/ui-core`**: 표준 인터페이스 및 베이스 React 컴포넌트 정의.
- **`@forge/theme-*`**: 각 스타일(Retro, Fantasy, Sci-Fi)별 물리적 에셋(CSS, 폰트, 이미지) 포함.

### 1.2. 의존성 흐름
```
games/* → @forge/theme-* (빌드타임 선택)
games/* → @forge/ui-core (표준 컴포넌트 사용)
@forge/theme-* → @forge/ui-core (표준 클래스 구현)
```

## 2. 디자인 규격 (Standard Specifications)

### 2.1. 표준 클래스 (A: Utility Classes)
모든 테마는 아래의 표준 클래스명을 반드시 구현해야 한다. 개발자는 테마와 상관없이 이 클래스명만 사용한다.
- `.forge-btn`: 기본 버튼 스타일. (`.primary`, `.secondary`, `.disabled` 변조어 지원)
- `.forge-panel`: 레이아웃 컨테이너. (`.inset`, `.elevated` 지원)
- `.forge-text`: 폰트 및 텍스트 스타일. (`.h1`, `.h2`, `.body`, `.shadow` 지원)
- `.forge-ui-root`: 디자인 시스템의 최상위 루트 클래스. (Pixel-perfect 렌더링 강제)

### 2.2. 표준 컴포넌트 (B: React Components)
`@forge/ui-core`에서 제공하는 고수준 UI 부품들이다.
- `<ForgeButton>`: 표준 버튼 컴포넌트.
- `<ForgeDialog>`: 말풍선/대화창 시스템.
- `<ForgeInventoryGrid>`: 아이템 슬롯 자동 배치 그리드.
- `<ForgeGauge>`: 체력/경험치 바 시스템.

## 3. 구현 메커니즘 (Mechanisms)

### 3.1. 빌드타임 테마 선택
- 각 게임 프로젝트(`games/*`)의 엔트리 포인트에서 원하는 테마 패키지를 직접 `import` 한다.
- 예: `import '@forge/theme-retro/dist/style.css'`.
- 이를 통해 미사용 테마 코드가 최종 번들에 포함되는 것을 방지한다.

### 3.2. Phaser-React 브릿지 (EventBus)
- Phaser의 물리 엔진 이벤트를 CSS 애니메이션과 동기화한다.
- `@forge/core`의 `EventBus`를 구독하는 `useGameEvent` 커스텀 훅을 통해 구현한다.
- 예: `PLAYER_DAMAGED` 이벤트 발생 시 UI 레이어에 `.forge-animate-shake` 클래스 부여.

### 3.3. 시각적 무결성 (Visual Integrity)
- 모든 테마는 `image-rendering: pixelated`와 `-webkit-font-smoothing: none`을 기본으로 적용하여 도트 그래픽과의 이질감을 제거한다.

## 4. 확장 계획 (Roadmap)
1. **Phase 1**: `@forge/ui-core` 베이스 및 Retro 테마 프로토타입 구축.
2. **Phase 2**: Fantasy(RPGUI) 및 Sci-Fi(Arwes) 테마 통합 패키지화.
3. **Phase 3**: 장르별(RPG, Idle, Puzzle) 전용 UI 프리팹 완성.

