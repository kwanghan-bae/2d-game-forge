# Cycle 103 UI/UX Guide

## 평가 대상
- **MainMenu** (`screens/MainMenu.tsx`)
- **OverworldRunner** (`screens/OverworldRunner.tsx`) — HUD + Phaser canvas + event log
- **CycleResultV2** (`screens/CycleResultV2.tsx`)
- **CyclePrepV2** (`screens/CyclePrepV2.tsx`)
- **StatusModal** (`screens/StatusModal.tsx`)

---

## 1. Screen Flow — 네비게이션 직관성

### 현황
```
MainMenu → CyclePrepV2 → OverworldRunner → CycleResultV2 → MainMenu
              ↑                   ↓
         (이어하기)         (메인 메뉴 버튼)
```

### 진단
- **순환 구조 양호**: 데드엔드 없음. 모든 화면에 back-to-menu 경로 존재.
- **문제점**: OverworldRunner 의 "메인 메뉴" 버튼이 화면 최하단에 위치 — 스크롤 없이는 도달 어려움. Phaser canvas + event log 아래에 묻혀 있다.
- **용사 갤러리**, **설정** 이 disabled 상태로 0.5 opacity — 존재하되 작동 안 함. "왜 안 눌리지?" 혼란 유발 (Hick's Law: 선택지 수 감소 원칙 위반).

### 개선 방향
- disabled 버튼은 feature flag로 완전 숨기거나 "곧 오픈" 라벨 명시
- OverworldRunner 내 "메인 메뉴" → HUD Row 3 (action row) 에 통합 또는 floating FAB

---

## 2. Information Density — 정보 밀도

### MainMenu
- **적정**: 8개 버튼 → 실질 사용 가능 6개. 5+ primary action 제한에 근접.
- 후원자 등급 + progress bar + 사가 카운트가 공존 — 약간 산만하나 시선은 CTA 버튼에 집중됨.

### OverworldRunner HUD
- **과밀**: Row 1(4 chip) + Row 2(4 chip) + Row 3(3 btn + 4 speed btn) = **15개 정보 유닛**을 동시 노출.
- 모바일 320px 폭 시 `flexWrap: wrap` 으로 3~4줄 까지 확장됨 → HUD가 화면 1/3 점유.
- **개선**: 빛 / 재생 / 계절 은 secondary info — 축약 or tap-to-expand 패턴 권장.

### CycleResultV2
- **적정**: stat grid + narrative scroll + chart. 스크롤 영역 명확히 분리됨.

---

## 3. Feedback Loops — 시각 보상

### 현재 구현된 피드백
| 이벤트 | 시각 보상 | 강도 |
|--------|----------|------|
| 빛 획득 | `+N.N` float text (ffd54f) | ★★☆ |
| 챕터 전환 | full-screen overlay 2s | ★★★ |
| 영역 진입 | overlay 3s + regionLore text | ★★★ |
| 인플레이션 마일스톤 | VFX component (milestone store) | ★★★ |
| 도전과제 수령 가능 | gold pulse dot animation | ★★☆ |
| 레벨업 | event log 색상 (#fde68a) 만 | ★☆☆ |
| 전투 승리 | event log 색상 (#fca5a5) 만 | ★☆☆ |

### 진단
- **핵심 누락**: 레벨업은 인플레이션 RPG의 핵심 쾌감인데 HUD 숫자 변경 외 **즉각적 시각 보상 없음**.
- victoryQuotes 데이터가 존재하나 CycleResultV2에서 미사용 — 일대기 종료 시 캐릭터별 대사 부재.
- idleMusings 데이터가 존재하나 **어떤 화면에서도 표시 안 됨** — 가장 큰 기회 손실.

---

## 4. Mobile UX — 터치/스크롤

### 터치 타겟 검증
| 요소 | 계산 높이 | 판정 |
|------|-----------|------|
| MainMenu 버튼 | `padding: 12px` + `fontSize: 16` = ~44px | ✅ PASS |
| HUD action 버튼 | `minHeight: 44` | ✅ PASS |
| Speed 버튼 | `padding: 4px 10px` + `fontSize: 12` = ~**24px** | ❌ FAIL |
| StatusModal close | `minHeight: 44` | ✅ PASS |
| CycleResult "메인 메뉴로" | `padding: 10px 24px` = ~38px | ⚠️ BORDERLINE |

### 스크롤 이슈
- OverworldRunner: Phaser canvas (640x fixed) 가 `display: flex; justifyContent: center` 로 배치됨.
  320px 모바일에서는 horizontal overflow 발생 가능 — `overflow: hidden` 또는 responsive scale 필요.
- Event log: `maxHeight: 220` + `overflowY: auto` — 모바일에서 내부 스크롤 + 외부 스크롤 충돌 (scroll trap).

### 진단
- **Speed 버튼 24px 높이**: 모바일 엄지로 정확한 선택 불가. 44px 미달.
- Phaser canvas 640px 고정폭은 375px iPhone SE에서 좌우 잘림.

---

## 5. Narrative Data 통합 기회

### 데이터 현황
| 파일 | 함수 | 커버리지 | UI 소비자 |
|------|------|----------|-----------|
| `idleMusings.ts` | `getIdleMusing(charId)` | 16 chars × 3 | ❌ 없음 |
| `victoryQuotes.ts` | `getVictoryQuote(charId)` | 16 chars × 2 | ❌ 없음 |
| `regionLore.ts` | `getRegionLore(regionRef)` | 10 regions × 2 | ✅ realmOverlay |

### 통합 제안

1. **idleMusings → OverworldRunner event log 사이 삽입**
   - 5초 이상 사건 없을 시 hero의 musing을 log에 italic으로 삽입
   - 예: *"검 닦을 시간이다."* — 캐릭터 개성 부여, idle 체감 감소

2. **victoryQuotes → CycleResultV2 hero 이름 아래**
   - 일대기 종료 시 캐릭터별 대사 한 줄 표시
   - 사인(cause)과 매칭: '자연사' = 2nd quote (평온), '전사' = 1st quote (열정)

3. **idleMusings → MainMenu 하단 rotating banner**
   - 마지막 플레이 캐릭터의 musing을 subtitle로 표시
   - 재방문 시 "이전 용사가 기다리고 있다" 느낌 부여

---

## TOP 1 UI 개선 권장사항

### 🏆 Idle Narrative Layer — OverworldRunner에 idleMusings 삽입

**이유**: 
- 7개 narrative 데이터 중 가장 높은 ROI (16 캐릭터 × 3 대사 = 48개 콘텐츠가 이미 존재)
- Idle RPG 핵심인 "방치 중에도 캐릭터가 살아 있다" 체감 직결
- 구현 복잡도 낮음 (타이머 + getIdleMusing + log append)
- 정보 밀도 증가 없음 (기존 event log에 삽입)

### Wireframe

```
┌─ OverworldRunner ─────────────────────────────────┐
│┌─ HUD (z=10) ────────────────────────────────────┐│
││ Row1: 🗡 화랑 | 23세·소년기 | 검객·LV 42 | HP.. ││
││ Row2: 빛 1.2K | 재생 #2 | 🌸 봄 | 🌍 산악(3/10)││
││ Row3: [신의메뉴] [📖기록] [📊상태]  [1×][2×][5×]││
│└──────────────────────────────────────────────────┘│
│                                                    │
│          ┌──────────────────────┐                  │
│          │   Phaser Canvas      │                  │
│          │   (overworld scene)  │                  │
│          └──────────────────────┘                  │
│                                                    │
│┌─ Event Log ─────────────────────────────────────┐│
││ 최근 일대기                                       ││
││ 23세  ⚔ 산적을 쓰러뜨렸다                        ││
││ 22세  ⬆ 레벨 42 달성!                            ││
││ 22세  💎 철검+1 획득                              ││
││ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ││
││ 💭 "검 닦을 시간이다."          ← NEW: idleMusing ││
│└──────────────────────────────────────────────────┘│
│                                                    │
│              [메인 메뉴]                            │
└────────────────────────────────────────────────────┘
```

### Interaction
- **트리거**: 마지막 saga event로부터 5초 경과 (speed × 배속 보정)
- **표시**: event log 최하단에 `💭` prefix + italic + opacity 0.6
- **중복 방지**: 같은 musing 연속 2회 금지 (Set으로 최근 3개 기억)
- **사라짐**: 다음 실제 saga event 도착 시 자연스럽게 push-up

### Accessibility
- contrast: `#cbd5e1` (musing text) on `#0f172a` (log bg) = **11.2:1** (AAA)
- `aria-label="용사의 독백"` 추가
- italic은 시각 구분용이나 screen reader에서는 평문으로 읽힘 — 문제없음

### 잘못된 패턴 (피해야 함)
- ❌ Toast/snackbar로 musing 표시 → HUD 위에 추가 레이어 → 인지 부하
- ❌ 별도 말풍선 UI → Phaser canvas 위 DOM overlay 복잡도 증가
- ❌ 매 1초마다 musing → 실제 event 를 밀어냄 → spam 체감

---

## 부수 개선 (Quick Wins)

### A. Speed 버튼 44px 준수
```diff
- padding: '4px 10px',
+ padding: '4px 10px',
+ minHeight: 44,
+ minWidth: 44,
```

### B. victoryQuotes → CycleResultV2
```
<p data-testid="result-hero-name">
  {saga.hero.name} — {saga.hero.cause}
+ <span style={{ display:'block', fontSize:13, opacity:0.7, fontStyle:'italic', marginTop:4 }}>
+   "{getVictoryQuote(saga.hero.charId)}"
+ </span>
</p>
```

### C. MainMenu disabled 정리
- `용사 갤러리`, `설정` → 조건부 렌더링으로 숨김 (opacity 0.5 disabled는 UX debt)

---

## 토큰 사용
- `--color-gold`: `#fbbf24` (CTA 버튼, active speed, 도전과제 pulse)
- `--color-gold-soft`: `#ffd54f` (float text, chapter overlay)
- `--color-surface`: `#1f2937` (HUD bg, button bg)
- `--color-surface-deep`: `#0f172a` (log panel bg)
- `--color-text`: `#cbd5e1` (body text)
- `--color-text-muted`: `#94a3b8` (secondary info, musing)
- raw hex 사용 금지 — 위 매핑을 `theme-modern-dark-gold` 토큰으로 전환 권장
