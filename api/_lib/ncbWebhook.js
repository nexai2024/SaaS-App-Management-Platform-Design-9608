/**
 * Shared NCB helpers for Vercel serverless webhook handlers.
 * Writes into studio_webhook_events_* — never into app_notes.
 */

const NCB_PROXY =
  process.env.NCB_PROXY_BASE ||
  'https://rmvzorxcl35mttidiexhtp5g2m0hpsqo.lambda-url.us-east-2.on.aws';
const NCB_INSTANCE =
  process.env.NCB_INSTANCE || '777310_saas_management_platform_db_1739884512';
const TOKENS_TABLE = process.env.NCB_WEBHOOK_TOKENS_TABLE || 'studio_webhook_tokens_1739884512';
const EVENTS_TABLE = process.env.NCB_WEBHOOK_EVENTS_TABLE || 'studio_webhook_events_1739884512';

function buildUrl(kind, path) {
  const url = new URL(`/${kind}/${path}`, NCB_PROXY);
  url.searchParams.set('Instance', NCB_INSTANCE);
  return url.toString();
}

async function ncb(kind, path, options = {}) {
  const res = await fetch(buildUrl(kind, path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(process.env.NCB_SERVICE_COOKIE
        ? { Cookie: process.env.NCB_SERVICE_COOKIE }
        : {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      status: 'error',
      error: body?.message || body?.error || `HTTP ${res.status}`,
      raw: body,
    };
  }
  if (body && typeof body === 'object' && typeof body.status === 'string' && 'data' in body) {
    return body;
  }
  return { status: 'success', data: body };
}

function unwrapOne(data) {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

function nowMysql() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/**
 * Append a webhook event row keyed by token.
 */
export async function enqueueWebhookEvent(token, event) {
  if (!token) return { ok: false, error: 'Missing token' };

  // Validate token exists
  const tokRead = await ncb(
    'public-data',
    `read/${TOKENS_TABLE}?token=${encodeURIComponent(token)}`
  );
  if (tokRead.status === 'error') {
    return {
      ok: false,
      error:
        tokRead.error ||
        'Token lookup failed. Create studio_webhook_tokens table and Ensure token in the app.',
    };
  }
  const tok = unwrapOne(tokRead.data);
  if (!tok) return { ok: false, error: 'Unknown webhook token' };

  const id = `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const payload = {
    token,
    user_id: tok.user_id || undefined,
    channel: event.channel || 'support',
    payload: JSON.stringify(event.payload || event),
    processed: 0,
    created_at: nowMysql(),
  };

  let create = await ncb('public-data', `create/${EVENTS_TABLE}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (create.status === 'error') {
    create = await ncb('data', `create/${EVENTS_TABLE}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  if (create.status === 'error') {
    return {
      ok: false,
      error:
        create.error ||
        'Could not insert webhook event. Ensure studio_webhook_events has public_write RLS, or set NCB_SERVICE_COOKIE.',
    };
  }

  const row = Array.isArray(create.data) ? create.data[0] : create.data;
  return { ok: true, eventId: row?.id || id };
}

export function readJsonBody(req) {
  if (req.body == null) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return { raw: req.body };
    }
  }
  if (typeof req.body === 'object') return req.body;
  return {};
}

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Webhook-Secret');
}
