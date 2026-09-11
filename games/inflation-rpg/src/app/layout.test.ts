import { describe, expect, it, vi } from 'vitest';

vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: 'geist-sans' }),
  Geist_Mono: () => ({ variable: 'geist-mono' }),
}));

import { metadata } from './layout';

describe('standalone Village metadata', () => {
  it('describes the approved Korean folklore village fantasy identity', () => {
    expect(metadata.description).toContain('한국 설화 마을 판타지');
    expect(metadata.description).not.toContain('조선');
  });
});
