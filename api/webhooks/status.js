import { cors, enqueueWebhookEvent, readJsonBody } from '../_lib/ncbWebhook.js';

/**
 * POST /api/webhooks/status?token=wh_xxx
 * Accepts UptimeRobot / Better Stack / custom incident JSON.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      channel: 'status',
      usage:
        'POST JSON incident/maintenance payload (or UptimeRobot/Better Stack alert) with ?token=...',
    });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token =
    req.query?.token ||
    req.headers['x-webhook-secret'] ||
    (typeof req.url === 'string' ? new URL(req.url, 'http://localhost').searchParams.get('token') : null);

  const payload = readJsonBody(req);

  // Normalize common provider shapes
  let normalized = { ...payload };
  if (payload.alertType || payload.monitorID || payload['monitorID']) {
    normalized = {
      kind: 'incident',
      title: payload.monitorFriendlyName || payload.monitor_name || 'UptimeRobot alert',
      description: `${payload.alertType || 'alert'} — ${payload.alertDetails || payload.alert_details || ''}`.trim(),
      severity: String(payload.alertType || '').includes('up') ? 'minor' : 'major',
      status: String(payload.alertType || '').includes('up') ? 'resolved' : 'investigating',
      provider: 'uptimerobot',
      ...payload,
    };
  } else if (payload.data?.alert || payload.alert) {
    const alert = payload.data?.alert || payload.alert;
    normalized = {
      kind: 'incident',
      title: alert.name || alert.alert_name || 'Better Stack alert',
      description: alert.description || alert.cause || JSON.stringify(alert),
      severity: alert.severity || 'major',
      status: alert.status === 'resolved' ? 'resolved' : 'investigating',
      provider: 'betterstack',
      ...payload,
    };
  }

  const result = await enqueueWebhookEvent(token, {
    channel: 'status',
    payload: normalized,
  });

  if (!result.ok) return res.status(400).json(result);
  return res.status(202).json({ accepted: true, ...result });
}
