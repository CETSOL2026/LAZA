import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isLazaAdminAuthorized, onRequest } from '../_middleware.js';

const env = {
  LAZA_ADMIN_BASIC_USER: 'admin',
  LAZA_ADMIN_BASIC_PASSWORD: 'safe-demo-password',
};

function basic(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`;
}

function request(pathname, authorization) {
  const headers = new Headers();
  if (authorization) headers.set('Authorization', authorization);

  return new Request(`https://agent-cloudflare-static-demo.laza-dev.pages.dev${pathname}`, {
    headers,
  });
}

test('admin middleware allows public pages without authentication', async () => {
  const response = await onRequest({
    request: request('/'),
    env,
    next: () => new Response('public'),
  });

  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'public');
});

test('admin middleware challenges admin pages without authentication', async () => {
  const response = await onRequest({
    request: request('/admin'),
    env,
    next: () => new Response('admin'),
  });

  assert.equal(response.status, 401);
  assert.match(response.headers.get('WWW-Authenticate'), /LAZA Admin/);
});

test('admin middleware protects static admin API responses', async () => {
  const response = await onRequest({
    request: request('/static-api/admin/pipelines'),
    env,
    next: () => new Response('pipelines'),
  });

  assert.equal(response.status, 401);
});

test('admin middleware allows protected routes with valid credentials', async () => {
  const response = await onRequest({
    request: request('/admin', basic('admin', 'safe-demo-password')),
    env,
    next: () => new Response('admin'),
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(await response.text(), 'admin');
});

test('admin middleware fails closed when credentials are missing from Pages secrets', async () => {
  const response = await onRequest({
    request: request('/admin', basic('admin', 'safe-demo-password')),
    env: {},
    next: () => new Response('admin'),
  });

  assert.equal(response.status, 503);
});

test('basic auth helper rejects invalid credentials', () => {
  assert.deepEqual(
    isLazaAdminAuthorized(request('/admin', basic('admin', 'wrong')), env),
    { configured: true, authorized: false },
  );
});
