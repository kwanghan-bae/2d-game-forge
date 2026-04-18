import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createSaveEnvelopeSchema, SaveEnvelopeMeta } from '../src/save-envelope';

describe('createSaveEnvelopeSchema', () => {
  const FakeData = z.object({ x: z.number() });
  const FakeEnvelope = createSaveEnvelopeSchema(FakeData);

  it('wraps data with version + timestamp meta', () => {
    const parsed = FakeEnvelope.parse({
      version: '1.0.0',
      timestamp: 1700000000000,
      data: { x: 42 },
    });
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.timestamp).toBe(1700000000000);
    expect(parsed.data.x).toBe(42);
  });

  it('accepts optional namespace', () => {
    const parsed = FakeEnvelope.parse({
      version: '1.0.0',
      timestamp: 0,
      namespace: 'inflation-rpg',
      data: { x: 1 },
    });
    expect(parsed.namespace).toBe('inflation-rpg');
  });

  it('rejects empty version', () => {
    expect(() =>
      FakeEnvelope.parse({ version: '', timestamp: 0, data: { x: 1 } }),
    ).toThrow();
  });

  it('rejects negative timestamp', () => {
    expect(() =>
      FakeEnvelope.parse({
        version: '1.0.0',
        timestamp: -1,
        data: { x: 1 },
      }),
    ).toThrow();
  });

  it('rejects non-integer timestamp', () => {
    expect(() =>
      FakeEnvelope.parse({
        version: '1.0.0',
        timestamp: 1.5,
        data: { x: 1 },
      }),
    ).toThrow();
  });

  it('fails when data does not match inner schema', () => {
    expect(() =>
      FakeEnvelope.parse({
        version: '1.0.0',
        timestamp: 0,
        data: { x: 'oops' },
      }),
    ).toThrow();
  });
});

describe('SaveEnvelopeMeta', () => {
  it('parses envelope meta without caring about data', () => {
    const parsed = SaveEnvelopeMeta.parse({
      version: '2.0.0',
      timestamp: 1700000000000,
      data: { anything: 'goes' },
    });
    expect(parsed.version).toBe('2.0.0');
    expect(parsed.timestamp).toBe(1700000000000);
  });

  it('works without data field at all', () => {
    const parsed = SaveEnvelopeMeta.parse({
      version: '1.0.0',
      timestamp: 0,
    });
    expect(parsed.version).toBe('1.0.0');
  });
});
