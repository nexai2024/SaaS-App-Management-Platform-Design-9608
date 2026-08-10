// NCB calls flow through the backend proxy — secret key never ships to the browser.
const NCB_CONFIG = {
  conversationId: 'chat-8d89c473-1590-4574-a893-406d598a4ec1',
  proxyBase: 'https://rmvzorxcl35mttidiexhtp5g2m0hpsqo.lambda-url.us-east-2.on.aws',
  instance: '777310_saas_management_platform_db_1739884512',
};

function buildProxyUrl(path) {
  const url = new URL(path, NCB_CONFIG.proxyBase);
  url.searchParams.set('Instance', NCB_CONFIG.instance);
  return url.toString();
}

async function ncbRequest(url, options = {}) {
  try {
    const res = await fetch(url, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { status: 'error', data: null, error: body?.message || body?.error || `HTTP ${res.status}`, httpStatus: res.status };
    }
    if (body && typeof body === 'object' && !Array.isArray(body) && typeof body.status === 'string' && 'data' in body) {
      return body;
    }
    return { status: 'success', data: body };
  } catch (err) {
    return { status: 'error', data: null, error: err?.message || 'Network error' };
  }
}

export async function authFetch(path, options = {}) {
  return ncbRequest(buildProxyUrl(`/auth/${path}`), options);
}
export async function dataFetch(path, options = {}) {
  return ncbRequest(buildProxyUrl(`/data/${path}`), options);
}
export async function publicDataFetch(path, options = {}) {
  return ncbRequest(buildProxyUrl(`/public-data/${path}`), options);
}