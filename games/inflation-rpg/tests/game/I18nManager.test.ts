import { describe, it, expect, beforeEach, vi } from 'vitest';
import { I18n } from '../src/game/i18n/I18nManager';

describe('I18nManager', () => {
    let i18n: I18n;

    beforeEach(() => {
        i18n = I18n.getInstance();
        i18n.setLanguage('ko');
    });

    describe('기본 기능', () => {
        it('단순 키 조회 성공', () => {
            expect(i18n.get('ui.title')).toBe('무한성장: 조선의 검');
        });

        it('중첩된 키 조회 성공', () => {
            expect(i18n.get('stats.hp')).toBe('체력');
            expect(i18n.get('stats.atk')).toBe('공격력');
        });

        it('다층 중첩 키 조회 성공', () => {
            expect(i18n.get('battle.attack')).toBe('공격');
            expect(i18n.get('battle.damage')).toContain('{{amount}}');
        });
    });

    describe('파라미터 치환', () => {
        it('단일 파라미터 치환 성공', () => {
            const result = i18n.get('battle.damage', { amount: 42 });
            expect(result).toBe('42의 피해!');
        });

        it('다중 파라미터 치환 성공', () => {
            const result = i18n.get('battle.level_up', { level: 5 });
            expect(result).toBe('깨달음을 얻었습니다! (Lv. 5)');
        });

        it('파라미터 없음 - 원본 반환', () => {
            const result = i18n.get('battle.damage');
            expect(result).toBe('{{amount}}의 피해!');
        });
    });

    describe('누락 키 처리 (Fallback 전략)', () => {
        it('존재하지 않는 키 - keyString 반환 + 경고', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const result = i18n.get('non.existent.key');

            expect(result).toBe('non.existent.key');
            expect(warnSpy).toHaveBeenCalledWith(
                '[I18n] Missing or invalid key path: non.existent.key'
            );
            warnSpy.mockRestore();
        });

        it('경로 중간에 누락된 키 - keyString 반환 + 경고', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const result = i18n.get('ui.missing.value');

            expect(result).toBe('ui.missing.value');
            expect(warnSpy).toHaveBeenCalledWith(
                '[I18n] Missing or invalid key path: ui.missing.value'
            );
            warnSpy.mockRestore();
        });

        it('경로가 객체가 아닌 경우 - keyString 반환 + 경고', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const result = i18n.get('ui.title.invalid');

            expect(result).toBe('ui.title.invalid');
            expect(warnSpy).toHaveBeenCalledWith(
                '[I18n] Missing or invalid key path: ui.title.invalid'
            );
            warnSpy.mockRestore();
        });

        it('최종 값이 문자열이 아닌 경우 - keyString 반환 + 경고', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const result = i18n.get('ui');

            expect(result).toBe('ui');
            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining('[I18n] Invalid value type: ui')
            );
            warnSpy.mockRestore();
        });
    });

    describe('언어 전환', () => {
        it('한국어 기본값', () => {
            expect(i18n.currentLang).toBe('ko');
            expect(i18n.get('ui.title')).toBe('무한성장: 조선의 검');
        });

        it('언어 전환 - 한국어에서 영어로', () => {
            i18n.setLanguage('en');
            expect(i18n.currentLang).toBe('en');
            expect(typeof i18n.get('ui.title')).toBe('string');
        });
    });

    describe('싱글톤 패턴', () => {
        it('동일한 인스턴스 반환', () => {
            const i18n1 = I18n.getInstance();
            const i18n2 = I18n.getInstance();
            expect(i18n1).toBe(i18n2);
        });
    });

    describe('엣지 케이스', () => {
        it('빈 키 문자열', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const result = i18n.get('');

            expect(result).toBe('');
            expect(warnSpy).toHaveBeenCalled();
            warnSpy.mockRestore();
        });

        it('점으로만 이루어진 키', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const result = i18n.get('...');

            expect(result).toBe('...');
            expect(warnSpy).toHaveBeenCalled();
            warnSpy.mockRestore();
        });

        it('파라미터 값이 숫자', () => {
            const result = i18n.get('battle.damage', { amount: 100 });
            expect(result).toBe('100의 피해!');
        });
    });
});
