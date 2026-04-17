import { MonsterData } from '../MonsterTypes';

/**
 * 게임 내 보스 몬스터들의 데이터를 담고 있는 배열입니다.
 */
export const MONSTER_DATA_BOSS: MonsterData[] = [
    {
        "id": 9001,
        "name": "Boss_TigerLord",
        "nameKR": "산군",
        "rank": 10,
        "element": "Wind",
        "baseHP": 500000,
        "baseATK": 50000,
        "baseDEF": 2000,
        "baseAGI": 1500,
        "baseLUK": 1000,
        "zoneLv": 1009,
        "expReward": 10000,
        "baseGold": 5000,
        "dropItemID": 101,
        "dropRate": 1.0,
        "isBoss": true,
        "bossSkills": [101]
    },
    {
        "id": 9002,
        "name": "Boss_KingYeomra",
        "nameKR": "염라대왕",
        "rank": 20,
        "element": "Dark",
        "baseHP": 5000000,
        "baseATK": 500000,
        "baseDEF": 100000,
        "baseAGI": 30000,
        "baseLUK": 50000,
        "zoneLv": 2005,
        "expReward": 100000,
        "baseGold": 50000,
        "dropItemID": 102,
        "dropRate": 1.0,
        "isBoss": true,
        "bossSkills": [102]
    },
    {
        "id": 9003,
        "name": "Boss_Gumiho",
        "nameKR": "천 년의 구미호",
        "rank": 15,
        "element": "Spirit",
        "baseHP": 1000000,
        "baseATK": 80000,
        "baseDEF": 5000,
        "baseAGI": 10000,
        "baseLUK": 10000,
        "zoneLv": 3000,
        "expReward": 50000,
        "baseGold": 25000,
        "dropItemID": 103,
        "dropRate": 1.0,
        "isBoss": true,
        "bossSkills": [103]
    }
];
