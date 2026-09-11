import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { control } from './control.mjs';

const runner = fileURLToPath(new URL('./run.mjs', import.meta.url));

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'forge-autonomy-run-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const authorization = control(dir, 'authorize-start', {
    approval: 'test-user-command',
    expected: 'initial',
  });
  const state = control(dir, 'start', {
    approval: 'test-user-command',
    authorization: authorization.startAuthorization.id,
    expected: 'initial',
  });
  const claimed = control(dir, 'claim', {
    generation: state.generation,
    owner: 'test-owner',
    task: 'QA-01',
  });
  const credentials = {
    generation: state.generation,
    owner: claimed.lease.owner,
    lease: claimed.lease.id,
  };
  function run(code, options = {}) {
    const args = Object.entries({
      'state-dir': dir,
      ...credentials,
      action: 'verify',
      ...options,
    }).flatMap(([key, value]) => [`--${key}`, String(value)]);
    const child = spawn(process.execPath, [runner, ...args, '--', process.execPath, '-e', code], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '',
      stderr = '';
    child.stdout.on('data', (data) => {
      stdout += data;
    });
    child.stderr.on('data', (data) => {
      stderr += data;
    });
    const done = new Promise((resolve) =>
      child.once('close', (code) => resolve({ code, stdout, stderr })),
    );
    return { child, done };
  }
  return { dir, run, credentials };
}

test('guarded command runs and propagates real command failure', async (t) => {
  const f = fixture(t);
  const result = await f.run('console.log("actual-child"); process.exitCode = 7').done;
  assert.equal(result.stdout.trim(), 'actual-child');
  assert.equal(result.code, 7);
});

test('paused run cannot spawn a side-effecting command', async (t) => {
  const f = fixture(t);
  control(f.dir, 'pause');
  const marker = join(f.dir, 'should-not-exist');
  const result = await f.run(`require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'bad')`)
    .done;
  assert.equal(result.code, 125);
  assert.equal(existsSync(marker), false);
});

test('pause interrupts an already running managed command before its delayed write', async (t) => {
  const f = fixture(t);
  const marker = join(f.dir, 'late-write');
  const running = f.run(
    `console.log('ready'); setTimeout(() => require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'bad'), 10000)`,
  );
  await new Promise((resolve, reject) => {
    running.child.stdout.once('data', resolve);
    running.child.once('close', (code) =>
      reject(new Error(`runner exited before readiness: ${code}`)),
    );
  });
  control(f.dir, 'pause');
  const result = await running.done;
  assert.equal(result.code, 125);
  assert.equal(existsSync(marker), false);
});

test('local permission refuses a guarded commit action', async (t) => {
  const f = fixture(t);
  const result = await f.run('console.log("not-authorized")', { action: 'commit' }).done;
  assert.equal(result.code, 125);
  assert.equal(result.stdout, '');
});

test(
  'cancel also kills SIGTERM-ignoring descendants after the direct child exits',
  { skip: process.platform === 'win32' },
  async (t) => {
    const f = fixture(t);
    const marker = join(f.dir, 'descendant-write');
    const descendant = `process.on('SIGTERM', () => {}); console.log('descendant-ready'); setTimeout(() => { require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'bad'); process.exit(); }, 3500)`;
    const running = f.run(
      `require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(descendant)}], { stdio: 'inherit' }); setInterval(() => {}, 1000)`,
    );
    await new Promise((resolve, reject) => {
      running.child.stdout.once('data', resolve);
      running.child.once('close', (code) =>
        reject(new Error(`runner exited before descendant readiness: ${code}`)),
      );
    });
    control(f.dir, 'pause');
    const result = await running.done;
    assert.equal(result.code, 125);
    assert.equal(existsSync(marker), false);
  },
);
