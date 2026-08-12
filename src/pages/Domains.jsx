import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { dataFetch } from '../api';
import { domainsStore } from '../services/studioFeatures';
import { toastSuccess } from '../components/common/Toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiPlus, FiTrash2, FiGlobe } = FiIcons;

const Domains = () => {
  const [apps, setApps] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({
    domain: '',
    app_id: '',
    registrar: '',
    owner: '',
    renews_at: '',
    ssl_expires_at: '',
    dns_notes: '',
    auto_renew: true,
  });
  const userId = localStorage.getItem('user_id');

  const refresh = () => setRows(domainsStore.list());

  useEffect(() => {
    (async () => {
      const res = await dataFetch(`read/apps_1739884512?owner_id=${userId}`).catch(() => null);
      setApps(res?.data ?? []);
      refresh();
    })();
  }, []);

  const soon = rows.filter((d) => {
    const dates = [d.renews_at, d.ssl_expires_at].filter(Boolean).map((x) => new Date(x).getTime());
    return dates.some((t) => t < Date.now() + 30 * 86400000);
  });

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page-shell">
      <div>
        <h1 className="page-title">Domain & SSL vault</h1>
        <p className="page-subtitle">Domains, renewals, DNS notes, and ownership across the portfolio</p>
      </div>

      {soon.length > 0 && (
        <div className="panel p-4 bg-amber-50 border border-amber-200 text-sm text-amber-900">
          {soon.length} domain/SSL renewal{soon.length === 1 ? '' : 's'} within 30 days
        </div>
      )}

      <div className="panel p-5 space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <input className="input-field" placeholder="domain.com" value={form.domain} onChange={(e) => setForm((p) => ({ ...p, domain: e.target.value }))} />
          <select className="input-field" value={form.app_id} onChange={(e) => setForm((p) => ({ ...p, app_id: e.target.value }))}>
            <option value="">App</option>
            {apps.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input className="input-field" placeholder="Registrar" value={form.registrar} onChange={(e) => setForm((p) => ({ ...p, registrar: e.target.value }))} />
          <input className="input-field" placeholder="Owner / account" value={form.owner} onChange={(e) => setForm((p) => ({ ...p, owner: e.target.value }))} />
          <div>
            <label className="label">Domain renews</label>
            <input type="date" className="input-field" value={form.renews_at} onChange={(e) => setForm((p) => ({ ...p, renews_at: e.target.value }))} />
          </div>
          <div>
            <label className="label">SSL expires</label>
            <input type="date" className="input-field" value={form.ssl_expires_at} onChange={(e) => setForm((p) => ({ ...p, ssl_expires_at: e.target.value }))} />
          </div>
          <textarea className="input-field md:col-span-2" rows={2} placeholder="DNS notes…" value={form.dns_notes} onChange={(e) => setForm((p) => ({ ...p, dns_notes: e.target.value }))} />
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            if (!form.domain.trim()) return;
            domainsStore.save(form);
            setForm({ domain: '', app_id: '', registrar: '', owner: '', renews_at: '', ssl_expires_at: '', dns_notes: '', auto_renew: true });
            refresh();
            toastSuccess('Domain saved');
          }}
        >
          <SafeIcon icon={FiPlus} className="w-4 h-4" /> Add domain
        </button>
      </div>

      <div className="space-y-3">
        {rows.map((d) => {
          const appName = apps.find((a) => String(a.id) === String(d.app_id))?.name;
          return (
            <div key={d.id} className="panel p-4 flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-ink-50 flex items-center justify-center shrink-0">
                <SafeIcon icon={FiGlobe} className="w-5 h-5 text-ink-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink-950">{d.domain}</p>
                <p className="text-xs text-ink-400">
                  {appName || '—'} · {d.registrar || 'registrar?'} · owner {d.owner || '—'}
                </p>
                <p className="text-xs text-ink-500 mt-1">
                  Renews {d.renews_at || '—'} · SSL {d.ssl_expires_at || '—'}
                </p>
                {d.dns_notes && <p className="text-sm text-ink-600 mt-2 whitespace-pre-wrap">{d.dns_notes}</p>}
              </div>
              <button type="button" className="p-2 text-ink-400 hover:text-rose-600" onClick={() => { domainsStore.remove(d.id); refresh(); }}>
                <SafeIcon icon={FiTrash2} className="w-4 h-4" />
              </button>
            </div>
          );
        })}
        {!rows.length && <p className="text-sm text-ink-500">Vault is empty.</p>}
      </div>
    </motion.div>
  );
};

export default Domains;
