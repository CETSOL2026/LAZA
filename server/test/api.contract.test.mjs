import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const port = Number(process.env.LAZA_TEST_API_PORT ?? 8795);
const baseUrl = `http://127.0.0.1:${port}`;

let apiProcess;
let apiOutput = '';

async function waitForHealth(timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        const body = await response.json();
        if (body.status === 'ok') return body;
      }
    } catch {
      // API is not accepting connections yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`API did not become healthy on port ${port} within ${timeoutMs}ms.\n--- API process output ---\n${apiOutput}`);
}

async function getJson(pathName) {
  const response = await fetch(`${baseUrl}${pathName}`);
  const body = await response.json();
  return { status: response.status, headers: response.headers, body };
}

before(async () => {
  apiProcess = spawn(process.execPath, ['server/indicator-api.mjs'], {
    cwd: projectRoot,
    env: { ...process.env, LAZA_API_PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  apiProcess.stdout.on('data', (chunk) => { apiOutput += chunk; });
  apiProcess.stderr.on('data', (chunk) => { apiOutput += chunk; });
  await waitForHealth();
});

after(async () => {
  if (!apiProcess) return;
  await new Promise((resolve) => {
    apiProcess.once('exit', resolve);
    apiProcess.kill();
    setTimeout(resolve, 3000).unref();
  });
});

test('GET /health reports ok with the six official indicators', async () => {
  const { status, body } = await getJson('/health');
  assert.equal(status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(body.database, 'LAZA_DATA_PLATFORM_DEV');
  assert.equal(body.indicatorCount, 6);
  assert.equal(body.officialIndicatorCount, 6);
});

test('GET /api/indicators/latest returns the six official indicators', async () => {
  const { status, body } = await getJson('/api/indicators/latest');
  assert.equal(status, 200);
  assert.equal(body.data.length, 6);
  assert.equal(body.meta.indicatorCount, 6);
  assert.equal(body.meta.officialIndicatorCount, 6);

  const codes = body.data.map((item) => item.id).sort();
  assert.deepEqual(codes, [
    'banking-assets', 'exchange-rate', 'gdp-growth', 'inflation-rate', 'population', 'public-debt-gdp',
  ]);

  for (const item of body.data) {
    assert.equal(typeof item.label, 'string');
    assert.equal(typeof item.numericValue, 'number');
    assert.equal(typeof item.isOfficial, 'boolean');
    assert.ok(item.isOfficial, `${item.id} should be official`);
  }
});

const historyEndpoints = [
  { path: '/api/indicators/inflation-rate/history', seriesCode: 'INFLATION_RATE_AGO_INE_IPCN_YOY', expectedCount: 66 },
  { path: '/api/indicators/exchange-rate/history', seriesCode: 'EXCHANGE_RATE_AGO_BNA_USD_REFERENCE_MONTHLY', expectedCount: 66 },
  { path: '/api/indicators/gdp-growth/history', seriesCode: 'GDP_GROWTH_AGO_INE_QUARTERLY_YOY_2015', expectedCount: 21 },
  { path: '/api/indicators/population/history', seriesCode: 'POPULATION_AGO_INE_RGPH_CENSUS', expectedCount: 2 },
  { path: '/api/indicators/banking-assets/history', seriesCode: 'BANKING_ASSETS_AGO_BNA_OSD_MONTHLY', expectedCount: 65 },
  { path: '/api/indicators/public-debt-gdp/history', seriesCode: 'PUBLIC_DEBT_GDP_AGO_UGD_OFFICIAL_COMPONENTS', expectedCount: 2 },
];

for (const endpoint of historyEndpoints) {
  test(`GET ${endpoint.path} returns ${endpoint.expectedCount} ordered observations`, async () => {
    const { status, body } = await getJson(endpoint.path);
    assert.equal(status, 200);
    assert.equal(body.data.length, endpoint.expectedCount);
    assert.equal(body.meta.observationCount, endpoint.expectedCount);
    assert.equal(body.meta.seriesCode, endpoint.seriesCode);
    assert.equal(body.meta.firstPeriod, body.data[0].period);
    assert.equal(body.meta.lastPeriod, body.data.at(-1).period);

    const periods = body.data.map((item) => item.periodStart);
    assert.deepEqual(periods, [...periods].sort(), 'observations must be in ascending period order');

    for (const item of body.data) {
      assert.equal(typeof item.numericValue, 'number');
      assert.equal(typeof item.isOfficial, 'boolean');
      assert.ok(item.isOfficial, 'history observations must be official');
    }
  });
}

const analyticsEndpoints = [
  { path: '/api/analytics/oil-gas-production', expectedCount: 18, periodKey: 'periodStart' },
  { path: '/api/analytics/fiscal-execution', expectedCount: 5, periodKey: 'periodStart' },
  { path: '/api/analytics/sovereign-yield-curve', expectedCount: 4, periodKey: 'referenceDate' },
  { path: '/api/analytics/oil-non-oil-gdp', expectedCount: 21, periodKey: 'periodStart' },
];

for (const endpoint of analyticsEndpoints) {
  test(`GET ${endpoint.path} returns ${endpoint.expectedCount} snapshots in order`, async () => {
    const { status, body } = await getJson(endpoint.path);
    assert.equal(status, 200);
    assert.equal(body.data.length, endpoint.expectedCount);

    const keys = body.data.map((item) => item[endpoint.periodKey]);
    assert.deepEqual(keys, [...keys].sort(), 'snapshots must be chronologically ordered');
  });
}

test('GET /api/downloads/catalog lists official source assets', async () => {
  const { status, body } = await getJson('/api/downloads/catalog');
  assert.equal(status, 200);
  assert.ok(body.data.length > 0);
  assert.equal(body.meta.assetCount, body.data.length);

  for (const asset of body.data) {
    assert.match(asset.sha256, /^[0-9A-Fa-f]{64}$/);
    assert.equal(typeof asset.assetId, 'number');
  }
});

test('GET /api/downloads/assets/:id 404s for an asset that does not exist', async () => {
  const { status, body } = await getJson('/api/downloads/assets/999999999');
  assert.equal(status, 404);
  assert.equal(body.error, 'SOURCE_ASSET_NOT_FOUND');
});

test('GET /api/admin/session without a cookie is unauthenticated', async () => {
  const { status, body } = await getJson('/api/admin/session');
  assert.equal(status, 401);
  assert.equal(body.authenticated, false);
});

test('GET /api/admin/pipelines without a session is rejected', async () => {
  const { status, body } = await getJson('/api/admin/pipelines');
  assert.equal(status, 401);
  assert.equal(body.error, 'ADMIN_AUTH_REQUIRED');
});

test('POST /api/admin/login rejects invalid credentials', async () => {
  const response = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'not-a-real-user', password: 'not-a-real-password' }),
  });
  const body = await response.json();
  assert.equal(response.status, 401);
  assert.equal(body.error, 'INVALID_ADMIN_CREDENTIALS');
});

test('GET on an unknown API route 404s', async () => {
  const { status, body } = await getJson('/api/this-route-does-not-exist');
  assert.equal(status, 404);
  assert.equal(body.error, 'NOT_FOUND');
});

test('GET /assets/does-not-exist.js 404s instead of serving the SPA shell', async () => {
  const { status, body } = await getJson('/assets/does-not-exist.js');
  assert.equal(status, 404);
  assert.equal(body.error, 'ASSET_NOT_FOUND');
});

test('GET an extensionless route falls back to the SPA shell', async () => {
  const response = await fetch(`${baseUrl}/some-client-route`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /text\/html/);
});
