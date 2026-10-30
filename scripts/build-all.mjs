import { spawnSync } from 'node:child_process';
import { cpSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const passenger = path.join(root, 'frontend app', 'Rail_bus-main');
const conductor = path.join(root, 'conductor-app');

function run(project, args) {
  const result = spawnSync(process.execPath, args, { cwd: project, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(root, [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-b']);
run(root, [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'build']);
run(passenger, [path.join(passenger, 'node_modules', 'typescript', 'bin', 'tsc'), '--noEmit']);
run(passenger, [path.join(passenger, 'node_modules', 'vite', 'bin', 'vite.js'), 'build']);
cpSync(path.join(passenger, 'dist'), path.join(root, 'dist', 'passenger-app'), { recursive: true });
run(conductor, [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '--noEmit']);
run(conductor, [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'build']);
cpSync(path.join(conductor, 'dist'), path.join(root, 'dist', 'conductor-app'), { recursive: true });
console.log('Admin, Conductor mobile app, and Passenger app built in dist/.');
