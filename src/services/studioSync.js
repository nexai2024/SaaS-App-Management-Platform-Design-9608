/**
 * Studio feature persistence via dedicated NCB tables (not app_notes).
 * localStorage remains a cache; cloud rows are source of truth when tables exist.
 */

import { dataFetch, publicDataFetch } from '../api';
import { TABLES } from './dataLayer';
import {
  asDbId,
  compactPayload,
  getUserId,
  nowIso,
  unwrapList,
  unwrapOne,
  isInternalNote,
} from '../lib/dataUtils';

export const STUDIO_COLLECTIONS = [
  'incidents',
  'maintenance',
  'waitlists',
  'waitlist_signups',
  'tickets',
  'reply_templates',
  'affiliates',
  'affiliate_payouts',
  'content',
  'experiments',
  'domains',
  'legal',
];

const COLLECTION_TABLE = {
  incidents: TABLES.studioIncidents,
  maintenance: TABLES.studioMaintenance,
  waitlists: TABLES.studioWaitlists,
  waitlist_signups: TABLES.studioWaitlistSignups,
  tickets: TABLES.studioTickets,
  reply_templates: TABLES.studioReplyTemplates,
  affiliates: TABLES.studioAffiliates,
  affiliate_payouts: TABLES.studioAffiliatePayouts,
  content: TABLES.studioContent,
  experiments: TABLES.studioExperiments,
  domains: TABLES.studioDomains,
  legal: TABLES.studioLegal,
};

const META_KEY = 'studio_sync_meta_v1';
const TABLE_STATUS_KEY = 'studio_table_status_v1';

function metaKey() {
  return `${META_KEY}:${getUserId() || 'anon'}`;
}

function readMeta() {
  try {
    return JSON.parse(localStorage.getItem(metaKey()) || '{}');
  } catch {
    return {};
  }
}

function writeMeta(patch) {
  const next = { ...readMeta(), ...patch, updated_at: new Date().toISOString() };
  localStorage.setItem(metaKey(), JSON.stringify(next));
  return next;
}

function tableStatus() {
  try {
    return JSON.parse(localStorage.getItem(TABLE_STATUS_KEY) || '{}');
  } catch {
    return {};
  }
}

function setTableOk(table, ok) {
  const map = tableStatus();
  map[table] = { ok: !!ok, checked_at: new Date().toISOString() };
  localStorage.setItem(TABLE_STATUS_KEY, JSON.stringify(map));
}

function isTableKnownMissing(table) {
  return tableStatus()[table]?.ok === false;
}

function looksLikeMissingTable(error) {
  const msg = String(error || '').toLowerCase();
  return (
    msg.includes('does not exist') ||
    msg.includes("doesn't exist") ||
    msg.includes('unknown table') ||
    msg.includes('no such table') ||
    msg.includes('er_no_such_table') ||
    msg.includes('relation') && msg.includes('does not exist') ||
    msg.includes('table not found')
  );
}

function uid(prefix = 'row') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function isNumericDbId(id) {
  return id != null && id !== '' && /^\d+$/.test(String(id));
}

function requireUser() {
  const userId = getUserId();
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

/** Clear cached "table missing" flags so we retry after migration. */
export function clearStudioTableStatusCache() {
  localStorage.removeItem(TABLE_STATUS_KEY);
}

async function ncbRead(table, query = '') {
  if (isTableKnownMissing(table)) return { missing: true, rows: [] };
  const userId = getUserId();
  const qs = query ? `${query}&owner_id=${userId}` : `owner_id=${userId}`;
  const res = await dataFetch(`read/${table}?${qs}`);
  if (res?.status === 'error') {
    if (looksLikeMissingTable(res.error)) {
      setTableOk(table, false);
      return { missing: true, rows: [] };
    }
    throw new Error(res.error || `Failed to read ${table}`);
  }
  setTableOk(table, true);
  return { missing: false, rows: unwrapList(res.data) };
}

async function ncbSave(table, row, existingId = null) {
  if (isTableKnownMissing(table)) return { missing: true, row: null };
  const userId = requireUser();
  const dbId = isNumericDbId(existingId)
    ? Number(existingId)
    : isNumericDbId(row.id)
      ? Number(row.id)
      : null;

  // NCB studio tables use INT AUTO_INCREMENT — never send client string ids on create.
  const { id: _dropId, ...rest } = row || {};
  const payload = compactPayload({
    ...rest,
    ...(dbId != null ? { id: dbId } : {}),
    user_id: userId,
    updated_at: nowIso(),
    ...(dbId != null ? {} : { created_at: row.created_at || nowIso() }),
  });

  if (dbId != null) {
    const res = await dataFetch(`update/${table}/${dbId}?owner_id=${userId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (res?.status === 'error') {
      if (looksLikeMissingTable(res.error)) {
        setTableOk(table, false);
        return { missing: true, row: null };
      }
      // Row may not exist yet — create
      const createRes = await dataFetch(`create/${table}?owner_id=${userId}`, {
        method: 'POST',
        body: JSON.stringify(compactPayload({ ...payload, id: undefined })),
      });
      if (createRes?.status === 'error') {
        throw new Error(createRes.error || `Failed to save ${table}`);
      }
      setTableOk(table, true);
      return { missing: false, row: unwrapOne(createRes.data) || payload, created: true };
    }
    setTableOk(table, true);
    return { missing: false, row: unwrapOne(res.data) || { ...payload, id: dbId } };
  }

  const createPayload = compactPayload({ ...payload });
  delete createPayload.id;
  const res = await dataFetch(`create/${table}?owner_id=${userId}`, {
    method: 'POST',
    body: JSON.stringify(createPayload),
  });

  if (res?.status === 'error') {
    if (looksLikeMissingTable(res.error)) {
      setTableOk(table, false);
      return { missing: true, row: null };
    }
    throw new Error(res.error || `Failed to save ${table}`);
  }
  setTableOk(table, true);
  return { missing: false, row: unwrapOne(res.data) || createPayload, created: true };
}

async function ncbRemove(table, id) {
  if (isTableKnownMissing(table) || !id) return { missing: isTableKnownMissing(table) };
  const userId = requireUser();
  const res = await dataFetch(`delete/${table}/${id}?owner_id=${userId}`, { method: 'DELETE' });
  if (res?.status === 'error') {
    if (looksLikeMissingTable(res.error)) {
      setTableOk(table, false);
      return { missing: true };
    }
    throw new Error(res.error || `Failed to delete ${table}`);
  }
  return { missing: false };
}

/** List one collection from its table. */
export async function listCollection(name) {
  const table = COLLECTION_TABLE[name];
  if (!table) return [];
  const { rows } = await ncbRead(table);
  return rows;
}

/** Upsert one row into its collection table. */
export async function saveCollectionRow(name, item) {
  const table = COLLECTION_TABLE[name];
  if (!table) throw new Error(`Unknown collection ${name}`);
  const existingId = isNumericDbId(item.id) ? item.id : null;
  return ncbSave(table, item, existingId);
}

export async function removeCollectionRow(name, id) {
  const table = COLLECTION_TABLE[name];
  if (!table) return;
  return ncbRemove(table, id);
}

/** Pull all studio collections from tables. */
export async function pullStudioState() {
  const collections = {};
  let anyMissing = false;
  for (const name of STUDIO_COLLECTIONS) {
    try {
      const table = COLLECTION_TABLE[name];
      const { rows, missing } = await ncbRead(table);
      if (missing) {
        anyMissing = true;
        continue; // keep local cache; do not overwrite with []
      }
      collections[name] = rows;
    } catch (e) {
      console.warn(`pull ${name} failed`, e);
    }
  }
  writeMeta({ last_pull_at: new Date().toISOString(), tables_missing: anyMissing });
  return { collections, updated_at: new Date().toISOString(), tablesMissing: anyMissing };
}

/**
 * Push local collections to tables (upsert each row).
 * Prefer incremental saves from stores; this is for bulk migrate / Push button.
 */
export async function pushStudioState(collections = {}) {
  const userId = requireUser();
  clearStudioTableStatusCache();
  let saved = 0;
  let missing = false;
  const idRemap = {}; // collection -> [{ from, to }]

  for (const name of STUDIO_COLLECTIONS) {
    const rows = collections[name];
    if (!Array.isArray(rows)) continue;
    const table = COLLECTION_TABLE[name];
    idRemap[name] = [];
    for (const row of rows) {
      const localId = row.id;
      const result = await ncbSave(table, { ...row, user_id: userId }, isNumericDbId(row.id) ? row.id : null);
      if (result.missing) {
        missing = true;
        break;
      }
      saved += 1;
      if (result.row?.id != null && String(result.row.id) !== String(localId)) {
        idRemap[name].push({ from: localId, to: result.row.id });
      }
    }
    if (missing) break;
  }
  writeMeta({ last_push_at: new Date().toISOString(), tables_missing: missing });
  if (missing) {
    throw new Error(
      'Studio tables are not created yet on NCB. Run migration 20260811170000_studio_feature_tables.sql, then Push again.'
    );
  }
  return { saved, idRemap };
}

export function getWebhookTokenLocal() {
  return readMeta().webhook_token || '';
}

export function getPublicBundleTokenLocal() {
  return readMeta().public_token || '';
}

export function getWebhookUrls(origin = typeof window !== 'undefined' ? window.location.origin : '') {
  const token = getWebhookTokenLocal();
  if (!token) return { support: '', status: '', token: '' };
  const base = String(origin || '').replace(/\/$/, '');
  return {
    token,
    support: `${base}/api/webhooks/support?token=${encodeURIComponent(token)}`,
    status: `${base}/api/webhooks/status?token=${encodeURIComponent(token)}`,
  };
}

function randomToken(prefix = 'wh') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/** Ensure webhook token row exists in studio_webhook_tokens (not notes). */
export async function ensureWebhookRegistry() {
  clearStudioTableStatusCache();
  const userId = requireUser();
  const meta = readMeta();
  let token = meta.webhook_token || randomToken('wh');

  const table = TABLES.studioWebhookTokens;
  const { rows, missing } = await ncbRead(table);
  if (missing) {
    writeMeta({ webhook_token: token });
    return { token, missing: true };
  }

  let row = rows.find((r) => r.token === token) || rows[0];
  if (row?.token) token = row.token;

  if (!row) {
    const saved = await ncbSave(table, {
      token,
      channels_json: JSON.stringify({ support: true, status: true }),
    });
    row = saved.row;
  }

  writeMeta({ webhook_token: token, webhook_token_id: row?.id });
  return { token, row, missing: false };
}

/** Publish public status/waitlist payload to studio_public_bundles. */
export async function publishPublicBundleRemote(bundle) {
  const userId = requireUser();
  await ensureWebhookRegistry();
  const meta = readMeta();
  const publicToken = meta.public_token || randomToken('pub');
  const table = TABLES.studioPublicBundles;

  const { rows, missing } = await ncbRead(table);
  if (missing) {
    writeMeta({ public_token: publicToken });
    throw new Error('studio_public_bundles table missing — run studio tables migration');
  }

  const existing = rows.find((r) => r.share_token === publicToken) || rows[0];
  const payload = JSON.stringify({ ...bundle, published_at: new Date().toISOString() });
  const saved = await ncbSave(
    table,
    {
      share_token: existing?.share_token || publicToken,
      payload,
      published_at: nowIso(),
      user_id: userId,
    },
    existing?.id || null
  );

  const token = saved.row?.share_token || publicToken;
  writeMeta({ public_token: token, public_bundle_id: saved.row?.id });
  return {
    note: saved.row,
    publicToken: token,
    url: `${window.location.origin}/status?t=${token}`,
  };
}

export async function readPublicBundleRemote(token) {
  if (!token) return null;
  const table = TABLES.studioPublicBundles;
  const res = await publicDataFetch(
    `read/${table}?share_token=${encodeURIComponent(token)}`
  );
  if (res?.status === 'error') return null;
  const row = unwrapOne(res.data);
  if (!row) return null;
  try {
    return typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
  } catch {
    return null;
  }
}

/** Drain unprocessed webhook events into a callback, then mark processed. */
export async function drainWebhookInbox(onEvent) {
  const { token, missing } = await ensureWebhookRegistry();
  if (missing || !token) return { processed: 0 };

  const table = TABLES.studioWebhookEvents;
  if (isTableKnownMissing(table)) return { processed: 0 };

  const userId = getUserId();
  const res = await dataFetch(
    `read/${table}?token=${encodeURIComponent(token)}&owner_id=${userId}`
  );
  // Some schemas won't filter by token via owner_id — also try without
  let rows = [];
  if (res?.status === 'error') {
    if (looksLikeMissingTable(res.error)) {
      setTableOk(table, false);
      return { processed: 0 };
    }
    const res2 = await dataFetch(`read/${table}?token=${encodeURIComponent(token)}`);
    if (res2?.status === 'error') return { processed: 0 };
    rows = unwrapList(res2.data);
  } else {
    rows = unwrapList(res.data);
  }

  const pending = rows.filter((r) => !r.processed || r.processed === 0 || r.processed === '0');
  let processed = 0;
  for (const event of pending) {
    let payload = event.payload;
    try {
      payload = typeof payload === 'string' ? JSON.parse(payload) : payload;
    } catch {
      /* keep raw */
    }
    try {
      onEvent?.({
        id: event.id,
        channel: event.channel,
        payload,
        at: event.created_at,
      });
      await ncbSave(table, { ...event, processed: 1, payload: event.payload }, event.id);
      processed += 1;
    } catch (e) {
      console.warn('Failed applying webhook event', e);
    }
  }
  return { processed };
}

/**
 * Delete legacy [Studio] / studio_* notes that polluted Notes.
 * Safe to call repeatedly.
 */
export async function cleanupLegacyStudioNotes() {
  const userId = getUserId();
  if (!userId) return { deleted: 0 };

  const appsRes = await dataFetch(`read/${TABLES.apps}?owner_id=${userId}`);
  const apps = unwrapList(appsRes?.data);
  let deleted = 0;

  for (const app of apps) {
    const notesRes = await dataFetch(
      `read/${TABLES.notes}?app_id=${asDbId(app.id)}&owner_id=${userId}`
    );
    if (notesRes?.status === 'error') continue;
    const notes = unwrapList(notesRes.data).filter(isInternalNote).filter((n) => {
      const type = String(n.note_type || '');
      const title = String(n.title || '');
      return type.startsWith('studio') || title.startsWith('[Studio]');
    });
    for (const note of notes) {
      const del = await dataFetch(`delete/${TABLES.notes}/${note.id}?owner_id=${userId}`, {
        method: 'DELETE',
      });
      if (del?.status !== 'error') deleted += 1;
    }
  }

  return { deleted };
}

/** Enqueue webhook event (browser helper; server uses api/_lib). */
export async function appendWebhookEventPublic(token, event) {
  const table = TABLES.studioWebhookEvents;
  const payload = {
    token,
    channel: event.channel || 'support',
    payload: JSON.stringify(event.payload || event),
    processed: 0,
    created_at: nowIso(),
  };

  let res = await publicDataFetch(`create/${table}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (res?.status === 'error') {
    const tokRes = await publicDataFetch(
      `read/${TABLES.studioWebhookTokens}?token=${encodeURIComponent(token)}`
    );
    const tok = unwrapOne(tokRes?.data);
    res = await publicDataFetch(`create/${table}`, {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        user_id: tok?.user_id || undefined,
      }),
    });
  }

  if (res?.status === 'error') {
    return { ok: false, error: res.error || 'Failed to enqueue event' };
  }
  const row = unwrapOne(res.data);
  return { ok: true, eventId: row?.id };
}
