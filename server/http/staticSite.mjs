import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sendJson } from './respond.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const distRoot = path.join(projectRoot, 'dist');

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

export async function sendSiteAsset(request, response) {
  if (!['GET', 'HEAD'].includes(request.method ?? '') || request.url?.startsWith('/api/')) return false;
  const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  let filePath = path.resolve(distRoot, requested);
  if (!filePath.startsWith(`${distRoot}${path.sep}`) && filePath !== distRoot) return false;

  try {
    const details = await stat(filePath);
    if (!details.isFile()) throw new Error('Not a file');
  } catch {
    filePath = path.join(distRoot, 'index.html');
  }

  try {
    const body = await readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const immutable = filePath.includes(`${path.sep}assets${path.sep}`);
    response.writeHead(200, {
      'Content-Type': contentTypes.get(extension) ?? 'application/octet-stream',
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    sendJson(response, 503, { error: 'SITE_BUILD_UNAVAILABLE', message: error.message });
  }
  return true;
}
