const PROTECTED_PREFIXES = ['/admin', '/static-api/admin'];

function isProtectedPath(pathname) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function unauthorized() {
  return new Response('Authentication required for LAZA admin.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="LAZA Admin", charset="UTF-8"',
      'Cache-Control': 'no-store',
    },
  });
}

function forbidden(message) {
  return new Response(message, {
    status: 503,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

function decodeBasicAuth(header) {
  if (!header?.startsWith('Basic ')) return null;

  try {
    const decoded = atob(header.slice('Basic '.length));
    const separatorIndex = decoded.indexOf(':');
    if (separatorIndex < 0) return null;

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

export function isLazaAdminAuthorized(request, env) {
  const expectedUsername = env.LAZA_ADMIN_BASIC_USER;
  const expectedPassword = env.LAZA_ADMIN_BASIC_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return { configured: false, authorized: false };
  }

  const credentials = decodeBasicAuth(request.headers.get('Authorization'));

  return {
    configured: true,
    authorized:
      credentials?.username === expectedUsername &&
      credentials?.password === expectedPassword,
  };
}

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (!isProtectedPath(url.pathname)) {
    return context.next();
  }

  const auth = isLazaAdminAuthorized(context.request, context.env);

  if (!auth.configured) {
    return forbidden('LAZA admin protection is not configured.');
  }

  if (!auth.authorized) {
    return unauthorized();
  }

  const response = await context.next();
  const protectedResponse = new Response(response.body, response);
  protectedResponse.headers.set('Cache-Control', 'no-store');

  return protectedResponse;
}
