import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const passenger = path.join(root, 'frontend app', 'Rail_bus-main');
const conductor = path.join(root, 'conductor-app');
const processes = [];
let stopping = false;
function stopAll(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of processes) if (!child.killed) child.kill('SIGTERM');
  process.exitCode = code;
}

function launch(command, args, cwd) {
  const child = spawn(command, args, { cwd, stdio: 'inherit' });
  processes.push(child);
  child.on('error', (error) => { console.error(error); stopAll(1); });
  child.on('exit', (code) => { if (!stopping && code !== 0) stopAll(code ?? 1); });
  return child;
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
// Avoid Uvicorn's multiprocessing reload worker on Windows when the process is
// started by Node; keep one child process so shutdown and readiness stay reliable.
const backend = launch('python', ['-m', 'uvicorn', 'backend.main:app', '--host', '127.0.0.1', '--port', '8008'], root);
console.log('Waiting for RailBus API at http://127.0.0.1:8008/health …');
let ready = false;
for (let attempt = 0; attempt < 60 && !stopping; attempt += 1) {
  if (backend.exitCode !== null) break;
  try {
    const response = await fetch('http://127.0.0.1:8008/health', { signal: AbortSignal.timeout(1000) });
    if (response.ok) { ready = true; break; }
  } catch { /* The backend is still starting. */ }
  await new Promise((resolve) => setTimeout(resolve, 500));
}
if (!ready || stopping) {
  console.error('RailBus API did not become ready. Check the Python/uvicorn error above, then restart with npm run dev:all.');
  stopAll(1);
} else {
  console.log('RailBus API is ready. Starting Admin, Passenger, and Conductor apps…');
  launch(process.execPath, [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', '5173', '--strictPort'], root);
  launch(process.execPath, [path.join(passenger, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', '5174', '--strictPort'], passenger);
  launch(process.execPath, [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', '5175', '--strictPort'], conductor);
}
if (ready) {
  console.log('RailBus API:        http://127.0.0.1:8008/docs');
  console.log('Admin:              http://localhost:5173');
  console.log('Passenger app:     http://localhost:5173/passenger-app/');
  console.log('Conductor app:     http://localhost:5173/conductor-app/');
  console.log('Direct conductor:  http://localhost:5175/conductor-app/');
  console.log('Direct passenger:  http://localhost:5174/passenger-app/');
}
