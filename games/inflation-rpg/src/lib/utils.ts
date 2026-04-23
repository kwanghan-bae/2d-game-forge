// packages/registry/src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';

/**
 * 조건부 className 머지 헬퍼. shadcn 관례.
 * clsx 는 falsy 값 필터링 + 배열/오브젝트 변환.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
