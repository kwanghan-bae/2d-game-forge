/**
 * 게임 내 모든 몬스터의 원시 데이터를 담고 있는 테이블 파일입니다.
 * Monsters.ts에서 임포트하여 사용합니다.
 * 파일 크기 최적화를 위해 데이터를 분할하여 관리합니다.
 */
import { MonsterData } from './MonsterTypes';
import { MONSTER_DATA_PART1 } from './monsters/MonsterData_Part1';
import { MONSTER_DATA_PART2 } from './monsters/MonsterData_Part2';
import { MONSTER_DATA_PART3 } from './monsters/MonsterData_Part3';
import { MONSTER_DATA_PART4 } from './monsters/MonsterData_Part4';
import { MONSTER_DATA_PART5 } from './monsters/MonsterData_Part5';
import { MONSTER_DATA_PART6 } from './monsters/MonsterData_Part6';
import { MONSTER_DATA_PART7 } from './monsters/MonsterData_Part7';
import { MONSTER_DATA_PART8 } from './monsters/MonsterData_Part8';
import { MONSTER_DATA_PART9 } from './monsters/MonsterData_Part9';
import { MONSTER_DATA_PART10 } from './monsters/MonsterData_Part10';
import { MONSTER_DATA_PART11 } from './monsters/MonsterData_Part11';
import { MONSTER_DATA_PART12 } from './monsters/MonsterData_Part12';
import { MONSTER_DATA_PART13 } from './monsters/MonsterData_Part13';
import { MONSTER_DATA_PART14 } from './monsters/MonsterData_Part14';
import { MONSTER_DATA_PART15 } from './monsters/MonsterData_Part15';
import { MONSTER_DATA_PART16 } from './monsters/MonsterData_Part16';
import { MONSTER_DATA_PART17 } from './monsters/MonsterData_Part17';
import { MONSTER_DATA_PART18 } from './monsters/MonsterData_Part18';
import { MONSTER_DATA_PART19 } from './monsters/MonsterData_Part19';
import { MONSTER_DATA_PART20 } from './monsters/MonsterData_Part20';
import { MONSTER_DATA_BOSS } from './monsters/MonsterData_Boss';

/**
 * 1,000종 이상의 몬스터 기본 데이터 정보를 담고 있는 전역 배열입니다.
 */
export const MONSTERS: MonsterData[] = [
    ...MONSTER_DATA_PART1,
    ...MONSTER_DATA_PART2,
    ...MONSTER_DATA_PART3,
    ...MONSTER_DATA_PART4,
    ...MONSTER_DATA_PART5,
    ...MONSTER_DATA_PART6,
    ...MONSTER_DATA_PART7,
    ...MONSTER_DATA_PART8,
    ...MONSTER_DATA_PART9,
    ...MONSTER_DATA_PART10,
    ...MONSTER_DATA_PART11,
    ...MONSTER_DATA_PART12,
    ...MONSTER_DATA_PART13,
    ...MONSTER_DATA_PART14,
    ...MONSTER_DATA_PART15,
    ...MONSTER_DATA_PART16,
    ...MONSTER_DATA_PART17,
    ...MONSTER_DATA_PART18,
    ...MONSTER_DATA_PART19,
    ...MONSTER_DATA_PART20,
    ...MONSTER_DATA_BOSS
];
