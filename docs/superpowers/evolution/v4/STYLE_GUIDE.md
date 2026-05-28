# STYLE GUIDE — Inflation RPG 자율진화 v4

## 아트 스타일

- **UI**: Kenney 벡터 (기존 유지). 해상도 무관 스케일링.
- **엔티티** (캐릭터, 몬스터, NPC, 아이템 아이콘): **32×32 pixel art**
- **타일/배경**: 32×32 pixel art 기반. 필요 시 4-tile(64×64) 패턴 허용.
- **업스케일**: 게임 내 렌더링은 3x (= 96px 표시 크기). Phaser nearest-neighbor.

## 색상 팔레트

### Primary 4

| 역할 | Hex | 용도 |
|------|-----|------|
| BG Deep | `#0f1923` | 배경, 패널 기저 |
| Accent Amber | `#f0a030` | 보상, 강조, 골드, 레벨업 |
| Nature Green | `#2a5a3a` | HP, 회복, 긍정 피드백 |
| Danger Red | `#8b2020` | 데미지, 경고, 위험 |

### Realm Accent (5 던전)

| Realm | Hex | 비고 |
|-------|-----|------|
| Sea | `#1e7a9c` | 물, 얼음 |
| Volcano | `#d4440f` | 화염, 용암 |
| Underworld | `#6b2fa0` | 독, 언데드 |
| Heaven | `#e8d44d` | 신성, 빛 |
| Chaos | `#ff2d7b` | 혼돈, 최종 |

### 보조 (UI 서브톤)

- Panel border: `#2a2a3e`
- Text primary: `#e8e8f0`
- Text muted: `#8888a0`
- Disabled: `#444466`

## 에셋 소스 패밀리 (최대 2)

1. **Kenney** (kenney.nl) — UI, SFX, 일부 BGM. License: CC0.
2. **0x72** (0x72.itch.io) — DungeonTileset II, 16x16 DungeonTileset,
   캐릭터/몬스터/타일/아이템. License: CC0.

> 이 2 family 외 에셋 도입 금지. 필요 시 자체 제작(동일 pixel density).

## Pixel Density 규칙

- 모든 엔티티 스프라이트: **정확히 32×32** (또는 32의 배수: 32×64 대형 보스)
- 아이콘: **16×16** (인벤토리 슬롯 내부 표시용)
- UI 요소: Kenney 원본 사이즈 유지 (9-slice 가능)
- **혼합 금지**: 24px, 48px 등 비표준 크기 신규 도입 불가

## 애니메이션 규칙

- Idle: 4 프레임 @ 6fps
- Attack: 4-6 프레임 @ 12fps
- 스프라이트시트: 가로 배열, 1px 간격 없음
- 파일명: `{entity}_{action}_{direction}.png` (예: `knight_idle_down.png`)

## VFX 제한

- 동시 파티클 레이어: 최대 3
- 파티클 수명: 최대 2초
- 화면 흔들림: 강도 ≤ 4px, 지속 ≤ 300ms

## 우선순위

**Sprite first** — 캐릭터/몬스터 스프라이트 확보가 최우선.
VFX/Juice는 스프라이트 기반이 갖춰진 후.
