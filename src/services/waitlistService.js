/**
 * Waitlist / launch page service.
 * Public reads+signups go through NCB public-data; admin uses studio stores + sync.
 */

import { publicDataFetch, dataFetch } from '../api';
import { TABLES } from './dataLayer';
import {
  waitlistsStore,
  waitlistSignupsStore,
  syncStudioToCloud,
} from './studioFeatures';
import { nowIso, unwrapList, unwrapOne, compactPayload, getUserId } from '../lib/dataUtils';

const WAITLISTS = TABLES.studioWaitlists;
const SIGNUPS = TABLES.studioWaitlistSignups;
const APPS = TABLES.apps;

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export function makeReferralCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function launchUrl(slug, { ref, origin } = {}) {
  const base = `${origin || (typeof window !== 'undefined' ? window.location.origin : '')}/launch/${slug}`;
  return ref ? `${base}?ref=${encodeURIComponent(ref)}` : base;
}

/** Normalize waitlist row from NCB or local cache. */
export function normalizeWaitlist(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    app_id: row.app_id ?? null,
    slug: row.slug,
    headline: row.headline || '',
    subhead: row.subhead || '',
    cta: row.cta || 'Join waitlist',
    status: row.status || 'live',
    show_count:
      row.show_count === undefined || row.show_count === null
        ? true
        : row.show_count === 1 ||
          row.show_count === true ||
          row.show_count === '1' ||
          row.show_count === 'true',
    success_message:
      row.success_message || "You're on the list. Share your link to move up the queue.",
    accent: row.accent || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function normalizeSignup(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id ?? null,
    waitlist_id: row.waitlist_id,
    app_id: row.app_id ?? null,
    email: String(row.email || '').toLowerCase(),
    name: row.name || '',
    status: row.status || 'pending',
    referral_code: row.referral_code || '',
    referred_by: row.referred_by || null,
    invited_at: row.invited_at || null,
    invite_batch: row.invite_batch || null,
    converted_at: row.converted_at || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Fetch waitlist by slug for public launch pages. */
export async function fetchPublicWaitlist(slug) {
  const clean = String(slug || '').trim();
  if (!clean) return null;

  // 1) NCB public table
  try {
    const res = await publicDataFetch(
      `read/${WAITLISTS}?slug=${encodeURIComponent(clean)}`
    );
    if (res?.status !== 'error') {
      const row = unwrapList(res.data).find((w) => w.slug === clean) || unwrapOne(res.data);
      if (row) return normalizeWaitlist(row);
    }
  } catch {
    /* fall through */
  }

  // 2) Local / bundle cache (same browser as founder)
  const local = waitlistsStore.getBySlug(clean);
  if (local) return normalizeWaitlist(local);

  // 3) Treat slug as app id fallback
  try {
    const appRes = await publicDataFetch(`read/${APPS}?id=${encodeURIComponent(clean)}`);
    const app = unwrapOne(appRes?.data);
    if (app) {
      return normalizeWaitlist({
        id: null,
        app_id: app.id,
        slug: clean,
        headline: `Join the ${app.name} waitlist`,
        subhead: app.description || 'Be first to know when we launch.',
        cta: 'Join waitlist',
        status: 'live',
        show_count: true,
        _app: app,
      });
    }
  } catch {
    /* ignore */
  }

  return null;
}

export async function fetchPublicApp(appId) {
  if (!appId) return null;
  try {
    const res = await publicDataFetch(`read/${APPS}?id=${encodeURIComponent(appId)}`);
    return unwrapOne(res?.data) || null;
  } catch {
    return null;
  }
}

/** Count public signups for social proof (best-effort). */
export async function fetchSignupCount(waitlistId) {
  if (!waitlistId) return waitlistSignupsStore.list().length;
  try {
    const res = await publicDataFetch(
      `read/${SIGNUPS}?waitlist_id=${encodeURIComponent(waitlistId)}`
    );
    if (res?.status !== 'error') {
      return unwrapList(res.data).length;
    }
  } catch {
    /* ignore */
  }
  return waitlistSignupsStore.list(waitlistId).length;
}

/** Load all signups for a waitlist (admin). Merges cloud + local. */
export async function loadSignupsForWaitlist(waitlistId) {
  const local = waitlistSignupsStore.list(waitlistId).map(normalizeSignup);
  const map = new Map(local.map((s) => [String(s.email), s]));

  if (waitlistId && getUserId()) {
    try {
      const res = await dataFetch(
        `read/${SIGNUPS}?waitlist_id=${encodeURIComponent(waitlistId)}&owner_id=${getUserId()}`
      );
      if (res?.status !== 'error') {
        unwrapList(res.data).forEach((row) => {
          const n = normalizeSignup(row);
          if (!n?.email) return;
          const prev = map.get(n.email);
          // Prefer cloud row when ids are numeric
          if (!prev || (n.id && /^\d+$/.test(String(n.id)))) map.set(n.email, { ...prev, ...n });
        });
      }
    } catch {
      /* ignore */
    }
  }

  // Also merge anonymous public local mirror
  waitlistSignupsStore.publicList(waitlistId).forEach((row) => {
    const n = normalizeSignup(row);
    if (!n?.email || map.has(n.email)) return;
    map.set(n.email, n);
  });

  return [...map.values()].sort(
    (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  );
}

export function computeReferralCounts(signups = []) {
  const counts = {};
  signups.forEach((s) => {
    const code = String(s.referred_by || '').toUpperCase();
    if (!code) return;
    counts[code] = (counts[code] || 0) + 1;
  });
  return counts;
}

export function queuePosition(signups, signup) {
  if (!signup) return null;
  const ordered = [...signups].sort(
    (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  );
  const idx = ordered.findIndex(
    (s) =>
      String(s.id) === String(signup.id) ||
      String(s.email).toLowerCase() === String(signup.email).toLowerCase()
  );
  return idx >= 0 ? idx + 1 : ordered.length;
}

export function waitlistStats(signups = []) {
  const total = signups.length;
  const converted = signups.filter((s) => s.status === 'converted').length;
  const invited = signups.filter((s) => s.status === 'invited').length;
  const pending = signups.filter(
    (s) => s.status !== 'converted' && s.status !== 'invited'
  ).length;
  const withRef = signups.filter((s) => s.referred_by).length;
  const refCounts = computeReferralCounts(signups);
  const leaders = Object.entries(refCounts)
    .map(([code, count]) => {
      const owner = signups.find((s) => String(s.referral_code).toUpperCase() === code);
      return { code, count, email: owner?.email || null, name: owner?.name || null };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    total,
    converted,
    invited,
    pending,
    withRef,
    leaders,
    conversionRate: total ? Math.round((converted / total) * 100) : 0,
  };
}

/** FIFO pending signups (not invited/converted). */
export function nextInQueue(signups = [], count = 10) {
  const n = Math.max(1, Math.min(500, Number(count) || 10));
  return [...signups]
    .filter((s) => s.status !== 'converted' && s.status !== 'invited')
    .sort(
      (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    )
    .slice(0, n);
}

export function makeInviteBatchId() {
  return `batch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function defaultInviteCopy({ product = 'our product', inviteUrl = '' } = {}) {
  const subject = `You're in — ${product} is ready for you`;
  const body = `Hi {{name}},

Thanks for joining the waitlist. You're next — here's your invite:

{{invite_url}}

Welcome aboard,
The ${product} team`;
  return {
    subject,
    body: body.replace(/\{\{invite_url\}\}/g, inviteUrl || '{{invite_url}}'),
    inviteUrl,
  };
}

export function renderInviteTemplate(template, vars = {}) {
  return String(template || '').replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = vars[key];
    return v == null ? '' : String(v);
  });
}

export function firstNameFromSignup(signup) {
  const name = String(signup?.name || '').trim();
  if (name) return name.split(/\s+/)[0];
  const local = String(signup?.email || '').split('@')[0] || 'there';
  return local.charAt(0).toUpperCase() + local.slice(1);
}

/**
 * Mark next N as invited. Optionally convert + bump users.
 * Returns { batchId, invited: Signup[] }.
 */
export async function inviteNextInQueue(
  signups,
  {
    count = 10,
    convert = false,
    bumpUsers = false,
  } = {}
) {
  const batch = nextInQueue(signups, count);
  if (!batch.length) {
    throw new Error('No pending signups left in the queue');
  }
  const batchId = makeInviteBatchId();
  const invitedAt = nowIso();
  const invited = [];
  let appIdForBump = null;

  for (const signup of batch) {
    const patch = {
      id: signup.id,
      email: signup.email,
      waitlist_id: signup.waitlist_id,
      app_id: signup.app_id,
      name: signup.name,
      referral_code: signup.referral_code,
      referred_by: signup.referred_by,
      status: convert ? 'converted' : 'invited',
      invite_batch: batchId,
      invited_at: invitedAt,
      updated_at: invitedAt,
      ...(convert ? { converted_at: invitedAt } : {}),
    };

    waitlistSignupsStore.save(patch);

    if (signup.id && /^\d+$/.test(String(signup.id)) && getUserId()) {
      try {
        await dataFetch(`update/${SIGNUPS}/${signup.id}?owner_id=${getUserId()}`, {
          method: 'PUT',
          body: JSON.stringify(
            compactPayload({
              status: patch.status,
              invite_batch: batchId,
              invited_at: invitedAt,
              converted_at: convert ? invitedAt : undefined,
              updated_at: invitedAt,
            })
          ),
        });
      } catch {
        /* local ok */
      }
    }

    if (convert && bumpUsers && signup.app_id) {
      appIdForBump = signup.app_id;
    }
    invited.push(normalizeSignup({ ...signup, ...patch }));
  }

  if (convert && bumpUsers && appIdForBump && getUserId()) {
    try {
      const appRes = await dataFetch(
        `read/${APPS}?id=${appIdForBump}&owner_id=${getUserId()}`
      );
      const app = unwrapOne(appRes?.data);
      if (app) {
        const next = (Number(app.users_count) || 0) + invited.length;
        await dataFetch(`update/${APPS}/${app.id}?owner_id=${getUserId()}`, {
          method: 'PUT',
          body: JSON.stringify({ users_count: next, updated_at: nowIso() }),
        });
      }
    } catch {
      /* ignore */
    }
  }

  try {
    await syncStudioToCloud();
  } catch {
    /* ignore */
  }

  return { batchId, invited };
}

/** ESP-ready CSV for a drip batch (Mailchimp / ConvertKit / Beehiiv / etc.). */
export function exportEspInviteCsv(
  signups = [],
  {
    waitlist = null,
    product = '',
    inviteUrl = '',
    batchId = '',
  } = {}
) {
  const header = [
    'email',
    'first_name',
    'name',
    'invite_url',
    'queue_position',
    'waitlist_slug',
    'product',
    'batch_id',
    'referral_code',
    'joined_at',
  ];
  const lines = [header.join(',')];
  const ordered = [...signups].sort(
    (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  );

  ordered.forEach((s, i) => {
    lines.push(
      [
        s.email,
        firstNameFromSignup(s),
        s.name || '',
        inviteUrl,
        String(i + 1),
        waitlist?.slug || '',
        product,
        batchId || s.invite_batch || '',
        s.referral_code || '',
        s.created_at || '',
      ]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invite-batch-${waitlist?.slug || 'waitlist'}-${(batchId || 'export').slice(0, 24)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function emailsListText(signups = []) {
  return signups.map((s) => s.email).filter(Boolean).join(', ');
}

/** Opens a mailto draft; BCC list may be truncated by the OS mail client. */
export function openMailtoDraft({ to = '', bcc = [], subject = '', body = '' } = {}) {
  const bccStr = bcc.filter(Boolean).join(',');
  const params = new URLSearchParams();
  if (subject) params.set('subject', subject);
  if (body) params.set('body', body);
  if (bccStr) params.set('bcc', bccStr);
  const qs = params.toString().replace(/\+/g, '%20');
  window.location.href = `mailto:${encodeURIComponent(to)}?${qs}`;
}

/**
 * Public signup — writes to NCB public_write table, mirrors locally.
 */
export async function submitPublicSignup({
  waitlist,
  email,
  name = '',
  referred_by = null,
} = {}) {
  const cleanEmail = String(email || '')
    .trim()
    .toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Enter a valid email');
  }
  if (!waitlist?.id && !waitlist?.app_id) {
    throw new Error('Waitlist is not available');
  }
  if (waitlist.status === 'paused') {
    throw new Error('This waitlist is temporarily paused');
  }
  if (waitlist.status === 'closed' || waitlist.status === 'draft') {
    throw new Error('This waitlist is not accepting signups');
  }

  const waitlistId = waitlist.id;
  const existing = await loadSignupsForWaitlist(waitlistId);
  const dup = existing.find((s) => s.email === cleanEmail);
  if (dup) {
    return {
      signup: dup,
      duplicate: true,
      position: queuePosition(existing, dup),
      referrals: computeReferralCounts(existing)[String(dup.referral_code || '').toUpperCase()] || 0,
    };
  }

  const referral_code = makeReferralCode();
  const payload = compactPayload({
    waitlist_id: waitlistId ? Number(waitlistId) || waitlistId : undefined,
    app_id: waitlist.app_id ? Number(waitlist.app_id) || waitlist.app_id : undefined,
    email: cleanEmail,
    name: String(name || '').trim() || undefined,
    status: 'pending',
    referral_code,
    referred_by: referred_by ? String(referred_by).toUpperCase() : undefined,
    created_at: nowIso(),
    updated_at: nowIso(),
  });

  let remote = null;
  if (waitlistId) {
    const res = await publicDataFetch(`create/${SIGNUPS}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res?.status === 'error') {
      // Fall back to local mirror so UX still works in demos
      console.warn('Public signup NCB write failed', res.error);
    } else {
      remote = normalizeSignup(unwrapOne(res.data) || payload);
    }
  }

  const local = waitlistSignupsStore.publicAdd(waitlistId || `app_${waitlist.app_id}`, {
    ...payload,
    ...(remote || {}),
    id: remote?.id,
    waitlist_id: waitlistId || `app_${waitlist.app_id}`,
  });

  const signup = normalizeSignup(remote || local);
  const all = [...existing, signup];
  return {
    signup,
    duplicate: false,
    position: queuePosition(all, signup),
    referrals: 0,
  };
}

export async function convertSignup(signup, { bumpUsers = true } = {}) {
  const updated = waitlistSignupsStore.convert(signup.id);
  // Also patch NCB when numeric id
  if (signup.id && /^\d+$/.test(String(signup.id)) && getUserId()) {
    try {
      await dataFetch(`update/${SIGNUPS}/${signup.id}?owner_id=${getUserId()}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'converted',
          converted_at: nowIso(),
          updated_at: nowIso(),
        }),
      });
    } catch {
      /* ignore */
    }
  }

  if (bumpUsers && signup.app_id && getUserId()) {
    try {
      const appRes = await dataFetch(
        `read/${APPS}?id=${signup.app_id}&owner_id=${getUserId()}`
      );
      const app = unwrapOne(appRes?.data);
      if (app) {
        const next = (Number(app.users_count) || 0) + 1;
        await dataFetch(`update/${APPS}/${app.id}?owner_id=${getUserId()}`, {
          method: 'PUT',
          body: JSON.stringify({ users_count: next, updated_at: nowIso() }),
        });
      }
    } catch {
      /* ignore */
    }
  }

  try {
    await syncStudioToCloud();
  } catch {
    /* ignore */
  }

  return updated;
}

export function exportSignupsCsv(signups = [], waitlist = null) {
  const header = [
    'email',
    'name',
    'status',
    'referral_code',
    'referred_by',
    'invite_batch',
    'invited_at',
    'created_at',
    'converted_at',
  ];
  const lines = [header.join(',')];
  signups.forEach((s) => {
    lines.push(
      [
        s.email,
        s.name,
        s.status,
        s.referral_code,
        s.referred_by,
        s.invite_batch,
        s.invited_at,
        s.created_at,
        s.converted_at,
      ]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `waitlist-${waitlist?.slug || 'export'}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export { waitlistsStore, waitlistSignupsStore };
