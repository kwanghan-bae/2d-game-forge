import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';
import { checkState, readState, stateDirectory } from './control.mjs';

// Cooperative execution guard, not a security sandbox. Only children started here
// are managed. Keep shell off and never signal processes discovered by name.
try {
  const separator = process.argv.indexOf('--', 2);
  if (separator < 0 || !process.argv[separator + 1]) throw new Error('Command required after --');
  const { values } = parseArgs({
    args: process.argv.slice(2, separator),
    options: Object.fromEntries(
      ['state-dir', 'generation', 'owner', 'lease', 'action'].map((name) => [
        name,
        { type: 'string' },
      ]),
    ),
  });
  if (!values.action) throw new Error('Explicit action edit|verify|commit|push required');
  const dir = values['state-dir'] ?? stateDirectory();
  const check = () => checkState(readState(dir), values);
  check();
  const child = spawn(process.argv[separator + 1], process.argv.slice(separator + 2), {
    stdio: 'inherit',
    shell: false,
    detached: process.platform !== 'win32',
  });
  let cancelled = false;
  let forceTimer;
  const signalChild = (signal) => {
    if (!child.pid) return;
    try {
      if (process.platform === 'win32') child.kill(signal);
      else process.kill(-child.pid, signal);
    } catch (error) {
      if (error.code !== 'ESRCH') process.stderr.write(`${error.message}\n`);
    }
  };
  const cancel = (reason) => {
    if (cancelled) return;
    cancelled = true;
    process.stderr.write(`Autonomy command cancelled: ${reason}\n`);
    signalChild('SIGTERM');
    forceTimer = setTimeout(() => signalChild('SIGKILL'), 2000);
  };
  const poll = setInterval(() => {
    try {
      check();
    } catch (error) {
      cancel(error.message);
    }
  }, 250);
  const interrupt = () => cancel('Runner interrupted');
  process.on('SIGTERM', interrupt);
  process.on('SIGINT', interrupt);
  child.on('error', (error) => {
    process.stderr.write(`${error.message}\n`);
  });
  child.on('close', (code, signal) => {
    clearInterval(poll);
    // The direct child may exit before a SIGTERM-ignoring grandchild. Keep the
    // group kill armed on cancellation; otherwise that descendant can still write.
    if (!cancelled) clearTimeout(forceTimer);
    process.removeListener('SIGTERM', interrupt);
    process.removeListener('SIGINT', interrupt);
    try {
      check();
    } catch {
      cancelled = true;
    }
    process.exitCode = cancelled ? 125 : (code ?? (signal ? 128 : 1));
  });
} catch (error) {
  process.stderr.write(`Autonomy command refused: ${error.message}\n`);
  process.exitCode = 125;
}
