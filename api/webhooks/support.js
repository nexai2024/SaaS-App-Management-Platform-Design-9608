import { cors, enqueueWebhookEvent, readJsonBody } from '../_lib/ncbWebhook.js';

/**
 * POST /api/webhooks/support?token=wh_xxx
 * Accepts email/helpdesk JSON and enqueues into the owner's NCB registry inbox.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      channel: 'support',
      usage: 'POST JSON { subject, body, email, app_id, priority } with ?token=...',
    });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token =
    req.query?.token ||
    req.headers['x-webhook-secret'] ||
    (typeof req.url === 'string' ? new URL(req.url, 'http://localhost').searchParams.get('token') : null);

  const payload = readJsonBody(req);
  const result = await enqueueWebhookEvent(token, {
    channel: 'support',
    payload: {
      subject: payload.subject || payload.title || 'Inbound ticket',
      body: payload.body || payload.text || payload.message || payload.html || '',
      email: payload.email || payload.from || payload.sender || '',
      app_id: payload.app_id || payload.appId || '',
      priority: payload.priority || 'medium',
      ...payload,
    },
  });

  if (!result.ok) return res.status(400).json(result);
  return res.status(202).json({ accepted: true, ...result });
}
