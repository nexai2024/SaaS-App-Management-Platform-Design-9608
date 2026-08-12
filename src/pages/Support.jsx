import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { dataFetch } from '../api';
import { ticketsStore, replyTemplatesStore } from '../services/studioFeatures';
import StudioSyncPanel from '../components/common/StudioSyncPanel';
import { toastSuccess, toastError } from '../components/common/Toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiPlus, FiTrash2, FiInbox, FiMail } = FiIcons;

const DEFAULT_TEMPLATES = [
  { name: 'Ack', body: 'Thanks for reaching out — we received your request and will reply within 1 business day.' },
  { name: 'Resolved', body: 'This should now be fixed. Reply if anything still looks off.' },
];

const Support = () => {
  const [apps, setApps] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [filter, setFilter] = useState({ app_id: '', status: 'open' });
  const [form, setForm] = useState({
    subject: '',
    body: '',
    email: '',
    app_id: '',
    priority: 'medium',
    status: 'open',
    source: 'manual',
  });
  const [webhookPaste, setWebhookPaste] = useState('');
  const [reply, setReply] = useState('');
  const [active, setActive] = useState(null);
  const userId = localStorage.getItem('user_id');

  const refresh = () => {
    setTickets(ticketsStore.list());
    let t = replyTemplatesStore.list();
    if (!t.length) {
      DEFAULT_TEMPLATES.forEach((tpl) => replyTemplatesStore.save(tpl));
      t = replyTemplatesStore.list();
    }
    setTemplates(t);
  };

  useEffect(() => {
    (async () => {
      const res = await dataFetch(`read/apps_1739884512?owner_id=${userId}`).catch(() => null);
      setApps(res?.data ?? []);
      refresh();
    })();
    const onHydrated = () => refresh();
    window.addEventListener('studio-hydrated', onHydrated);
    return () => window.removeEventListener('studio-hydrated', onHydrated);
  }, []);

  const filtered = tickets.filter((t) => {
    if (filter.app_id && String(t.app_id) !== String(filter.app_id)) return false;
    if (filter.status === 'open' && ['resolved', 'closed'].includes(t.status)) return false;
    if (filter.status === 'closed' && !['resolved', 'closed'].includes(t.status)) return false;
    return true;
  });

  const ingestWebhook = () => {
    try {
      const payload = JSON.parse(webhookPaste);
      ticketsStore.save({
        subject: payload.subject || payload.title || 'Inbound ticket',
        body: payload.body || payload.text || payload.message || JSON.stringify(payload),
        email: payload.email || payload.from || '',
        app_id: payload.app_id || filter.app_id || '',
        priority: payload.priority || 'medium',
        status: 'open',
        source: 'webhook',
      });
      setWebhookPaste('');
      refresh();
      toastSuccess('Ticket ingested from webhook JSON');
    } catch {
      toastError('Invalid JSON');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page-shell">
      <div>
        <h1 className="page-title">Support inbox</h1>
        <p className="page-subtitle">Lightweight helpdesk per app — triage, templates, webhook ingest</p>
      </div>

      <StudioSyncPanel channels={['support']} />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap gap-2">
            <select className="input-field w-auto" value={filter.app_id} onChange={(e) => setFilter((p) => ({ ...p, app_id: e.target.value }))}>
              <option value="">All apps</option>
              {apps.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <select className="input-field w-auto" value={filter.status} onChange={(e) => setFilter((p) => ({ ...p, status: e.target.value }))}>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="all">All</option>
            </select>
          </div>

          {filtered.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setActive(t); setReply(''); }}
              className={`panel p-4 w-full text-left ${active?.id === t.id ? 'ring-2 ring-brand-400' : ''}`}
            >
              <div className="flex items-center gap-2">
                <SafeIcon icon={FiInbox} className="w-4 h-4 text-ink-400" />
                <span className="font-medium text-ink-950 truncate">{t.subject}</span>
                <span className="ml-auto text-xs uppercase text-ink-400">{t.priority}</span>
              </div>
              <p className="text-xs text-ink-400 mt-1">
                {t.email || 'no email'} · {t.status} · {t.source}
              </p>
            </button>
          ))}
          {!filtered.length && <p className="text-sm text-ink-500">Inbox empty.</p>}

          {active && (
            <div className="panel p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-display font-semibold text-ink-950">{active.subject}</h2>
                  <p className="text-xs text-ink-400">{active.email}</p>
                </div>
                <button type="button" className="p-2 text-rose-600" onClick={() => { ticketsStore.remove(active.id); setActive(null); refresh(); }}>
                  <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-ink-600 whitespace-pre-wrap">{active.body}</p>
              {active.reply && (
                <div className="rounded-xl bg-ink-50 p-3 text-sm text-ink-700">
                  <p className="text-xs font-semibold text-ink-400 mb-1">Last reply</p>
                  {active.reply}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {templates.map((tpl) => (
                  <button key={tpl.id} type="button" className="btn-secondary text-xs" onClick={() => setReply(tpl.body)}>
                    {tpl.name}
                  </button>
                ))}
              </div>
              <textarea className="input-field" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply…" />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    ticketsStore.save({ id: active.id, reply, status: 'open', replied_at: new Date().toISOString() });
                    setActive({ ...active, reply });
                    refresh();
                    toastSuccess('Reply saved (copy to email client)');
                  }}
                >
                  <SafeIcon icon={FiMail} className="w-4 h-4" /> Save reply
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    ticketsStore.save({ id: active.id, status: 'resolved', resolved_at: new Date().toISOString() });
                    setActive(null);
                    refresh();
                  }}
                >
                  Resolve
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="panel p-5 space-y-3">
            <h2 className="font-display font-semibold">New ticket</h2>
            <input className="input-field" placeholder="Subject" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} />
            <input className="input-field" placeholder="Customer email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            <textarea className="input-field" rows={3} placeholder="Message" value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} />
            <select className="input-field" value={form.app_id} onChange={(e) => setForm((p) => ({ ...p, app_id: e.target.value }))}>
              <option value="">App</option>
              {apps.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select className="input-field" value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <button
              type="button"
              className="btn-primary w-full justify-center"
              onClick={() => {
                if (!form.subject.trim()) return;
                ticketsStore.save(form);
                setForm({ subject: '', body: '', email: '', app_id: '', priority: 'medium', status: 'open', source: 'manual' });
                refresh();
                toastSuccess('Ticket created');
              }}
            >
              <SafeIcon icon={FiPlus} className="w-4 h-4" /> Create
            </button>
          </div>

          <div className="panel p-5 space-y-3">
            <h2 className="font-display font-semibold">Webhook ingest</h2>
            <p className="text-xs text-ink-500">Paste email/webhook JSON: subject, body, email, app_id</p>
            <textarea className="input-field font-mono text-xs" rows={5} value={webhookPaste} onChange={(e) => setWebhookPaste(e.target.value)} />
            <button type="button" className="btn-secondary w-full justify-center" onClick={ingestWebhook}>
              Ingest payload
            </button>
          </div>

          <div className="panel p-5 space-y-3">
            <h2 className="font-display font-semibold">Reply templates</h2>
            {templates.map((tpl) => (
              <div key={tpl.id} className="text-sm border-b border-ink-100 pb-2">
                <p className="font-medium">{tpl.name}</p>
                <p className="text-ink-500 text-xs line-clamp-2">{tpl.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Support;
