import { spawn } from 'node:child_process';
import path from 'node:path';

const api = spawn(process.execPath, ['server/indicator-api.mjs'], {
  stdio: 'inherit',
  windowsHide: true,
});
const npmCli = process.env.npm_execpath ?? path.join(
  path.dirname(process.execPath),
  'node_modules',
  'npm',
  'bin',
  'npm-cli.js',
);
const web = spawn(process.execPath, [npmCli, 'run', 'dev:web'], {
  stdio: 'inherit',
  windowsHide: true,
});

let shuttingDown = false;
function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  api.kill();
  web.kill();
  setTimeout(() => process.exit(exitCode), 300).unref();
}

api.on('exit', (code) => {
  if (!shuttingDown && code !== 0) shutdown(code ?? 1);
});
web.on('exit', (code) => {
  if (!shuttingDown) shutdown(code ?? 0);
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
