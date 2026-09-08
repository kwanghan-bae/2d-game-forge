import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const statuses = ['paused', 'running', 'draining', 'blocked', 'completed'];
const permissions = ['local', 'commit', 'push'];
const leaseMs = 30 * 60 * 1000;
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;

function requireValue(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required`);
  return value;
}

export function stateDirectory() {
  // All worktrees of this local repository share the same stop state and lease.
  return join(
    execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
      encoding: 'utf8',
    }).trim(),
    'forge-autonomy',
  );
}

export function readState(dir) {
  const path = join(dir, 'state.json');
  if (!existsSync(path))
    return {
      schemaVersion: 1,
      generation: 'initial',
      status: 'paused',
      approval: null,
      integration: 'local',
      maxTasks: null,
      finishedTasks: 0,
      nonImproving: 0,
      lease: null,
      lastResult: null,
      reason: 'Explicit user start required',
    };
  const state = JSON.parse(readFileSync(path, 'utf8'));
  if (
    !state ||
    state.schemaVersion !== 1 ||
    !statuses.includes(state.status) ||
    !permissions.includes(state.integration) ||
    !nonEmpty(state.generation) ||
    !Number.isSafeInteger(state.finishedTasks) ||
    state.finishedTasks < 0 ||
    !Number.isSafeInteger(state.nonImproving) ||
    state.nonImproving < 0 ||
    !(state.maxTasks === null || (Number.isSafeInteger(state.maxTasks) && state.maxTasks > 0)) ||
    !(state.approval === null || nonEmpty(state.approval)) ||
    (['running', 'draining'].includes(state.status) && !nonEmpty(state.approval)) ||
    !(
      state.lease === null ||
      (state.lease &&
        nonEmpty(state.lease.id) &&
        nonEmpty(state.lease.owner) &&
        nonEmpty(state.lease.task) &&
        Number.isSafeInteger(state.lease.expiresAt) &&
        state.lease.expiresAt > 0)
    )
  ) {
    throw new Error('Invalid autonomy state; inspect it, do not reset automatically');
  }
  return state;
}

export function checkState(state, options, now = Date.now()) {
  if (!['running', 'draining'].includes(state.status))
    throw new Error(`Execution is ${state.status}`);
  if (options.generation !== state.generation) throw new Error('Stale generation');
  if (!state.lease || options.owner !== state.lease.owner || options.lease !== state.lease.id) {
    throw new Error('Current task lease required');
  }
  if (now >= state.lease.expiresAt)
    throw new Error('Lease expired; pause and reconcile workers before restart');
  const action = options.action ?? 'edit';
  if (!['edit', 'verify', 'commit', 'push'].includes(action)) throw new Error('Unknown action');
  if (action === 'commit' && state.integration === 'local')
    throw new Error('Commit not authorized');
  if (action === 'push' && state.integration !== 'push') throw new Error('Push not authorized');
  return state;
}

function stop(state, status, reason) {
  return { ...state, status, generation: randomUUID(), lease: null, reason };
}

function transition(state, command, options) {
  if (command === 'start') {
    requireValue(options.approval, 'approval reference');
    if (options.expected !== state.generation)
      throw new Error('Expected generation does not match');
    if (['running', 'draining'].includes(state.status)) throw new Error('Run already active');
    const integration = options.integration ?? 'local';
    if (!permissions.includes(integration)) throw new Error('Unknown integration permission');
    const maxTasks = options['max-tasks'] === undefined ? null : Number(options['max-tasks']);
    if (maxTasks !== null && (!Number.isSafeInteger(maxTasks) || maxTasks < 1))
      throw new Error('max-tasks must be positive');
    return {
      ...state,
      status: 'running',
      generation: randomUUID(),
      approval: options.approval,
      integration,
      maxTasks,
      finishedTasks: 0,
      nonImproving: 0,
      lease: null,
      reason: 'User-approved run',
      lastResult: null,
    };
  }
  if (command === 'pause') {
    const mode = options.mode ?? 'now';
    if (!['now', 'after-task'].includes(mode)) throw new Error('Unknown pause mode');
    if (
      mode === 'after-task' &&
      state.lease &&
      state.lease.expiresAt > Date.now() &&
      ['running', 'draining'].includes(state.status)
    ) {
      return {
        ...state,
        status: 'draining',
        reason: 'Pause after current task; no new assignments',
      };
    }
    return stop(state, 'paused', 'User pause');
  }
  if (command === 'claim') {
    if (state.status !== 'running') throw new Error(`Execution is ${state.status}`);
    if (options.generation !== state.generation) throw new Error('Stale generation');
    if (state.lease) throw new Error('Task already claimed; never steal even an expired lease');
    return {
      ...state,
      lease: {
        id: randomUUID(),
        owner: requireValue(options.owner, 'owner'),
        task: requireValue(options.task, 'task'),
        expiresAt: Date.now() + leaseMs,
      },
    };
  }
  checkState(state, options);
  if (command === 'renew')
    return { ...state, lease: { ...state.lease, expiresAt: Date.now() + leaseMs } };
  if (command === 'finish') {
    if (!['success', 'failure', 'no-change'].includes(options.outcome))
      throw new Error('Unknown outcome');
    requireValue(options.evidence, 'evidence');
    const next = {
      ...state,
      lease: null,
      finishedTasks: state.finishedTasks + 1,
      nonImproving: options.outcome === 'success' ? 0 : state.nonImproving + 1,
      lastResult: {
        task: state.lease.task,
        outcome: options.outcome,
        evidence: options.evidence,
        at: Date.now(),
      },
    };
    if (state.status === 'draining') return stop(next, 'paused', 'Current task finished');
    if (next.nonImproving >= 3)
      return stop(next, 'blocked', 'Three non-improving tasks; reassessment required');
    if (next.maxTasks !== null && next.finishedTasks >= next.maxTasks)
      return stop(next, 'completed', 'Task budget exhausted');
    return next;
  }
  if (command === 'block') return stop(state, 'blocked', requireValue(options.reason, 'reason'));
  throw new Error(`Unknown command: ${command}`);
}

export function control(dir, command, options = {}) {
  if (command === 'status') return readState(dir);
  if (command === 'check') return checkState(readState(dir), options);
  if (!['start', 'pause', 'claim', 'renew', 'finish', 'block'].includes(command))
    throw new Error('Unknown command');
  mkdirSync(dir, { recursive: true });
  const lockPath = join(dir, 'state.lock');
  // No automatic stale-lock removal: an uncertain writer must not be duplicated.
  const lock = openSync(lockPath, 'wx', 0o600);
  const temp = join(dir, `state-${randomUUID()}.tmp`);
  try {
    const next = { ...transition(readState(dir), command, options), updatedAt: Date.now() };
    writeFileSync(temp, JSON.stringify(next, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    renameSync(temp, join(dir, 'state.json'));
    return next;
  } finally {
    if (existsSync(temp)) unlinkSync(temp);
    closeSync(lock);
    unlinkSync(lockPath);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const names = [
      'state-dir',
      'approval',
      'expected',
      'generation',
      'owner',
      'lease',
      'task',
      'integration',
      'max-tasks',
      'mode',
      'action',
      'outcome',
      'evidence',
      'reason',
    ];
    const { values, positionals } = parseArgs({
      allowPositionals: true,
      options: Object.fromEntries(names.map((name) => [name, { type: 'string' }])),
    });
    if (positionals.length !== 1)
      throw new Error('Use status|start|pause|claim|check|renew|finish|block');
    const state = control(values['state-dir'] ?? stateDirectory(), positionals[0], values);
    process.stdout.write(JSON.stringify({ ok: true, state }) + '\n');
  } catch (error) {
    process.stdout.write(JSON.stringify({ ok: false, error: error.message }) + '\n');
    process.exitCode = 1;
  }
}
