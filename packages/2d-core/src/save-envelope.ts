import { z } from 'zod';

const metaShape = {
  /**
   * 게임별 세이브 스키마의 버전. semver 또는 단조 증가 문자열 권장
   * (예: "1.0.0", "2.0.0"). SaveManager 가 승격되면 이 값을 보고 마이그레이션
   * 경로를 고른다.
   */
  version: z.string().min(1),
  /** Unix epoch ms. 세이브가 쓰여진 시각. 정렬·표시용. */
  timestamp: z.number().int().nonnegative(),
  /**
   * 네임스페이스. 지금은 선택(단일 게임 로컬은 불필요). 게임 #2 도착 시
   * SaveManager 가 이 값으로 `localStorage` 키 prefix 를 만든다.
   */
  namespace: z.string().optional(),
};

/**
 * 게임별 데이터 스키마를 받아, 표준 envelope 로 감싼 Zod 스키마를 만든다.
 *
 * @example
 * const InflationSaveData = z.object({ level: z.number(), gold: z.string() });
 * const InflationSave = createSaveEnvelopeSchema(InflationSaveData);
 * type InflationSave = z.infer<typeof InflationSave>;
 */
export function createSaveEnvelopeSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    ...metaShape,
    data: dataSchema,
  });
}

/**
 * 데이터 스키마 없이 envelope 메타만 파싱하고 싶을 때.
 * (마이그레이션 시 먼저 envelope 을 열어 `version` 확인 → 적절한 data 스키마
 * 로 재파싱하는 용도.)
 */
export const SaveEnvelopeMeta = z.object(metaShape);
