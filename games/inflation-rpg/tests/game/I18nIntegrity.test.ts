import { describe, it, expect } from 'vitest';
import ko from '../../src/game/i18n/ko.json';
import en from '../../src/game/i18n/en.json';

describe('I18n 리소스 무결성 검증', () => {
    /**
     * 재귀적으로 객체의 모든 키 경로를 추출합니다.
     */
    function getAllKeys(obj: any, prefix = ''): string[] {
        let keys: string[] = [];
        for (const key in obj) {
            const path = prefix ? `${prefix}.${key}` : key;
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                keys = keys.concat(getAllKeys(obj[key], path));
            } else {
                keys.push(path);
            }
        }
        return keys;
    }

    const koKeys = getAllKeys(ko);
    const enKeys = getAllKeys(en);

    it('한국어(ko)의 모든 키가 영어(en)에도 존재해야 함', () => {
        koKeys.forEach(key => {
            expect(enKeys).toContain(key);
        });
    });

    it('영어(en)의 모든 키가 한국어(ko)에도 존재해야 함', () => {
        enKeys.forEach(key => {
            expect(koKeys).toContain(key);
        });
    });

    it('JSON 구조가 유효해야 함', () => {
        expect(koKeys.length).toBeGreaterThan(0);
        expect(enKeys.length).toBeGreaterThan(0);
    });
});
