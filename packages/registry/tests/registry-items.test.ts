// packages/registry/tests/registry-items.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');

interface RegistryItem {
  name: string;
  type: string;
  files: Array<{ path: string; type: string; target: string }>;
}

const ITEMS = [
  'theme-modern-dark-gold',
  'forge-screen',
  'forge-button',
  'forge-panel',
  'forge-gauge',
  'forge-inventory-grid',
];

describe('registry items', () => {
  it('registry.json references all known items', () => {
    const manifestPath = resolve(here, '../registry.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    const names = manifest.items.map((i: { name: string }) => i.name).sort();
    expect(names).toEqual([...ITEMS].sort());
  });

  ITEMS.forEach((name) => {
    it(`item "${name}" has valid r/*.json with existing file paths`, () => {
      const itemPath = resolve(here, `../r/${name}.json`);
      expect(existsSync(itemPath)).toBe(true);
      const item: RegistryItem = JSON.parse(readFileSync(itemPath, 'utf-8'));
      expect(item.name).toBe(name);
      expect(item.files.length).toBeGreaterThan(0);

      for (const f of item.files) {
        const abs = join(repoRoot, f.path);
        expect(existsSync(abs), `${name}: ${f.path} does not exist`).toBe(true);
        expect(f.target).toMatch(/^src\//);
      }
    });
  });
});
