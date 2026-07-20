import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';

const adminAuthConfigPath = process.env.LAZA_ADMIN_AUTH_CONFIG ?? 'D:\\LAZA_DATA\\config\\laza-admin-auth.json';
export const adminSessionTtlMs = 8 * 60 * 60 * 1000;
const adminLoginWindowMs = 15 * 60 * 1000;
const adminLoginMaxFailures = 5;

function loadAdminAuthConfig() {
  try {
    const config = JSON.parse(readFileSync(adminAuthConfigPath, 'utf8').replace(/^\uFEFF/, ''));
    const rawUsers = Array.isArray(config.users) ? config.users : [config];
    const users = rawUsers
      .filter((user) => user?.enabled !== false)
      .map((user, index) => {
        const label = Array.isArray(config.users) ? `users[${index}]` : 'legacy credential';
        if (typeof user.username !== 'string' || !user.username.trim()) throw new Error(`${label}: username is missing`);
        if (!Number.isInteger(user.iterations) || user.iterations < 100_000) throw new Error(`${label}: iterations are invalid`);
        if (!/^[A-Fa-f0-9]{32,}$/.test(user.saltHex)) throw new Error(`${label}: saltHex is invalid`);
        if (!/^[A-Fa-f0-9]{64}$/.test(user.passwordHashHex)) throw new Error(`${label}: passwordHashHex is invalid`);
        return {
          username: user.username.trim(),
          displayName: typeof user.displayName === 'string' && user.displayName.trim() ? user.displayName.trim() : user.username.trim(),
          role: typeof user.role === 'string' && user.role.trim() ? user.role.trim() : 'admin',
          scope: typeof user.scope === 'string' && user.scope.trim() ? user.scope.trim() : 'admin-panel',
          iterations: user.iterations,
          salt: Buffer.from(user.saltHex, 'hex'),
          passwordHash: Buffer.from(user.passwordHashHex, 'hex'),
        };
      });

    if (users.length === 0) throw new Error('no enabled admin users are configured');
    const usernames = new Set();
    for (const user of users) {
      const key = user.username.toLowerCase();
      if (usernames.has(key)) throw new Error(`duplicate admin username: ${user.username}`);
      usernames.add(key);
    }

    return { users };
  } catch (error) {
    console.error(`LAZA admin authentication is unavailable: ${error.message}`);
    return null;
  }
}

const adminAuth = loadAdminAuthConfig();
const adminSessions = new Map();
const adminLoginFailures = new Map();

export function isAdminAuthConfigured() {
  return Boolean(adminAuth?.users?.length);
}

function readCookie(request, name) {
  const cookies = String(request.headers.cookie ?? '').split(';');
  for (const cookie of cookies) {
    const separator = cookie.indexOf('=');
    if (separator < 0) continue;
    if (cookie.slice(0, separator).trim() === name) return decodeURIComponent(cookie.slice(separator + 1).trim());
  }
  return null;
}

export function adminSession(request) {
  const token = readCookie(request, 'laza_admin_session');
  if (!token || !/^[A-Fa-f0-9]{64}$/.test(token)) return null;
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const session = adminSessions.get(tokenHash);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    adminSessions.delete(tokenHash);
    return null;
  }
  return session;
}

export function adminCookie(request, token, maxAgeSeconds) {
  const forwardedProto = String(request.headers['x-forwarded-proto'] ?? '').toLowerCase();
  const secure = forwardedProto === 'https' ? '; Secure' : '';
  return `laza_admin_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${secure}`;
}

export function adminClientKey(request) {
  return String(request.headers['cf-connecting-ip'] ?? request.socket.remoteAddress ?? 'unknown');
}

export function isAdminLoginBlocked(clientKey) {
  const record = adminLoginFailures.get(clientKey);
  if (!record) return false;
  if (record.windowStartedAt + adminLoginWindowMs <= Date.now()) {
    adminLoginFailures.delete(clientKey);
    return false;
  }
  return record.failures >= adminLoginMaxFailures;
}

export function registerAdminLoginFailure(clientKey) {
  const current = adminLoginFailures.get(clientKey);
  if (!current || current.windowStartedAt + adminLoginWindowMs <= Date.now()) {
    adminLoginFailures.set(clientKey, { failures: 1, windowStartedAt: Date.now() });
    return;
  }
  current.failures += 1;
}

export function clearAdminLoginFailures(clientKey) {
  adminLoginFailures.delete(clientKey);
}

export function verifyAdminCredentials(username, password) {
  if (!adminAuth || typeof username !== 'string' || typeof password !== 'string') return null;

  for (const user of adminAuth.users) {
    const suppliedUsername = Buffer.from(username);
    const configuredUsername = Buffer.from(user.username);
    const usernameMatches = suppliedUsername.length === configuredUsername.length
      && timingSafeEqual(suppliedUsername, configuredUsername);
    const candidateHash = pbkdf2Sync(password, user.salt, user.iterations, 32, 'sha256');
    const passwordMatches = timingSafeEqual(candidateHash, user.passwordHash);
    if (usernameMatches && passwordMatches) {
      return {
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        scope: user.scope,
      };
    }
  }

  return null;
}

export function createAdminSession(user) {
  if (!user?.username) throw new Error('Cannot create an admin session without a verified user.');
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const session = {
    username: user.username,
    displayName: user.displayName ?? user.username,
    role: user.role ?? 'admin',
    scope: user.scope ?? 'admin-panel',
    expiresAt: Date.now() + adminSessionTtlMs,
  };
  adminSessions.set(tokenHash, session);
  return { token, session };
}

export function destroyAdminSessionFromRequest(request) {
  const token = readCookie(request, 'laza_admin_session');
  if (token) adminSessions.delete(createHash('sha256').update(token).digest('hex'));
}
