export enum ItemType {
    WEAPON = 'weapon',
    ARMOR = 'armor',
    ACCESSORY = 'accessory',
    CONSUMABLE = 'consumable'
}

export interface ItemStat {
    atk?: number;
    def?: number;
    hp?: number;
    agi?: number;
    luk?: number;
}

export interface Item {
    id: number;
    name: string;
    type: ItemType;
    description: string;
    stats: ItemStat;
    price: number;
    atlasKey: string;
    frame: number;
}

/**
 * 게임 내 모든 아이템의 기본 정보를 담고 있는 카탈로그(정적 데이터)입니다.
 */
export const ITEM_CATALOG: Item[] = [
    // --- Weapons (Row 1) ---
    {
        id: 1001,
        name: "환도 (Hwando)",
        type: ItemType.WEAPON,
        description: "조선 시대 군인들이 사용하던 표준 도검.",
        stats: { atk: 15 },
        price: 100,
        atlasKey: 'item_joseon',
        frame: 0
    },
    {
        id: 1002,
        name: "각궁 (Gakgung)",
        type: ItemType.WEAPON,
        description: "물소 뿔로 만든 강력한 국궁.",
        stats: { atk: 25, agi: 5 },
        price: 300,
        atlasKey: 'item_joseon',
        frame: 1
    },
    {
        id: 1003,
        name: "월도 (Woldo)",
        type: ItemType.WEAPON,
        description: "달 모양의 날을 가진 언월도.",
        stats: { atk: 40, def: 5 },
        price: 800,
        atlasKey: 'item_joseon',
        frame: 2
    },
    {
        id: 1004,
        name: "철퇴 (Iron Mace)",
        type: ItemType.WEAPON,
        description: "무거운 철퇴. 맞으면 뼈가 부러진다.",
        stats: { atk: 35 },
        price: 600,
        atlasKey: 'item_joseon',
        frame: 3
    },

    // --- Armor (Row 2) ---
    {
        id: 2001,
        name: "두정갑 (Dusok-lin)",
        type: ItemType.ARMOR,
        description: "쇠못을 박아 만든 튼튼한 갑옷.",
        stats: { def: 20, hp: 50 },
        price: 500,
        atlasKey: 'item_joseon',
        frame: 4
    },
    {
        id: 2002,
        name: "면제배갑 (Cotton Armor)",
        type: ItemType.ARMOR,
        description: "면을 여러 겹 겹쳐 만든 방탄 갑옷.",
        stats: { def: 10, agi: 5 },
        price: 200,
        atlasKey: 'item_joseon',
        frame: 5
    },
    {
        id: 2003,
        name: "한복 (Hanbok)",
        type: ItemType.ARMOR,
        description: "평범한 한복. 방어력은 기대하기 힘들다.",
        stats: { def: 2, luk: 5 },
        price: 50,
        atlasKey: 'item_joseon',
        frame: 6
    },
    {
        id: 2004,
        name: "관복 (Officer Robe)",
        type: ItemType.ARMOR,
        description: "고위 관료의 옷. 위엄이 느껴진다.",
        stats: { def: 15, luk: 15 },
        price: 1000,
        atlasKey: 'item_joseon',
        frame: 7
    },

    // --- Accessories (Row 3) ---
    {
        id: 3001,
        name: "노리개 (Norigae)",
        type: ItemType.ACCESSORY,
        description: "장식용 노리개. 운을 좋게 해준다.",
        stats: { luk: 10 },
        price: 150,
        atlasKey: 'item_joseon',
        frame: 8
    },
    {
        id: 3002,
        name: "옥반지 (Jade Ring)",
        type: ItemType.ACCESSORY,
        description: "신비한 옥으로 만든 반지.",
        stats: { hp: 100 },
        price: 400,
        atlasKey: 'item_joseon',
        frame: 9
    },
    {
        id: 3003,
        name: "호패 (Hopae)",
        type: ItemType.ACCESSORY,
        description: "신분증.",
        stats: { def: 5, luk: 5 },
        price: 100,
        atlasKey: 'item_joseon',
        frame: 10
    },
    {
        id: 3004,
        name: "비녀 (Binyeo)",
        type: ItemType.ACCESSORY,
        description: "황금 장식 비녀.",
        stats: { atk: 5, luk: 5 },
        price: 300,
        atlasKey: 'item_joseon',
        frame: 11
    },

    // --- Consumables (Row 4) - Treated as items for now ---
    {
        id: 4001,
        name: "산삼 (Wild Ginseng)",
        type: ItemType.ACCESSORY,
        description: "전설의 명약. 체력을 대폭 늘려준다.",
        stats: { hp: 500, atk: 10 },
        price: 5000,
        atlasKey: 'item_joseon',
        frame: 12
    }
];
