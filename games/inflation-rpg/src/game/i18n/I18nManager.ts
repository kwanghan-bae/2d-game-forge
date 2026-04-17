import ko from './ko.json';
import en from './en.json';

type Language = 'ko' | 'en';
type Translations = typeof ko;

/**
 * 다국어(i18n) 번역 데이터를 관리하고 텍스트 변환을 제공하는 클래스입니다.
 * JSON 리소스를 로드하여 키 기반 조회를 지원하며, 변수 치환 기능을 포함합니다.
 */
export class I18n {
    /** I18n의 싱글톤 인스턴스 */
    private static instance: I18n;
    /** 현재 설정된 언어 코드 */
    private lang: Language = 'ko';
    /** 현재 사용 중인 번역 데이터 객체 */
    private data: Translations = ko;

    /**
     * I18n의 생성자입니다. 저장된 언어 설정을 로컬 스토리지에서 복구합니다.
     */
    private constructor() {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('lang') as Language;
            if (saved && (saved === 'ko' || saved === 'en')) {
                this.lang = saved;
            }
        }
        this.updateData();
    }

    /**
     * 싱글톤 인스턴스를 반환합니다.
     * @returns I18n 인스턴스
     */
    public static getInstance(): I18n {
        if (!I18n.instance) {
            I18n.instance = new I18n();
        }
        return I18n.instance;
    }

    /** 현재 설정된 언어 반환 */
    public get currentLang(): Language {
        return this.lang;
    }

    /**
     * 애플리케이션의 언어를 변경하고 설정을 저장합니다.
     * @param lang 변경할 언어 코드 ('ko' | 'en')
     */
    public setLanguage(lang: Language) {
        this.lang = lang;
        if (typeof window !== 'undefined') {
            localStorage.setItem('lang', lang);
        }
        this.updateData();
    }

    /** 내부 번역 데이터 갱신 */
    private updateData() {
        this.data = this.lang === 'ko' ? ko : en;
    }

    /**
     * 번역 키를 바탕으로 변환된 텍스트를 반환합니다.
     * @param keyString 번역 키 (예: 'ui.title', 'battle.damage')
     * @param params 텍스트 내 중괄호({{key}})를 치환할 변수 맵
     * @returns 최종 변환된 문자열
     */
    public get(keyString: string, params?: Record<string, string | number>): string {
        const keys = keyString.split('.');
        const translation = this.resolveKeyPath(keys, keyString);

        if (typeof translation !== 'string') {
            console.warn(`[I18n] Invalid value type: ${keyString} (expected string, got ${typeof translation})`);
            return keyString;
        }

        return this.interpolate(translation, params);
    }

    /**
     * 점(.)으로 구분된 키 경로를 따라가 실제 값을 찾습니다.
     * @param keys 분리된 키 배열
     * @param fullKey 디버깅용 전체 키 문자열
     */
    private resolveKeyPath(keys: string[], fullKey: string): unknown {
        let current: any = this.data;

        for (const key of keys) {
            if (typeof current !== 'object' || current === null || !(key in current)) {
                console.warn(`[I18n] Missing or invalid key path: ${fullKey}`);
                return fullKey;
            }
            current = current[key];
        }
        return current;
    }

    /**
     * 문자열 내의 플레이스홀더({{param}})를 실제 값으로 치환합니다.
     * @param text 원본 문자열
     * @param params 치환할 파라미터 객체
     */
    private interpolate(text: string, params?: Record<string, string | number>): string {
        if (!params) return text;
        
        let result = text;
        Object.entries(params).forEach(([key, value]) => {
            result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
        });
        return result;
    }
}
