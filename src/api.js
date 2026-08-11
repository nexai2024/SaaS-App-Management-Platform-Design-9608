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
    const { headers: optionHeaders, ...rest } = options;
    const res = await fetch(url, {
      credentials: 'include',
      ...rest,
      headers: { 'Content-Type': 'application/json', ...optionHeaders },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail =
        body?.message ||
        body?.error ||
        body?.details ||
        (typeof body?.data === 'string' ? body.data : null) ||
        `HTTP ${res.status}`;
      return { status: 'error', data: null, error: detail, httpStatus: res.status, raw: body };
    }
    if (body && typeof body === 'object' && !Array.isArray(body) && typeof body.status === 'string' && 'data' in body) {
      if (body.status === 'error') {
        const detail = body.error || body.message || body.details || 'Request failed';
        return { ...body, error: detail, raw: body };
      }
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