import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { dataFetch } from '../api';
import { legalStore, legalReminders } from '../services/studioFeatures';
import { toastSuccess } from '../components/common/Toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiPlus, FiTrash2, FiFileText } = FiIcons;

const DOC_TYPES = ['Privacy', 'Terms of Service', 'DPA', 'Cookie banner', 'Cookie policy', 'Other'];

const LegalVault = () => {
  const [apps, setApps] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({
    title: '',
    doc_type: 'Privacy',
    app_id: '',
    version: '1.0',
    url: '',
    renewal_at: '',
    notes: '',
  });
  const userId = localStorage.getItem('user_id');

  const refresh = () => setRows(legalStore.list());

  useEffect(() => {
    (async () => {
      const res = await dataFetch(`read/apps_1739884512?owner_id=${userId}`).catch(() => null);
      setApps(res?.data ?? []);
      refresh();
    })();
  }, []);

  const reminders = legalReminders(45);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page-shell">
      <div>
        <h1 className="page-title">Legal & compliance</h1>
        <p className="page-subtitle">Privacy, ToS, DPA versions, cookie banners, renewal reminders</p>
      </div>

      {reminders.length > 0 && (
        <div className="panel p-4 bg-amber-50 border border-amber-200 text-sm text-amber-900 space-y-1">
          <p className="font-semibold">Renewals due (45 days)</p>
          {reminders.map((r) => (
            <p key={r.id}>
              {r.title} · {r.renewal_at}
            </p>
          ))}
        </div>
      )}

      <div className="panel p-5 space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <input className="input-field" placeholder="Document title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          <select className="input-field" value={form.doc_type} onChange={(e) => setForm((p) => ({ ...p, doc_type: e.target.value }))}>
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="input-field" value={form.app_id} onChange={(e) => setForm((p) => ({ ...p, app_id: e.target.value }))}>
            <option value="">App / portfolio</option>
            {apps.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input className="input-field" placeholder="Version" value={form.version} onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))} />
          <input className="input-field" placeholder="URL / Notion link" value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} />
          <div>
            <label className="label">Renewal / review date</label>
            <input type="date" className="input-field" value={form.renewal_at} onChange={(e) => setForm((p) => ({ ...p, renewal_at: e.target.value }))} />
          </div>
          <textarea className="input-field md:col-span-2" rows={2} placeholder="Notes…" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            if (!form.title.trim()) return;
            legalStore.save(form);
            setForm({ title: '', doc_type: 'Privacy', app_id: '', version: '1.0', url: '', renewal_at: '', notes: '' });
            refresh();
            toastSuccess('Document saved');
          }}
        >
          <SafeIcon icon={FiPlus} className="w-4 h-4" /> Add document
        </button>
      </div>

      <div className="space-y-3">
        {rows.map((d) => {
          const appName = apps.find((a) => String(a.id) === String(d.app_id))?.name;
          return (
            <div key={d.id} className="panel p-4 flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-ink-50 flex items-center justify-center shrink-0">
                <SafeIcon icon={FiFileText} className="w-5 h-5 text-ink-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink-950">{d.title}</p>
                <p className="text-xs text-ink-400">
                  {d.doc_type} · v{d.version} · {appName || 'Portfolio'} · review {d.renewal_at || '—'}
                </p>
                {d.url && (
                  <a href={d.url} target="_blank" rel="noreferrer" className="text-sm text-brand-700 hover:underline mt-1 inline-block">
                    Open link
                  </a>
                )}
                {d.notes && <p className="text-sm text-ink-600 mt-1">{d.notes}</p>}
              </div>
              <button type="button" className="p-2 text-ink-400 hover:text-rose-600" onClick={() => { legalStore.remove(d.id); refresh(); }}>
                <SafeIcon icon={FiTrash2} className="w-4 h-4" />
              </button>
            </div>
          );
        })}
        {!rows.length && <p className="text-sm text-ink-500">No legal docs yet.</p>}
      </div>
    </motion.div>
  );
};

export default LegalVault;
