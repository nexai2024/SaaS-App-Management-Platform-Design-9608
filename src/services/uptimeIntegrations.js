/**
 * UptimeRobot + Better Stack integrations.
 * Providers run checks on their cron; we sync status into local app monitoring.
 * Also parses webhook payloads when pasted or ingested.
 */

import { appMonitoring, getAppUrl } from './appMonitoring';

const CONFIG_KEY = 'uptime_integrations_v1';

function userScope() {
  return localStorage.getItem('user_id') || 'anon';
}

function configKey() {
  return `${CONFIG_KEY}:${userScope()}`;
}

const DEFAULT_CONFIG = {
  provider: 'uptimerobot', // uptimerobot | betterstack | none
  uptimeRobotApiKey: '',
  betterStackToken: '',
  webhookSecret: '',
  autoSyncMinutes: 5,
  lastSyncAt: null,
  lastSyncError: null,
  lastSyncOk: null,
  /** appId -> { provider, monitorId, monitorUrl, friendlyName } */
  mappings: {},
};

export function getUptimeConfig() {
  try {
    const raw = JSON.parse(localStorage.getItem(configKey()) || '{}');
    return {
      ...DEFAULT_CONFIG,
      ...raw,
      mappings: { ...(DEFAULT_CONFIG.mappings || {}), ...(raw.mappings || {}) },
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveUptimeConfig(patch) {
  const next = { ...getUptimeConfig(), ...patch };
  localStorage.setItem(configKey(), JSON.stringify(next));
  return next;
}

export function ensureWebhookSecret() {
  const cfg = getUptimeConfig();
  if (cfg.webhookSecret) return cfg.webhookSecret;
  const secret = `wh_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  saveUptimeConfig({ webhookSecret: secret });
  return secret;
}

function normalizeUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    return `${u.hostname}${u.pathname}`.replace(/\/$/, '').toLowerCase();
  } catch {
    return String(url).toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  }
}

/** UptimeRobot: 2=up, 8=seems down, 9=down, 0=paused, 1=not checked yet */
function mapUptimeRobotStatus(code) {
  const n = Number(code);
  if (n === 2) return 'up';
  if (n === 8 || n === 9) return 'down';
  if (n === 0) return 'paused';
  return 'unknown';
}

function mapBetterStackStatus(monitor) {
  const s = String(monitor?.attributes?.status || monitor?.status || '').toLowerCase();
  if (s === 'up' || s === 'validating') return 'up';
  if (s === 'down' || s === 'pending') return s === 'down' ? 'down' : 'unknown';
  if (s === 'paused') return 'paused';
  return 'unknown';
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch via CORS proxy fallback when direct API calls are blocked in the browser.
 */
async function fetchWithCorsFallback(url, options = {}) {
  try {
    return await fetchJson(url, options);
  } catch (directErr) {
    // GET-only fallback for UptimeRobot query style
    if ((options.method || 'GET').toUpperCase() === 'GET') {
      const proxied = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      try {
        return await fetchJson(proxied, { method: 'GET', headers: options.headers });
      } catch {
        throw directErr;
      }
    }
    throw directErr;
  }
}

export async function fetchUptimeRobotMonitors(apiKey) {
  const key = String(apiKey || '').trim();
  if (!key) throw new Error('UptimeRobot API key required');

  // Prefer GET (easier CORS proxy); body POST is official but often blocked in browsers
  const qs = new URLSearchParams({
    api_key: key,
    format: 'json',
    custom_uptime_ratios: '30',
    all_time_uptime_ratio: '1',
  });
  const data = await fetchWithCorsFallback(
    `https://api.uptimerobot.com/v2/getMonitors?${qs.toString()}`,
    { method: 'GET' }
  );

  if (data?.stat && data.stat !== 'ok') {
    throw new Error(data?.error?.message || data?.message || 'UptimeRobot request failed');
  }

  return (data?.monitors || []).map((m) => ({
    id: String(m.id),
    provider: 'uptimerobot',
    name: m.friendly_name || m.url,
    url: m.url,
    status: mapUptimeRobotStatus(m.status),
    uptimePct: m.custom_uptime_ratio
      ? Math.round(Number(String(m.custom_uptime_ratio).split('-').pop()))
      : m.all_time_uptime_ratio
        ? Math.round(Number(m.all_time_uptime_ratio))
        : null,
    latencyMs: m.average_response_time ? Math.round(Number(m.average_response_time)) : null,
    raw: m,
  }));
}

export async function fetchBetterStackMonitors(token) {
  const key = String(token || '').trim();
  if (!key) throw new Error('Better Stack token required');

  const data = await fetchJson('https://uptime.betterstack.com/api/v2/monitors', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
  });

  const rows = data?.data || data?.monitors || [];
  return rows.map((m) => {
    const attrs = m.attributes || m;
    return {
      id: String(m.id || attrs.id),
      provider: 'betterstack',
      name: attrs.pronounceable_name || attrs.name || attrs.url,
      url: attrs.url,
      status: mapBetterStackStatus(m),
      uptimePct: attrs.availability != null ? Math.round(Number(attrs.availability)) : null,
      latencyMs: null,
      raw: m,
    };
  });
}

export async function listProviderMonitors(config = getUptimeConfig()) {
  if (config.provider === 'uptimerobot' && config.uptimeRobotApiKey) {
    return fetchUptimeRobotMonitors(config.uptimeRobotApiKey);
  }
  if (config.provider === 'betterstack' && config.betterStackToken) {
    return fetchBetterStackMonitors(config.betterStackToken);
  }
  throw new Error('Configure a provider and API key in Settings → Integrations');
}

export function setAppMonitorMapping(appId, mapping) {
  const cfg = getUptimeConfig();
  const mappings = { ...cfg.mappings };
  if (!mapping) delete mappings[String(appId)];
  else mappings[String(appId)] = mapping;
  return saveUptimeConfig({ mappings });
}

export function applyRemoteMonitorToApp(appId, remote) {
  return appMonitoring.applyExternalStatus(appId, {
    status: remote.status === 'paused' ? 'unknown' : remote.status,
    uptimePct: remote.uptimePct,
    latencyMs: remote.latencyMs,
    source: remote.provider,
    monitorId: remote.id,
    monitorName: remote.name,
    monitorUrl: remote.url,
    message: `${remote.provider} · ${remote.name}: ${remote.status}${
      remote.uptimePct != null ? ` (${remote.uptimePct}% / 30d)` : ''
    }`,
  });
}

function matchMonitorToApp(app, monitors) {
  const appNorm = normalizeUrl(getAppUrl(app));
  if (!appNorm) return null;
  return (
    monitors.find((m) => normalizeUrl(m.url) === appNorm) ||
    monitors.find((m) => normalizeUrl(m.url).includes(appNorm) || appNorm.includes(normalizeUrl(m.url))) ||
    null
  );
}

/**
 * Sync all apps from the configured provider.
 * Uses explicit mappings first, then URL auto-match.
 */
export async function syncUptimeFromProvider(apps = []) {
  const cfg = getUptimeConfig();
  try {
    const monitors = await listProviderMonitors(cfg);
    let updated = 0;

    for (const app of apps) {
      const mapped = cfg.mappings[String(app.id)];
      let remote = null;
      if (mapped?.monitorId) {
        remote = monitors.find(
          (m) => String(m.id) === String(mapped.monitorId) && m.provider === (mapped.provider || cfg.provider)
        );
      }
      if (!remote) remote = matchMonitorToApp(app, monitors);
      if (!remote) continue;

      applyRemoteMonitorToApp(app.id, remote);
      if (!mapped) {
        setAppMonitorMapping(app.id, {
          provider: remote.provider,
          monitorId: remote.id,
          monitorUrl: remote.url,
          friendlyName: remote.name,
        });
      }
      updated += 1;
    }

    saveUptimeConfig({
      lastSyncAt: new Date().toISOString(),
      lastSyncOk: true,
      lastSyncError: null,
    });

    return { ok: true, updated, totalMonitors: monitors.length, monitors };
  } catch (error) {
    saveUptimeConfig({
      lastSyncAt: new Date().toISOString(),
      lastSyncOk: false,
      lastSyncError: error?.message || 'Sync failed',
    });
    throw error;
  }
}

/**
 * Parse UptimeRobot / Better Stack webhook (or alert) JSON and apply to a mapped app.
 */
export function ingestUptimeWebhook(payload, { appId, secret } = {}) {
  const cfg = getUptimeConfig();
  if (cfg.webhookSecret && secret && secret !== cfg.webhookSecret) {
    throw new Error('Invalid webhook secret');
  }

  let body = payload;
  if (typeof payload === 'string') {
    body = JSON.parse(payload);
  }

  // UptimeRobot alert contact webhook style
  const urMonitorId = body?.monitorID || body?.monitor_id || body?.alertType?.monitorID;
  const urStatus =
    body?.alertTypeFriendlyName ||
    body?.alertType ||
    body?.monitorStatus ||
    body?.status;

  // Better Stack webhook
  const bsData = body?.data || body;
  const bsMonitorId = bsData?.id || bsData?.monitor?.id || body?.monitor?.id;
  const bsStatus =
    bsData?.attributes?.status ||
    body?.data?.attributes?.status ||
    body?.status ||
    body?.incident?.attributes?.status;

  let status = 'unknown';
  const statusRaw = String(urStatus || bsStatus || '').toLowerCase();
  if (
    statusRaw.includes('up') ||
    statusRaw === '2' ||
    statusRaw === 'resolved' ||
    statusRaw === 'recovery'
  ) {
    status = 'up';
  } else if (
    statusRaw.includes('down') ||
    statusRaw === '9' ||
    statusRaw === '8' ||
    statusRaw === 'started' ||
    statusRaw.includes('incident')
  ) {
    status = 'down';
  }

  const monitorId = String(urMonitorId || bsMonitorId || body?.monitorId || '');
  let targetAppId = appId ? String(appId) : null;

  if (!targetAppId && monitorId) {
    const hit = Object.entries(cfg.mappings || {}).find(
      ([, m]) => String(m.monitorId) === monitorId
    );
    if (hit) targetAppId = hit[0];
  }

  if (!targetAppId) {
    throw new Error(
      'Could not map webhook to an app. Link a monitor on the app card, or pass appId.'
    );
  }

  const provider = urMonitorId || body?.monitorID ? 'uptimerobot' : 'betterstack';
  const entry = appMonitoring.applyExternalStatus(targetAppId, {
    status,
    source: `${provider}-webhook`,
    monitorId: monitorId || undefined,
    message: `Webhook · ${provider}: ${status} (${statusRaw || 'payload'})`,
  });

  return { appId: targetAppId, status, entry };
}

export function sampleWebhookPayloads() {
  return {
    uptimerobot: {
      monitorID: 777810874,
      monitorURL: 'https://example.com',
      monitorFriendlyName: 'Example',
      alertType: 1,
      alertTypeFriendlyName: 'Down',
      alertDetails: 'Connection timeout',
    },
    betterstack: {
      data: {
        id: '12345',
        type: 'monitor',
        attributes: {
          status: 'down',
          url: 'https://example.com',
          pronounceable_name: 'Example',
        },
      },
    },
  };
}
