import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('./control.mjs', import.meta.url));

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'forge-autonomy-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  function call(command, options = {}) {
    const args = Object.entries(options).flatMap(([k, v]) => [`--${k}`, String(v)]);
    const result = spawnSync(process.execPath, [cli, command, '--state-dir', dir, ...args], {
      encoding: 'utf8',
    });
    return { code: result.status, ...JSON.parse(result.stdout || '{}'), stderr: result.stderr };
  }
  function start(options = {}) {
    const current = call('status');
    const approval = options.approval ?? 'test-user-request-1';
    const expected = options.expected ?? current.state.generation;
    const authorization =
      options.authorization ??
      call('authorize-start', { approval, expected }).state?.startAuthorization?.id;
    if (!authorization) return call('authorize-start', { approval, expected });
    return call('start', { approval, expected, authorization, ...options });
  }
  function claim(generation, task = 'GAME-01') {
    return call('claim', { generation, owner: 'luna-coordinator', task });
  }
  return { dir, call, start, claim };
}

test('fresh checkout is paused and a scheduled claim cannot start development', (t) => {
  const f = fixture(t);
  const result = f.call('status');
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.state.status, 'paused');
  assert.equal(f.claim('initial').code, 1);
  assert.equal(existsSync(join(f.dir, 'state.json')), false);
});

test('start requires explicit approval and current generation; duplicate start cannot reset a run', (t) => {
  const f = fixture(t);
  assert.equal(f.call('start', { expected: 'initial' }).code, 1);
  const started = f.start();
  assert.equal(started.state.status, 'running');
  assert.equal(started.state.integration, 'local');
  assert.equal(f.call('start', { approval: 'stale-request', expected: 'initial' }).code, 1);
  assert.equal(f.start().code, 1);
});

test('direct start with an approval reference is refused without coordinator authorization', (t) => {
  const f = fixture(t);
  const result = f.call('start', { approval: 'forged-reference', expected: 'initial' });
  assert.equal(result.code, 1);
  assert.match(result.error, /authorization/i);
  assert.equal(f.call('status').state.status, 'paused');
});

test('authorize-start records a short-lived one-time authorization and start consumes it', (t) => {
  const f = fixture(t);
  const issued = f.call('authorize-start', {
    approval: 'trusted-user-request',
    expected: 'initial',
  });
  assert.equal(issued.code, 0, issued.stderr);
  assert.match(issued.state.startAuthorization.id, /^[0-9a-f-]{36}$/);
  assert.equal(issued.state.startAuthorization.approval, 'trusted-user-request');
  assert.equal(issued.state.startAuthorization.generation, 'initial');
  assert.ok(issued.state.startAuthorization.expiresAt > Date.now());
  assert.ok(issued.state.startAuthorization.expiresAt <= Date.now() + 10 * 60 * 1000 + 1000);

  const started = f.call('start', {
    approval: 'trusted-user-request',
    authorization: issued.state.startAuthorization.id,
    expected: 'initial',
  });
  assert.equal(started.code, 0, started.stderr);
  assert.equal(started.state.startAuthorization, null);
  assert.equal(f.call('status').state.startAuthorization, null);
  const reused = f.call('start', {
    approval: 'trusted-user-request',
    authorization: issued.state.startAuthorization.id,
    expected: 'initial',
  });
  assert.equal(reused.code, 1);
  assert.match(reused.error, /authorization|generation/i);
});

test('authorize-start requires the current generation and a nonempty approval reference', (t) => {
  const f = fixture(t);
  assert.equal(f.call('authorize-start', { expected: 'initial' }).code, 1);
  assert.equal(f.call('authorize-start', { approval: ' ', expected: 'initial' }).code, 1);
  assert.equal(f.call('authorize-start', { approval: 'request', expected: 'stale' }).code, 1);
  assert.equal(f.call('status').state.startAuthorization, null);
});

test('authorize-start refuses active and draining runs', (t) => {
  const f = fixture(t);
  const started = f.start();
  assert.equal(started.state.status, 'running');
  assert.equal(
    f.call('authorize-start', { approval: 'second-request', expected: started.state.generation })
      .code,
    1,
  );
  const lease = f.claim(started.state.generation).state.lease;
  assert.equal(f.call('pause', { mode: 'after-task' }).state.status, 'draining');
  assert.equal(
    f.call('authorize-start', { approval: 'second-request', expected: started.state.generation })
      .code,
    1,
  );
  assert.ok(lease);
});

test('start rejects mismatched, stale-generation, and expired authorizations', (t) => {
  for (const scenario of ['approval', 'authorization', 'generation', 'expired']) {
    const f = fixture(t);
    const issued = f.call('authorize-start', { approval: 'trusted-request', expected: 'initial' });
    const authorization = issued.state.startAuthorization;
    const path = join(f.dir, 'state.json');
    if (scenario === 'generation') {
      const state = JSON.parse(readFileSync(path, 'utf8'));
      state.generation = 'new-generation';
      writeFileSync(path, JSON.stringify(state));
    }
    if (scenario === 'expired') {
      const state = JSON.parse(readFileSync(path, 'utf8'));
      state.startAuthorization.expiresAt = 1;
      writeFileSync(path, JSON.stringify(state));
    }
    const result = f.call('start', {
      approval: scenario === 'approval' ? 'different-request' : 'trusted-request',
      authorization: scenario === 'authorization' ? 'wrong-token' : authorization.id,
      expected: scenario === 'generation' ? 'new-generation' : 'initial',
    });
    assert.equal(result.code, 1, scenario);
    assert.match(result.error, /authorization|generation/i, scenario);
    assert.equal(f.call('status').state.status, 'paused', scenario);
  }
});

test('corrupt authorization data fails closed and legacy state defaults it to null', (t) => {
  const f = fixture(t);
  const legacy = f.call('status').state;
  delete legacy.startAuthorization;
  writeFileSync(join(f.dir, 'state.json'), JSON.stringify(legacy));
  const legacyStatus = f.call('status');
  assert.equal(legacyStatus.code, 0);
  assert.equal(legacyStatus.state.startAuthorization, null);

  const corrupt = { ...legacyStatus.state, startAuthorization: { id: '', approval: 'x' } };
  writeFileSync(join(f.dir, 'state.json'), JSON.stringify(corrupt));
  const result = f.call('status');
  assert.equal(result.code, 1);
  assert.match(result.error, /Invalid autonomy state/);
});

test('one lease only; stopped generation stays invalid after explicit restart', (t) => {
  const f = fixture(t);
  const { generation } = f.start().state;
  const lease = f.claim(generation).state.lease;
  const credentials = { generation, owner: lease.owner, lease: lease.id };
  assert.equal(f.call('check', credentials).code, 0);
  assert.equal(f.claim(generation, 'GAME-02').code, 1);
  assert.equal(f.call('check', { ...credentials, owner: 'other-worker' }).code, 1);
  assert.equal(f.call('pause').state.status, 'paused');
  assert.equal(f.call('check', credentials).code, 1);
  assert.equal(
    f.call('finish', { ...credentials, outcome: 'success', evidence: 'old result' }).code,
    1,
  );
  assert.equal(f.start({ approval: 'new-user-request' }).state.status, 'running');
  assert.equal(f.call('check', credentials).code, 1);
});

test('after-task pause lets only the current task finish then prevents another claim', (t) => {
  const f = fixture(t);
  const { generation } = f.start().state;
  const lease = f.claim(generation).state.lease;
  const credentials = { generation, owner: lease.owner, lease: lease.id };
  assert.equal(f.call('pause', { mode: 'after-task' }).state.status, 'draining');
  assert.equal(f.call('check', credentials).code, 0);
  assert.equal(f.claim(generation, 'GAME-02').code, 1);
  const finished = f.call('finish', {
    ...credentials,
    outcome: 'success',
    evidence: 'SHA + test result',
  });
  assert.equal(finished.state.status, 'paused');
  assert.equal(f.call('check', credentials).code, 1);
});

test('integration permission is checked independently of permission to edit', (t) => {
  const f = fixture(t);
  const { generation } = f.start().state;
  const lease = f.claim(generation).state.lease;
  const c = { generation, owner: lease.owner, lease: lease.id };
  assert.equal(f.call('check', { ...c, action: 'edit' }).code, 0);
  assert.equal(f.call('check', { ...c, action: 'commit' }).code, 1);
  assert.equal(f.call('check', { ...c, action: 'push' }).code, 1);
});

test('finite budget stops at the exact task limit; evidence is required to finish', (t) => {
  const f = fixture(t);
  const { generation } = f.start({ 'max-tasks': 1 }).state;
  const lease = f.claim(generation).state.lease;
  const c = { generation, owner: lease.owner, lease: lease.id };
  assert.equal(f.call('finish', { ...c, outcome: 'success' }).code, 1);
  assert.equal(
    f.call('finish', { ...c, outcome: 'success', evidence: 'test command exit 0' }).state.status,
    'completed',
  );
  assert.equal(f.claim(generation).code, 1);
});

test('three non-improving tasks block the loop instead of creating busywork', (t) => {
  const f = fixture(t);
  const { generation } = f.start().state;
  for (let i = 0; i < 3; i++) {
    const lease = f.claim(generation).state.lease;
    const result = f.call('finish', {
      generation,
      owner: lease.owner,
      lease: lease.id,
      outcome: 'no-change',
      evidence: 'No actionable improvement found',
    });
    assert.equal(result.state.status, i === 2 ? 'blocked' : 'running');
  }
  assert.equal(f.claim(generation).code, 1);
});

test('corrupt state fails closed and start does not silently erase it', (t) => {
  const f = fixture(t);
  writeFileSync(join(f.dir, 'state.json'), '{broken');
  assert.equal(f.call('status').code, 1);
  assert.equal(f.call('start', { approval: 'request', expected: 'initial' }).code, 1);
  assert.equal(readFileSync(join(f.dir, 'state.json'), 'utf8'), '{broken');
});

test('expired lease is not automatically stolen by a second worker', (t) => {
  const f = fixture(t);
  const { generation } = f.start().state;
  const lease = f.claim(generation).state.lease;
  const path = join(f.dir, 'state.json');
  const state = JSON.parse(readFileSync(path, 'utf8'));
  state.lease.expiresAt = 1;
  writeFileSync(path, JSON.stringify(state));
  assert.equal(f.call('check', { generation, owner: lease.owner, lease: lease.id }).code, 1);
  assert.equal(f.claim(generation).code, 1);
});

test('invalid approval and empty lease credentials cannot authorize work', (t) => {
  const f = fixture(t);
  const { generation } = f.start().state;
  f.claim(generation);
  const path = join(f.dir, 'state.json');
  const original = JSON.parse(readFileSync(path, 'utf8'));
  for (const change of [
    { approval: {} },
    { generation: '' },
    { lease: { ...original.lease, id: '', owner: '', task: '' } },
  ]) {
    writeFileSync(path, JSON.stringify({ ...original, ...change }));
    const result = f.call('status');
    assert.equal(result.code, 1);
    assert.equal(result.ok, false);
    assert.match(result.error, /Invalid autonomy state/);
  }
});

test('after-task pause on an expired lease pauses immediately rather than getting stuck', (t) => {
  const f = fixture(t);
  const { generation } = f.start().state;
  f.claim(generation);
  const path = join(f.dir, 'state.json');
  const state = JSON.parse(readFileSync(path, 'utf8'));
  state.lease.expiresAt = 1;
  writeFileSync(path, JSON.stringify(state));
  const result = f.call('pause', { mode: 'after-task' });
  assert.equal(result.state.status, 'paused');
  assert.notEqual(result.state.generation, generation);
  assert.equal(result.state.lease, null);
});
