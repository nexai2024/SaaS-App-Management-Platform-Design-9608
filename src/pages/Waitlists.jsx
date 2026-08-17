import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { dataFetch } from '../api';
import {
  waitlistsStore,
  hydrateStudioFromCloud,
  syncStudioToCloud,
  publishPublicBundle,
  buildStatusSnapshot,
  readPublicBundle,
  getPublicBundleTokenLocal,
} from '../services/studioFeatures';
import { appMonitoring } from '../services/appMonitoring';
import {
  slugify,
  launchUrl,
  loadSignupsForWaitlist,
  waitlistStats,
  convertSignup,
  exportSignupsCsv,
  normalizeWaitlist,
  nextInQueue,
  inviteNextInQueue,
  exportEspInviteCsv,
  emailsListText,
  openMailtoDraft,
  defaultInviteCopy,
  renderInviteTemplate,
  firstNameFromSignup,
} from '../services/waitlistService';
import StudioSyncPanel from '../components/common/StudioSyncPanel';
import { toastSuccess, toastError } from '../components/common/Toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const {
  FiPlus,
  FiTrash2,
  FiExternalLink,
  FiUserCheck,
  FiCopy,
  FiDownload,
  FiEdit3,
  FiX,
  FiSearch,
  FiUsers,
  FiCheckCircle,
  FiPause,
  FiPlay,
  FiUploadCloud,
  FiSend,
  FiMail,
} = FiIcons;

const emptyForm = {
  id: null,
  app_id: '',
  slug: '',
  headline: '',
  subhead: '',
  cta: 'Join waitlist',
  status: 'live',
  show_count: true,
  success_message: "You're on the list. Share your link to move up the queue.",
};

const Waitlists = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const appFromUrl = searchParams.get('app') || '';
  const [apps, setApps] = useState([]);
  const [lists, setLists] = useState([]);
  const [signups, setSignups] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [dripOpen, setDripOpen] = useState(false);
  const [dripCount, setDripCount] = useState(10);
  const [dripInviteUrl, setDripInviteUrl] = useState('');
  const [dripSubject, setDripSubject] = useState('');
  const [dripBody, setDripBody] = useState('');
  const [dripAlsoConvert, setDripAlsoConvert] = useState(false);
  const [dripBusy, setDripBusy] = useState(false);
  const [lastBatch, setLastBatch] = useState(null);
  const userId = localStorage.getItem('user_id');

  const selectedList = useMemo(
    () => lists.find((w) => String(w.id) === String(selected)) || null,
    [lists, selected]
  );

  const refreshLists = useCallback(() => {
    setLists(waitlistsStore.list().map(normalizeWaitlist));
  }, []);

  const refreshSignups = useCallback(async (waitlistId) => {
    if (!waitlistId) {
      setSignups([]);
      return;
    }
    const rows = await loadSignupsForWaitlist(waitlistId);
    setSignups(rows);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await hydrateStudioFromCloud();
      } catch {
        /* offline / tables */
      }
      const res = await dataFetch(`read/apps_1739884512?owner_id=${userId}`).catch(() => null);
      setApps(res?.data ?? []);
      refreshLists();
    })();
    const onHydrated = () => {
      refreshLists();
      if (selected) refreshSignups(selected);
    };
    window.addEventListener('studio-hydrated', onHydrated);
    return () => window.removeEventListener('studio-hydrated', onHydrated);
  }, []);

  useEffect(() => {
    refreshSignups(selected);
  }, [selected, refreshSignups]);

  // Deep-link from App Details: /waitlists?app=:id
  useEffect(() => {
    if (!appFromUrl) return;
    // Wait until apps hydrate so we can prefill name/slug
    if (!apps.length && userId) return;

    const existing = lists.find((w) => String(w.app_id) === String(appFromUrl));
    if (existing) {
      setSelected(existing.id);
      setSearchParams({}, { replace: true });
      return;
    }

    const app = apps.find((a) => String(a.id) === String(appFromUrl));
    setForm({
      ...emptyForm,
      app_id: appFromUrl,
      slug: slugify(app?.name || `app-${appFromUrl}`),
      headline: app ? `Join the ${app.name} waitlist` : '',
      subhead: app?.description || '',
    });
    setEditing(true);
    setSearchParams({}, { replace: true });
  }, [appFromUrl, lists, apps, userId, setSearchParams]);

  const stats = useMemo(() => waitlistStats(signups), [signups]);

  const filteredSignups = useMemo(() => {
    let rows = signups;
    if (statusFilter === 'pending') {
      rows = rows.filter((s) => s.status !== 'converted' && s.status !== 'invited');
    }
    if (statusFilter === 'invited') rows = rows.filter((s) => s.status === 'invited');
    if (statusFilter === 'converted') rows = rows.filter((s) => s.status === 'converted');
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(
        (s) =>
          s.email.includes(q) ||
          String(s.name || '').toLowerCase().includes(q) ||
          String(s.referral_code || '').toLowerCase().includes(q) ||
          String(s.invite_batch || '').toLowerCase().includes(q)
      );
    }
    return [...rows].reverse();
  }, [signups, query, statusFilter]);

  const dripPreview = useMemo(
    () => nextInQueue(signups, dripCount),
    [signups, dripCount]
  );

  const productName = useMemo(() => {
    if (!selectedList?.app_id) return selectedList?.headline || 'our product';
    return apps.find((a) => String(a.id) === String(selectedList.app_id))?.name || 'our product';
  }, [selectedList, apps]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditing(true);
  };

  const openDrip = () => {
    if (!selectedList) return;
    const app = apps.find((a) => String(a.id) === String(selectedList.app_id));
    const inviteUrl =
      app?.landing_page || app?.live_url || app?.domain || '';
    const copy = defaultInviteCopy({ product: productName, inviteUrl });
    setDripCount(stats.pending > 0 ? Math.min(10, stats.pending) : 10);
    setDripInviteUrl(inviteUrl);
    setDripSubject(copy.subject);
    setDripBody(copy.body);
    setDripAlsoConvert(false);
    setLastBatch(null);
    setDripOpen(true);
  };

  const openEdit = (w) => {
    setForm({
      id: w.id,
      app_id: w.app_id || '',
      slug: w.slug || '',
      headline: w.headline || '',
      subhead: w.subhead || '',
      cta: w.cta || 'Join waitlist',
      status: w.status || 'live',
      show_count: w.show_count !== false,
      success_message: w.success_message || emptyForm.success_message,
    });
    setEditing(true);
  };

  const saveForm = async () => {
    const slug = slugify(form.slug);
    if (!slug) {
      toastError('Slug is required');
      return;
    }
    const dup = lists.find(
      (w) => w.slug === slug && String(w.id) !== String(form.id || '')
    );
    if (dup) {
      toastError('That slug is already used');
      return;
    }
    const row = waitlistsStore.save({
      ...form,
      slug,
      show_count: !!form.show_count,
      app_id: form.app_id || null,
    });
    setEditing(false);
    setForm(emptyForm);
    refreshLists();
    setSelected(row.id);
    try {
      await syncStudioToCloud();
    } catch {
      /* local ok */
    }
    toastSuccess(form.id ? 'Waitlist updated' : 'Waitlist created');
  };

  const setListStatus = async (w, status) => {
    waitlistsStore.save({ ...w, status });
    refreshLists();
    try {
      await syncStudioToCloud();
    } catch {
      /* ignore */
    }
    toastSuccess(status === 'live' ? 'Waitlist is live' : `Marked ${status}`);
  };

  const copyLink = async (w) => {
    const url = launchUrl(w.slug);
    try {
      await navigator.clipboard.writeText(url);
      toastSuccess('Launch link copied');
    } catch {
      toastError('Copy failed');
    }
  };

  const publish = async () => {
    try {
      setBusy(true);
      await syncStudioToCloud();
      const monitoringByApp = {};
      apps.forEach((app) => {
        monitoringByApp[String(app.id)] = appMonitoring.get(app.id);
      });
      const prev = readPublicBundle();
      const result = await publishPublicBundle({
        ...prev,
        ...buildStatusSnapshot(apps, monitoringByApp),
        waitlists: waitlistsStore.list(),
      });
      const token = result.publicToken || getPublicBundleTokenLocal();
      toastSuccess(
        token
          ? `Published · share /launch/{slug} (bundle t=${token.slice(0, 8)}…)`
          : 'Launch pages published'
      );
    } catch (e) {
      toastError(e.message || 'Publish failed');
    } finally {
      setBusy(false);
    }
  };

  const handleConvert = async (s) => {
    try {
      await convertSignup(s, { bumpUsers: true });
      await refreshSignups(selected);
      toastSuccess(`${s.email} marked as first user`);
    } catch (e) {
      toastError(e.message || 'Convert failed');
    }
  };

  const runDripInvite = async () => {
    try {
      setDripBusy(true);
      const result = await inviteNextInQueue(signups, {
        count: dripCount,
        convert: dripAlsoConvert,
        bumpUsers: dripAlsoConvert,
      });
      setLastBatch(result);
      await refreshSignups(selected);
      toastSuccess(
        dripAlsoConvert
          ? `Invited & converted ${result.invited.length} from the queue`
          : `Marked ${result.invited.length} as invited`
      );
    } catch (e) {
      toastError(e.message || 'Invite batch failed');
    } finally {
      setDripBusy(false);
    }
  };

  const downloadEspCsv = (rows, batchId) => {
    exportEspInviteCsv(rows, {
      waitlist: selectedList,
      product: productName,
      inviteUrl: dripInviteUrl,
      batchId: batchId || '',
    });
    toastSuccess('ESP CSV downloaded');
  };

  const copyEmails = async (rows) => {
    try {
      await navigator.clipboard.writeText(emailsListText(rows));
      toastSuccess(`${rows.length} emails copied`);
    } catch {
      toastError('Copy failed');
    }
  };

  const copyInviteDraft = async (rows) => {
    const sample = rows[0];
    const subject = renderInviteTemplate(dripSubject, {
      name: firstNameFromSignup(sample),
      product: productName,
      invite_url: dripInviteUrl,
      position: '1',
    });
    const body = renderInviteTemplate(dripBody, {
      name: firstNameFromSignup(sample),
      product: productName,
      invite_url: dripInviteUrl,
      position: '1',
    });
    const text = `Subject: ${subject}\n\n${body}\n\n---\nBCC / recipients:\n${emailsListText(rows)}`;
    try {
      await navigator.clipboard.writeText(text);
      toastSuccess('Invite draft + BCC list copied');
    } catch {
      toastError('Copy failed');
    }
  };

  const openMailClient = (rows) => {
    const sample = rows[0];
    const subject = renderInviteTemplate(dripSubject, {
      name: 'there',
      product: productName,
      invite_url: dripInviteUrl,
      position: '',
    });
    const body = renderInviteTemplate(dripBody, {
      name: 'there',
      product: productName,
      invite_url: dripInviteUrl,
      position: '',
    });
    // Most mail clients truncate long BCC — copy emails first, open draft with body
    copyEmails(rows);
    openMailtoDraft({
      subject,
      body: `${body}\n\n(Paste BCC from clipboard — ${rows.length} addresses copied)`,
      bcc: rows.slice(0, 40).map((s) => s.email),
    });
  };

  const appName = (id) => apps.find((a) => String(a.id) === String(id))?.name || '—';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page-shell">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Waitlists & launch</h1>
          <p className="page-subtitle">
            Public launch pages, referral queue, and drip invites for the next N in line
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={openCreate}>
            <SafeIcon icon={FiPlus} className="w-4 h-4" /> New waitlist
          </button>
          <button type="button" className="btn-primary" disabled={busy} onClick={publish}>
            <SafeIcon icon={FiUploadCloud} className="w-4 h-4" />
            {busy ? 'Publishing…' : 'Publish & sync'}
          </button>
        </div>
      </div>

      <StudioSyncPanel channels={[]} />

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Lists */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-display font-semibold text-ink-950">Your waitlists</h2>
          {lists.map((w) => {
            const active = String(selected) === String(w.id);
            return (
              <div
                key={w.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(w.id)}
                onKeyDown={(e) => e.key === 'Enter' && setSelected(w.id)}
                className={`panel p-4 text-left transition-shadow ${
                  active ? 'ring-2 ring-brand-400 shadow-soft' : 'hover:shadow-soft'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-ink-950 truncate">{w.headline || w.slug}</p>
                      <StatusPill status={w.status} />
                    </div>
                    <p className="text-xs text-ink-400 mt-0.5">
                      /launch/{w.slug} · {appName(w.app_id)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-3" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="btn-secondary text-xs py-1 px-2" onClick={() => copyLink(w)}>
                    <SafeIcon icon={FiCopy} className="w-3.5 h-3.5" /> Copy
                  </button>
                  <Link
                    to={`/launch/${w.slug}`}
                    target="_blank"
                    className="btn-secondary text-xs py-1 px-2 inline-flex items-center gap-1"
                  >
                    <SafeIcon icon={FiExternalLink} className="w-3.5 h-3.5" /> Open
                  </Link>
                  <button type="button" className="btn-secondary text-xs py-1 px-2" onClick={() => openEdit(w)}>
                    <SafeIcon icon={FiEdit3} className="w-3.5 h-3.5" /> Edit
                  </button>
                  {w.status === 'live' ? (
                    <button
                      type="button"
                      className="btn-secondary text-xs py-1 px-2"
                      onClick={() => setListStatus(w, 'paused')}
                    >
                      <SafeIcon icon={FiPause} className="w-3.5 h-3.5" /> Pause
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-secondary text-xs py-1 px-2"
                      onClick={() => setListStatus(w, 'live')}
                    >
                      <SafeIcon icon={FiPlay} className="w-3.5 h-3.5" /> Go live
                    </button>
                  )}
                  <button
                    type="button"
                    className="p-1.5 text-ink-400 hover:text-rose-600"
                    onClick={() => {
                      if (!confirm('Delete this waitlist? Signups stay in the database.')) return;
                      waitlistsStore.remove(w.id);
                      if (String(selected) === String(w.id)) setSelected(null);
                      refreshLists();
                    }}
                  >
                    <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {!lists.length && (
            <div className="panel p-8 text-center text-ink-500 text-sm">
              No waitlists yet. Create one for an app to get a public /launch link.
            </div>
          )}
        </div>

        {/* Signups panel */}
        <div className="lg:col-span-3 space-y-4">
          {!selectedList ? (
            <div className="panel p-10 text-center text-ink-500 text-sm">
              Select a waitlist to manage signups, referrals, and conversions.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={FiUsers} label="Signups" value={stats.total} />
                <StatCard icon={FiSend} label="Pending" value={stats.pending} />
                <StatCard icon={FiMail} label="Invited" value={stats.invited} />
                <StatCard icon={FiCheckCircle} label="Converted" value={stats.converted} />
              </div>

              {stats.leaders.length > 0 && (
                <div className="panel p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-2">
                    Top referrers
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {stats.leaders.map((l) => (
                      <span
                        key={l.code}
                        className="text-xs bg-brand-50 text-brand-800 border border-brand-100 rounded-lg px-2.5 py-1"
                      >
                        {l.email || l.code} · {l.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[160px]">
                  <SafeIcon
                    icon={FiSearch}
                    className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
                  />
                  <input
                    className="input-field pl-9 py-2 text-sm"
                    placeholder="Search email, name, code…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <select
                  className="input-field w-auto py-2 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="invited">Invited</option>
                  <option value="converted">Converted</option>
                </select>
                <button
                  type="button"
                  className="btn-primary text-sm"
                  onClick={openDrip}
                  disabled={!stats.pending}
                  title="Invite the next N people in the queue"
                >
                  <SafeIcon icon={FiSend} className="w-4 h-4" /> Launch drip
                </button>
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={() => exportSignupsCsv(signups, selectedList)}
                  disabled={!signups.length}
                >
                  <SafeIcon icon={FiDownload} className="w-4 h-4" /> CSV
                </button>
              </div>

              <div className="space-y-2">
                {filteredSignups.map((s) => {
                  const pos = signups.findIndex(
                    (x) =>
                      String(x.id) === String(s.id) ||
                      String(x.email) === String(s.email)
                  );
                  return (
                  <div key={s.id || s.email} className="panel p-3.5 flex items-center gap-3">
                    <span className="text-xs text-ink-400 tabular-nums w-8">
                      #{pos >= 0 ? pos + 1 : '—'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink-950 truncate">{s.email}</p>
                      <p className="text-xs text-ink-400 truncate">
                        {s.name || '—'}
                        {s.referred_by ? ` · via ${s.referred_by}` : ''}
                        {s.referral_code ? ` · code ${s.referral_code}` : ''}
                        {s.created_at
                          ? ` · ${new Date(s.created_at).toLocaleDateString()}`
                          : ''}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md ${
                        s.status === 'converted'
                          ? 'bg-emerald-50 text-emerald-700'
                          : s.status === 'invited'
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-ink-50 text-ink-500'
                      }`}
                    >
                      {s.status}
                    </span>
                    {s.status === 'invited' && (
                      <button
                        type="button"
                        className="btn-secondary text-xs"
                        onClick={() => handleConvert(s)}
                        title="Mark converted (+1 app users)"
                      >
                        <SafeIcon icon={FiUserCheck} className="w-3.5 h-3.5" /> Convert
                      </button>
                    )}
                    {s.status !== 'converted' && s.status !== 'invited' && (
                      <button
                        type="button"
                        className="btn-secondary text-xs"
                        onClick={() => handleConvert(s)}
                        title="Mark as first user (+1 app users)"
                      >
                        <SafeIcon icon={FiUserCheck} className="w-3.5 h-3.5" /> Convert
                      </button>
                    )}
                  </div>
                  );
                })}
                {!filteredSignups.length && (
                  <p className="text-sm text-ink-500 py-6 text-center">
                    {signups.length ? 'No matches.' : 'No signups yet — share the launch link.'}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/40 backdrop-blur-sm">
          <div className="panel-solid w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-lg">
                {form.id ? 'Edit waitlist' : 'New waitlist'}
              </h3>
              <button type="button" className="p-2 hover:bg-ink-50 rounded-xl" onClick={() => setEditing(false)}>
                <SafeIcon icon={FiX} className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="label">App</label>
              <select
                className="input-field"
                value={form.app_id}
                onChange={(e) => {
                  const app = apps.find((a) => String(a.id) === e.target.value);
                  setForm((p) => ({
                    ...p,
                    app_id: e.target.value,
                    slug: p.slug || (app ? slugify(app.name) : ''),
                    headline: p.headline || (app ? `Join the ${app.name} waitlist` : ''),
                    subhead: p.subhead || app?.description || '',
                  }));
                }}
              >
                <option value="">Optional</option>
                {apps.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Slug (URL)</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-400 shrink-0">/launch/</span>
                <input
                  className="input-field"
                  value={form.slug}
                  onChange={(e) => setForm((p) => ({ ...p, slug: slugify(e.target.value) }))}
                  placeholder="my-product"
                />
              </div>
            </div>

            <div>
              <label className="label">Headline</label>
              <input
                className="input-field"
                value={form.headline}
                onChange={(e) => setForm((p) => ({ ...p, headline: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">Supporting copy</label>
              <textarea
                className="input-field"
                rows={3}
                value={form.subhead}
                onChange={(e) => setForm((p) => ({ ...p, subhead: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">CTA button</label>
                <input
                  className="input-field"
                  value={form.cta}
                  onChange={(e) => setForm((p) => ({ ...p, cta: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Status</label>
                <select
                  className="input-field"
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="live">Live</option>
                  <option value="paused">Paused</option>
                  <option value="draft">Draft</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Success message</label>
              <input
                className="input-field"
                value={form.success_message}
                onChange={(e) => setForm((p) => ({ ...p, success_message: e.target.value }))}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={!!form.show_count}
                onChange={(e) => setForm((p) => ({ ...p, show_count: e.target.checked }))}
              />
              Show signup count on launch page
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={saveForm}>
                Save waitlist
              </button>
            </div>
          </div>
        </div>
      )}

      {dripOpen && selectedList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/40 backdrop-blur-sm">
          <div className="panel-solid w-full max-w-xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-lg">Launch drip</h3>
                <p className="text-sm text-ink-500 mt-0.5">
                  Invite the next people in the FIFO queue — export to your ESP or open a mail draft
                </p>
              </div>
              <button
                type="button"
                className="p-2 hover:bg-ink-50 rounded-xl"
                onClick={() => setDripOpen(false)}
              >
                <SafeIcon icon={FiX} className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Invite next</label>
                <div className="flex gap-2">
                  {[5, 10, 25, 50].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`btn-secondary text-xs flex-1 ${
                        Number(dripCount) === n ? 'ring-2 ring-brand-400' : ''
                      }`}
                      onClick={() => setDripCount(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  max={500}
                  className="input-field mt-2"
                  value={dripCount}
                  onChange={(e) => setDripCount(e.target.value)}
                />
                <p className="text-xs text-ink-400 mt-1">
                  {stats.pending} pending · selecting {dripPreview.length}
                </p>
              </div>
              <div>
                <label className="label">Product invite URL</label>
                <input
                  className="input-field"
                  placeholder="https://app.example.com/signup"
                  value={dripInviteUrl}
                  onChange={(e) => setDripInviteUrl(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="label">Email subject</label>
              <input
                className="input-field"
                value={dripSubject}
                onChange={(e) => setDripSubject(e.target.value)}
              />
            </div>

            <div>
              <label className="label">
                Email body{' '}
                <span className="font-normal text-ink-400">
                  {'{{name}} {{product}} {{invite_url}}'}
                </span>
              </label>
              <textarea
                className="input-field font-mono text-sm"
                rows={6}
                value={dripBody}
                onChange={(e) => setDripBody(e.target.value)}
              />
            </div>

            <div className="panel p-3 max-h-36 overflow-y-auto space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 mb-1">
                Queue preview
              </p>
              {dripPreview.map((s, i) => (
                <p key={s.id || s.email} className="text-xs text-ink-700 truncate">
                  #{i + 1} {s.email}
                  {s.name ? ` · ${s.name}` : ''}
                </p>
              ))}
              {!dripPreview.length && (
                <p className="text-xs text-ink-500">No pending signups left.</p>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={dripAlsoConvert}
                onChange={(e) => setDripAlsoConvert(e.target.checked)}
              />
              Also mark converted (+{dripPreview.length} to app users)
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary"
                disabled={dripBusy || !dripPreview.length}
                onClick={runDripInvite}
              >
                <SafeIcon icon={FiSend} className="w-4 h-4" />
                {dripBusy
                  ? 'Working…'
                  : dripAlsoConvert
                    ? `Invite & convert ${dripPreview.length}`
                    : `Mark ${dripPreview.length} invited`}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={!dripPreview.length}
                onClick={() => downloadEspCsv(dripPreview, lastBatch?.batchId)}
              >
                <SafeIcon icon={FiDownload} className="w-4 h-4" /> ESP CSV
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={!dripPreview.length}
                onClick={() => copyEmails(dripPreview)}
              >
                <SafeIcon icon={FiCopy} className="w-4 h-4" /> Copy emails
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={!dripPreview.length}
                onClick={() => copyInviteDraft(dripPreview)}
              >
                <SafeIcon icon={FiCopy} className="w-4 h-4" /> Copy draft
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={!dripPreview.length}
                onClick={() => openMailClient(dripPreview)}
              >
                <SafeIcon icon={FiMail} className="w-4 h-4" /> Mail client
              </button>
            </div>

            {lastBatch?.invited?.length > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 space-y-2">
                <p className="text-sm font-medium text-emerald-900">
                  Batch {lastBatch.batchId} · {lastBatch.invited.length} people
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={() => downloadEspCsv(lastBatch.invited, lastBatch.batchId)}
                  >
                    Download this batch CSV
                  </button>
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={() => copyInviteDraft(lastBatch.invited)}
                  >
                    Copy draft for batch
                  </button>
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={() => openMailClient(lastBatch.invited)}
                  >
                    Open mail for batch
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

function StatusPill({ status }) {
  const map = {
    live: 'bg-emerald-50 text-emerald-700',
    paused: 'bg-amber-50 text-amber-800',
    draft: 'bg-ink-50 text-ink-500',
    closed: 'bg-rose-50 text-rose-700',
  };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${map[status] || map.draft}`}>
      {status || 'live'}
    </span>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="panel p-3.5">
      <div className="flex items-center gap-1.5 text-ink-400 text-[10px] uppercase tracking-wider font-semibold">
        <SafeIcon icon={icon} className="w-3 h-3" />
        {label}
      </div>
      <p className="font-display text-2xl font-semibold text-ink-950 mt-1 tabular-nums">{value}</p>
    </div>
  );
}

export default Waitlists;
