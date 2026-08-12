/**
 * Studio feature stores: localStorage cache + NCB sync via studioSync.
 */

import {
  STUDIO_COLLECTIONS,
  pushStudioState,
  pullStudioState,
  drainWebhookInbox,
  publishPublicBundleRemote,
  readPublicBundleRemote,
  ensureWebhookRegistry,
  getWebhookUrls,
  getWebhookTokenLocal,
  getPublicBundleTokenLocal,
  cleanupLegacyStudioNotes,
  clearStudioTableStatusCache,
} from './studioSync';

function storageKey(base) {
  const userId = localStorage.getItem('user_id') || 'anon';
  return `${base}:${userId}`;
}

function publicKey(base) {
  return `studio_public_${base}_v1`;
}

function readList(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeList(key, rows) {
  localStorage.setItem(key, JSON.stringify(rows));
  return rows;
}

function readObj(key, fallback = {}) {
  try {
    return { ...fallback, ...(JSON.parse(localStorage.getItem(key) || '{}') || {}) };
  } catch {
    return { ...fallback };
  }
}

function writeObj(key, obj) {
  localStorage.setItem(key, JSON.stringify(obj));
  return obj;
}

function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const BASE_KEYS = {
  incidents: 'studio_incidents_v1',
  maintenance: 'studio_maintenance_v1',
  waitlists: 'studio_waitlists_v1',
  waitlist_signups: 'studio_waitlist_signups_v1',
  tickets: 'studio_tickets_v1',
  reply_templates: 'studio_reply_templates_v1',
  affiliates: 'studio_affiliates_v1',
  affiliate_payouts: 'studio_affiliate_payouts_v1',
  content: 'studio_content_v1',
  experiments: 'studio_experiments_v1',
  domains: 'studio_domains_v1',
  legal: 'studio_legal_v1',
};

let syncTimer = null;
let syncing = false;

function scheduleCloudSync() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncStudioToCloud().catch((e) => console.warn('Studio cloud sync failed', e));
  }, 900);
}

function makeStore(baseKey, collectionName) {
  return {
    list() {
      return readList(storageKey(baseKey));
    },
    replaceAll(rows) {
      writeList(storageKey(baseKey), Array.isArray(rows) ? rows : []);
      return this.list();
    },
    save(item) {
      const key = storageKey(baseKey);
      const rows = readList(key);
      const now = new Date().toISOString();
      let result;
      if (item.id) {
        const next = rows.map((row) =>
          String(row.id) === String(item.id) ? { ...row, ...item, updated_at: now } : row
        );
        writeList(key, next);
        result = next.find((r) => String(r.id) === String(item.id));
      } else {
        const row = { id: uid(), created_at: now, updated_at: now, ...item };
        writeList(key, [row, ...rows]);
        result = row;
      }
      if (collectionName) scheduleCloudSync();
      return result;
    },
    remove(id) {
      const key = storageKey(baseKey);
      writeList(
        key,
        readList(key).filter((row) => String(row.id) !== String(id))
      );
      if (collectionName) scheduleCloudSync();
    },
  };
}

export function snapshotCollections() {
  const out = {};
  for (const name of STUDIO_COLLECTIONS) {
    const key = BASE_KEYS[name];
    out[name] = key ? readList(storageKey(key)) : [];
  }
  return out;
}

export function applyCollections(collections = {}) {
  for (const name of STUDIO_COLLECTIONS) {
    if (!Object.prototype.hasOwnProperty.call(collections, name)) continue;
    const key = BASE_KEYS[name];
    if (!key) continue;
    writeList(storageKey(key), Array.isArray(collections[name]) ? collections[name] : []);
  }
}

export async function syncStudioToCloud() {
  if (syncing) return { skipped: true };
  if (!localStorage.getItem('user_id')) return { skipped: true };
  syncing = true;
  try {
    clearStudioTableStatusCache();
    const result = await pushStudioState(snapshotCollections());
    // Remap local string ids → NCB integer ids after create
    if (result.idRemap) {
      for (const [name, pairs] of Object.entries(result.idRemap)) {
        if (!pairs?.length) continue;
        const key = BASE_KEYS[name];
        if (!key) continue;
        const storage = storageKey(key);
        const rows = readList(storage);
        const map = Object.fromEntries(pairs.map((p) => [String(p.from), p.to]));
        writeList(
          storage,
          rows.map((r) => (map[String(r.id)] != null ? { ...r, id: map[String(r.id)] } : r))
        );
      }
    }
    return { ok: true, ...result };
  } finally {
    syncing = false;
  }
}

export async function hydrateStudioFromCloud() {
  if (!localStorage.getItem('user_id')) return { ok: false };
  clearStudioTableStatusCache();

  // One-time-ish cleanup of notes pollution from the old hack
  try {
    const cleaned = await cleanupLegacyStudioNotes();
    if (cleaned.deleted > 0) {
      console.info(`Removed ${cleaned.deleted} legacy Studio system notes from Notes`);
    }
  } catch (e) {
    console.warn('Studio notes cleanup skipped', e);
  }

  const { collections, updated_at, tablesMissing } = await pullStudioState();
  if (collections && Object.keys(collections).length) {
    applyCollections(collections);
  }
  await ensureWebhookRegistry();
  const drained = await drainWebhookInbox(applyWebhookEvent);
  if (drained.processed > 0) await syncStudioToCloud();
  return { ok: true, updated_at, drained: drained.processed, tablesMissing };
}

function applyWebhookEvent(event) {
  const channel = String(event.channel || event.type || '').toLowerCase();
  const payload = event.payload || event;

  if (channel === 'support' || channel === 'ticket') {
    ticketsStore.save({
      subject: payload.subject || payload.title || 'Inbound ticket',
      body: payload.body || payload.text || payload.message || JSON.stringify(payload),
      email: payload.email || payload.from || '',
      app_id: payload.app_id || '',
      priority: payload.priority || 'medium',
      status: 'open',
      source: 'webhook',
      webhook_event_id: event.id,
    });
    return;
  }

  if (channel === 'status' || channel === 'incident') {
    const kind = String(payload.kind || payload.event || 'incident').toLowerCase();
    if (kind === 'maintenance') {
      maintenanceStore.save({
        title: payload.title || 'Maintenance',
        description: payload.description || payload.message || '',
        app_id: payload.app_id || '',
        starts_at: payload.starts_at || payload.start || '',
        ends_at: payload.ends_at || payload.end || '',
        webhook_event_id: event.id,
      });
    } else {
      incidentsStore.save({
        title: payload.title || payload.monitor_name || 'Incident',
        description: payload.description || payload.message || JSON.stringify(payload),
        severity: payload.severity || (payload.alertType === 'down' ? 'major' : 'minor'),
        app_id: payload.app_id || '',
        status: payload.status === 'up' || payload.alertType === 'up' ? 'resolved' : 'investigating',
        source: 'webhook',
        webhook_event_id: event.id,
      });
    }
  }
}

/** Publish a snapshot so public routes can read (local + NCB). */
export async function publishPublicBundle(bundle) {
  const local = writeObj(publicKey('bundle'), {
    ...bundle,
    published_at: new Date().toISOString(),
  });
  try {
    const remote = await publishPublicBundleRemote(local);
    return { ...local, publicToken: remote.publicToken, publicUrl: remote.url };
  } catch (e) {
    console.warn('Remote public publish failed; local only', e);
    return local;
  }
}

export function readPublicBundle() {
  return readObj(publicKey('bundle'), {
    apps: [],
    status: [],
    incidents: [],
    maintenance: [],
    waitlists: [],
  });
}

export async function readPublicBundleSmart(tokenFromQuery) {
  const token = tokenFromQuery || getPublicBundleTokenLocal() || new URLSearchParams(window.location.search).get('t');
  if (token) {
    const remote = await readPublicBundleRemote(token);
    if (remote && (remote.status || remote.waitlists)) return remote;
  }
  return readPublicBundle();
}

export {
  getWebhookUrls,
  getWebhookTokenLocal,
  getPublicBundleTokenLocal,
  ensureWebhookRegistry,
  hydrateStudioFromCloud as hydrateStudio,
};

// —— Status / incidents / maintenance ——
export const incidentsStore = makeStore(BASE_KEYS.incidents, 'incidents');
export const maintenanceStore = makeStore(BASE_KEYS.maintenance, 'maintenance');

export function buildStatusSnapshot(apps = [], monitoringByApp = {}) {
  const incidents = incidentsStore.list().filter((i) => i.status !== 'resolved');
  const maintenance = maintenanceStore.list().filter((m) => {
    const end = m.ends_at ? new Date(m.ends_at).getTime() : Infinity;
    return end >= Date.now() - 86400000;
  });

  const status = apps.map((app) => {
    const mon = monitoringByApp[String(app.id)] || {};
    const openIncidents = incidents.filter((i) => String(i.app_id) === String(app.id));
    let state = mon.status || 'unknown';
    if (openIncidents.some((i) => i.severity === 'major' || i.severity === 'critical')) {
      state = 'down';
    } else if (openIncidents.length) {
      state = state === 'up' ? 'degraded' : state;
    }
    return {
      app_id: app.id,
      name: app.name,
      url: app.landing_page || app.domain || app.live_url || '',
      state,
      uptimePct: mon.uptimePct ?? null,
      lastChecked: mon.lastChecked || null,
      latencyMs: mon.latencyMs ?? null,
    };
  });

  return {
    apps: apps.map((a) => ({ id: a.id, name: a.name, description: a.description })),
    status,
    incidents: incidentsStore.list(),
    maintenance: maintenanceStore.list(),
  };
}

// —— Waitlists ——
export const waitlistsStore = {
  ...makeStore(BASE_KEYS.waitlists, 'waitlists'),
  getBySlug(slug) {
    return this.list().find((w) => w.slug === slug || String(w.app_id) === String(slug));
  },
  getByApp(appId) {
    return this.list().find((w) => String(w.app_id) === String(appId));
  },
};

export const waitlistSignupsStore = {
  list(waitlistId) {
    return makeStore(BASE_KEYS.waitlist_signups, 'waitlist_signups')
      .list()
      .filter((s) => !waitlistId || String(s.waitlist_id) === String(waitlistId));
  },
  save(item) {
    return makeStore(BASE_KEYS.waitlist_signups, 'waitlist_signups').save({
      status: 'pending',
      referred_by: item.referred_by || null,
      referral_code: item.referral_code || uid().slice(0, 6).toUpperCase(),
      ...item,
    });
  },
  remove(id) {
    return makeStore(BASE_KEYS.waitlist_signups, 'waitlist_signups').remove(id);
  },
  convert(id) {
    return this.save({ id, status: 'converted', converted_at: new Date().toISOString() });
  },
  publicList(waitlistId) {
    return readList(publicKey(`waitlist_${waitlistId}`));
  },
  publicAdd(waitlistId, signup) {
    const key = publicKey(`waitlist_${waitlistId}`);
    const rows = readList(key);
    const row = {
      id: uid(),
      waitlist_id: waitlistId,
      created_at: new Date().toISOString(),
      status: 'pending',
      referral_code: uid().slice(0, 6).toUpperCase(),
      ...signup,
    };
    writeList(key, [row, ...rows]);
    try {
      makeStore(BASE_KEYS.waitlist_signups, 'waitlist_signups').save(row);
    } catch {
      /* ignore */
    }
    return row;
  },
};

// —— Support tickets ——
export const ticketsStore = {
  ...makeStore(BASE_KEYS.tickets, 'tickets'),
  listByApp(appId) {
    return this.list().filter((t) => !appId || String(t.app_id) === String(appId));
  },
};

export const replyTemplatesStore = makeStore(BASE_KEYS.reply_templates, 'reply_templates');

// —— Affiliates ——
export const affiliatesStore = makeStore(BASE_KEYS.affiliates, 'affiliates');
export const affiliatePayoutsStore = makeStore(BASE_KEYS.affiliate_payouts, 'affiliate_payouts');

export function affiliateStats(code) {
  const affiliates = affiliatesStore.list();
  const affiliate = affiliates.find((a) => a.code === code || String(a.id) === String(code));
  if (!affiliate) return null;
  const payouts = affiliatePayoutsStore
    .list()
    .filter((p) => String(p.affiliate_id) === String(affiliate.id));
  const earned = payouts.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const paid = payouts.filter((p) => p.status === 'paid').reduce((s, p) => s + (Number(p.amount) || 0), 0);
  return { affiliate, payouts, earned, paid, owed: earned - paid, conversions: Number(affiliate.conversions) || 0 };
}

// —— Content calendar ——
export const contentStore = makeStore(BASE_KEYS.content, 'content');

// —— Experiments ——
export const experimentsStore = {
  ...makeStore(BASE_KEYS.experiments, 'experiments'),
  listByApp(appId) {
    return this.list().filter((e) => !appId || String(e.app_id) === String(appId));
  },
};

// —— Domains ——
export const domainsStore = makeStore(BASE_KEYS.domains, 'domains');

// —— Legal / compliance ——
export const legalStore = makeStore(BASE_KEYS.legal, 'legal');

export function legalReminders(withinDays = 30) {
  const now = Date.now();
  const horizon = now + withinDays * 86400000;
  return legalStore.list().filter((doc) => {
    if (!doc.renewal_at) return false;
    const t = new Date(doc.renewal_at).getTime();
    return t >= now - 86400000 && t <= horizon;
  });
}
