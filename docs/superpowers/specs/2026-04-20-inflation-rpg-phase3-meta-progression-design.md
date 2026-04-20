# Inflation RPG Phase 3 — 메타 진행 시스템 설계

**날짜:** 2026-04-20  
**상태:** 승인됨  
**다음 단계:** implementation plan 작성

---

## 1. 목표

원작 Inflation RPG(Tatsuki Sasaki, iOS/Android)의 메타 진행 구조를 구현한다. 현재 게임은 런을 반복할 동기가 없다 — 런이 끝나면 아무것도 남지 않는다. Phase 3는 세 시스템을 한 번에 구현하여 진짜 "반복 플레이 이유"를 만든다.

**구현 범위:** 캐릭터 레벨 + 장비 슬롯 확장 + 장비 계승

**플랫폼:** 모바일(iOS/Android) 출시 목표. 웹은 로컬 테스트 전용.

---

## 2. 원작 벤치마크 분석

원작에서 런 간 유지되는 것:

| 항목 | 유지 여부 | 비고 |
|------|-----------|------|
| 장비·아이템 | ✅ 유지 | 전투/보스 드롭 장비는 다음 런에도 사용 가능 |
| 장비 슬롯 수 | ✅ 유지 | 골드로 구매한 슬롯은 영구 유지 (최대 10) |
| 캐릭터 레벨 | ✅ 유지 | 같은 캐릭터 반복 플레이 시 영구 상승 → 스탯 배율 증가 |
| 골드 | ❌ 리셋 | 런 종료 시 0으로 리셋. "다 쓰고 끝내는" 전략 유도 |
| 런 레벨 | ❌ 리셋 | 레벨 1부터 다시 시작 |

---

## 3. 데이터 구조 변경

### 3-1. MetaState (types.ts)

```ts
interface MetaState {
  // 기존 유지
  inventory: Inventory;
  baseAbilityLevel: number;
  soulGrade: number;
  hardModeUnlocked: boolean;
  characterLevels: Record<string, number>;  // 이미 존재. Phase 3에서 실제로 사용
  bestRunLevel: number;
  normalBossesKilled: string[];
  hardBossesKilled: string[];
  gold: number;

  // Phase 3 신규
  equippedItemIds: string[];   // 장착된 아이템 ID 목록 (순서 = 슬롯 순서)
  equipSlotCount: number;      // 현재 보유 슬롯 수. 기본값 1, 최대 10
}
```

**INITIAL_META 변경:**
```ts
equippedItemIds: [],
equipSlotCount: 1,
```

### 3-2. RunState — 변경 없음

`goldThisRun`은 런 내 획득 골드 (런 종료 시 리셋). 기존 그대로 유지.

### 3-3. 골드 역할 정리

| 필드 | 위치 | 역할 | 런 종료 시 |
|------|------|------|------------|
| `goldThisRun` | RunState | 전투 획득 골드. 런 중 상점·슬롯 구매에 사용 | 리셋 |
| `meta.gold` | MetaState | 장비 판매 수익 누적. Phase 4+ 특수 상점 용도 | 유지 |

---

## 4. 세 가지 핵심 시스템

### 4-1. 캐릭터 레벨 시스템

**언제 오름:** `endRun()` 호출 시 (런 종료/게임오버 모두 포함).  
**오르지 않는 경우:** `abandonRun()` — 포기한 런은 캐릭터 레벨에 기여하지 않는다.

```ts
// endRun() 내부 변경
const charId = run.characterId;
const prevCharLv = meta.characterLevels[charId] ?? 0;
characterLevels: { ...meta.characterLevels, [charId]: prevCharLv + 1 }
```

**스탯 배율:** 캐릭터 레벨 1당 스탯 배율 +10%.

```
statMultiplier = 1 + (characterLevels[characterId] ?? 0) * 0.1
```

**적용 시점:** 런 시작 시 초기 스탯 계산에서 장비 스탯 합산 후 배율 적용.

**UI:** ClassSelect 화면의 각 캐릭터 카드에 "Lv.N" 배지 표시.  
GameOver 화면에서 "캐릭터 레벨 N → N+1" 상승 연출 표시.

### 4-2. 장비 슬롯 확장

**기본값:** `equipSlotCount = 1`  
**최대값:** 10  
**구매:** 런 중 상점에서 `goldThisRun` 소비 → 영구 적용 (MetaState 변경)

**슬롯 가격표** (원작 참고 구조. 상수 `SLOT_COSTS: Record<number, number>`로 정의):

| 현재 슬롯 수 → +1 구매 | 가격 (goldThisRun) |
|------------------------|-------------------|
| 1 → 2 | 5,000G |
| 2 → 3 | 15,000G |
| 3 → 4 | 50,000G |
| 4 → 5 | 150,000G |
| 5 → 6 | 500,000G |
| 6 → 7 | 1,500,000G |
| 7 → 8 | 5,000,000G |
| 8 → 9 | 15,000,000G |
| 9 → 10 | 50,000,000G |

`SLOT_COSTS[equipSlotCount]`로 조회. 10 이상이면 구매 불가.

**gameStore action 추가:**
```ts
buyEquipSlot: () => set((s) => {
  const cost = SLOT_COSTS[s.meta.equipSlotCount];
  if (!cost || s.run.goldThisRun < cost) return s;
  return {
    run: { ...s.run, goldThisRun: s.run.goldThisRun - cost },
    meta: { ...s.meta, equipSlotCount: s.meta.equipSlotCount + 1 },
  };
}),
```

### 4-3. 장비 계승 (장착 슬롯 시스템)

**장착:** `equippedItemIds`에 아이템 ID 추가. 길이 ≤ `equipSlotCount`.  
**해제:** `equippedItemIds`에서 ID 제거.  
**런 간 유지:** `equippedItemIds`는 MetaState → persist 됨.  
**스탯 기여:** 런 시작 시 장착 아이템의 스탯이 초기값에 반영됨.  
- `stats.flat`: 각 스탯에 덧셈 합산  
- `stats.percent`: flat 합산 후 추가 배율로 곱셈 적용  
적용 순서: flat 합산 → percent 곱셈 → 캐릭터 레벨 배율 곱셈

**gameStore actions 추가:**
```ts
equipItem: (itemId) => set((s) => {
  if (s.meta.equippedItemIds.length >= s.meta.equipSlotCount) return s;
  if (s.meta.equippedItemIds.includes(itemId)) return s;
  return { meta: { ...s.meta, equippedItemIds: [...s.meta.equippedItemIds, itemId] } };
}),

unequipItem: (itemId) => set((s) => ({
  meta: { ...s.meta, equippedItemIds: s.meta.equippedItemIds.filter(id => id !== itemId) },
})),
```

---

## 5. 스탯 계산 순서 (런 시작)

```
1. 캐릭터 기본 스탯 × statMultipliers
2. + 장착 아이템 stats.flat 합산 (equippedItemIds → inventory 조회)
3. × (1 + 장착 아이템 stats.percent 합산)
4. × 캐릭터 레벨 배율 (1 + charLv × 0.1)
5. → 이 값이 런의 초기 스탯
6. + 런 중 스탯포인트 배분 (레벨업마다 추가)
```

예시: 화랑(기본 ATK 10) / 캐릭터 Lv3 / 사무라이 검(ATK+40) 장착  
→ (10 + 40) × 1.3 = **ATK 65로 런 시작**

---

## 6. 화면별 변경 사항

### Inventory (대폭 변경)

레이아웃 상단: 장착 슬롯 영역 (`equipSlotCount`개 슬롯 표시)  
- 채워진 슬롯: 아이템 이름 + 스탯 + "해제" 버튼  
- 빈 슬롯: "비어있음" 표시  
- 잠긴 슬롯 (미구매): 🔒 표시  

레이아웃 하단: 보관함 (기존 inventory 목록)  
- 각 아이템: "장착" 버튼 (슬롯 꽉 찼으면 비활성화) + "판매" 버튼

### Shop (대폭 변경)

**섹션 1 — 슬롯 확장 (영구):**  
"장비 슬롯 +1 (현재 N/10)" → 가격표 기준으로 goldThisRun 차감

**섹션 2 — 장비 구매 (이번 런 inventory에 추가):**  
무기·방어구·악세서리 목록. goldThisRun으로 구매. 구매 시 보관함으로 이동.

### ClassSelect (변경)

각 캐릭터 카드에 `characterLevels[id] > 0`이면 "Lv.N" 배지 표시.

### GameOver (변경)

기존 최고 레벨 표시에 더해: "캐릭터 레벨 N → N+1" 텍스트 표시.

### WorldMap / Battle / StatAlloc

내부 스탯 계산만 변경. UI 레이아웃은 유지.

---

## 7. 테스트 전략

TDD로 구현. 각 시스템의 action 테스트 → UI 테스트 순서.

**gameStore.test.ts 신규 케이스:**
- `equipItem`: 슬롯 수 초과 시 무시
- `equipItem`: 이미 장착된 아이템 중복 장착 시 무시
- `unequipItem`: equippedItemIds에서 ID 제거
- `buyEquipSlot`: goldThisRun 차감 + equipSlotCount +1
- `buyEquipSlot`: 골드 부족 시 무시
- `buyEquipSlot`: 슬롯 10개 이상 시 무시
- `endRun`: characterLevels[characterId] +1
- `endRun`: 처음 플레이한 캐릭터는 0 → 1

**Inventory.test.tsx 신규 케이스:**
- equipSlotCount만큼 슬롯 렌더링
- 슬롯 꽉 찼을 때 장착 버튼 비활성화
- 장착 버튼 클릭 → equipItem action 호출
- 해제 버튼 클릭 → unequipItem action 호출

**Shop.test.tsx 신규 케이스:**
- 골드 부족 시 구매 버튼 비활성화
- 슬롯 구매 후 equipSlotCount 증가 반영
- 장비 구매 후 inventory에 추가됨

---

## 8. 범위 경계선

### Phase 3 IN
- 캐릭터 레벨 (증가 + 배율 적용)
- 장비 슬롯 확장 (goldThisRun으로 영구 구매)
- 장비 계승 (equippedItemIds persist)
- Inventory 화면 재설계
- Shop 기능 구현 (슬롯 + 장비 구매)
- GameOver 캐릭터 레벨업 연출

### Phase 4 OUT
- 보스 전용 희귀 아이템 드롭
- 전투 이펙트·애니메이션 강화
- 스킬 트리
- 상태 이상 및 보스 패턴 다양화

### Phase 5 OUT
- 성취 시스템
- Capacitor 앱 빌드 최적화 및 출시 준비

---

## 9. 관련 문서

- 원작 분석: 브레인스토밍 세션 (2026-04-20)
- 선행 구현: `docs/superpowers/plans/2026-04-19-inflation-rpg-phase2-5-plan.md`
- 아키텍처 규칙: `docs/ARCHITECTURE.md`
