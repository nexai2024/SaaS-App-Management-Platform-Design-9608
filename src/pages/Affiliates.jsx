import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { dataFetch } from '../api';
import { affiliatesStore, affiliatePayoutsStore, affiliateStats } from '../services/studioFeatures';
import { toastSuccess } from '../components/common/Toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiPlus, FiTrash2, FiDollarSign } = FiIcons;

const Affiliates = () => {
  const [apps, setApps] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    code: '',
    app_id: '',
    commission_pct: 20,
    conversions: 0,
  });
  const [payoutForm, setPayoutForm] = useState({ affiliate_id: '', amount: '', note: '' });
  const userId = localStorage.getItem('user_id');

  const refresh = () => setRows(affiliatesStore.list());

  useEffect(() => {
    (async () => {
      const res = await dataFetch(`read/apps_1739884512?owner_id=${userId}`).catch(() => null);
      setApps(res?.data ?? []);
      refresh();
    })();
  }, []);

  const payouts = affiliatePayoutsStore.list();

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page-shell">
      <div>
        <h1 className="page-title">Affiliates & partners</h1>
        <p className="page-subtitle">Codes, commissions, and payouts per product</p>
      </div>

      <div className="panel p-5 space-y-3">
        <h2 className="font-display font-semibold">Add partner</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <input className="input-field" placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <input className="input-field" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          <input className="input-field" placeholder="Code" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} />
          <select className="input-field" value={form.app_id} onChange={(e) => setForm((p) => ({ ...p, app_id: e.target.value }))}>
            <option value="">Product</option>
            {apps.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input
            type="number"
            className="input-field"
            placeholder="Commission %"
            value={form.commission_pct}
            onChange={(e) => setForm((p) => ({ ...p, commission_pct: Number(e.target.value) }))}
          />
          <input
            type="number"
            className="input-field"
            placeholder="Conversions"
            value={form.conversions}
            onChange={(e) => setForm((p) => ({ ...p, conversions: Number(e.target.value) }))}
          />
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            if (!form.name.trim() || !form.code.trim()) return;
            affiliatesStore.save(form);
            setForm({ name: '', email: '', code: '', app_id: '', commission_pct: 20, conversions: 0 });
            refresh();
            toastSuccess('Affiliate added');
          }}
        >
          <SafeIcon icon={FiPlus} className="w-4 h-4" /> Add
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          {rows.map((a) => {
            const stats = affiliateStats(a.id);
            const appName = apps.find((x) => String(x.id) === String(a.app_id))?.name || '—';
            return (
              <div key={a.id} className="panel p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink-950">{a.name}</p>
                    <p className="text-xs text-ink-400">
                      {a.code} · {a.commission_pct}% · {appName}
                    </p>
                    <p className="text-sm text-ink-600 mt-2">
                      {a.conversions || 0} conversions · earned ${stats?.earned?.toFixed?.(2) || '0.00'} · owed $
                      {stats?.owed?.toFixed?.(2) || '0.00'}
                    </p>
                  </div>
                  <button type="button" className="p-2 text-ink-400 hover:text-rose-600" onClick={() => { affiliatesStore.remove(a.id); refresh(); }}>
                    <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {!rows.length && <p className="text-sm text-ink-500">No affiliates yet.</p>}
        </div>

        <div className="panel p-5 space-y-3">
          <h2 className="font-display font-semibold flex items-center gap-2">
            <SafeIcon icon={FiDollarSign} className="w-4 h-4" /> Record payout / commission
          </h2>
          <select className="input-field" value={payoutForm.affiliate_id} onChange={(e) => setPayoutForm((p) => ({ ...p, affiliate_id: e.target.value }))}>
            <option value="">Affiliate</option>
            {rows.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
          </select>
          <input type="number" className="input-field" placeholder="Amount" value={payoutForm.amount} onChange={(e) => setPayoutForm((p) => ({ ...p, amount: e.target.value }))} />
          <input className="input-field" placeholder="Note" value={payoutForm.note} onChange={(e) => setPayoutForm((p) => ({ ...p, note: e.target.value }))} />
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-primary flex-1 justify-center"
              onClick={() => {
                if (!payoutForm.affiliate_id || !payoutForm.amount) return;
                affiliatePayoutsStore.save({
                  ...payoutForm,
                  amount: Number(payoutForm.amount),
                  status: 'earned',
                });
                setPayoutForm({ affiliate_id: '', amount: '', note: '' });
                refresh();
                toastSuccess('Commission recorded');
              }}
            >
              Log earned
            </button>
            <button
              type="button"
              className="btn-secondary flex-1 justify-center"
              onClick={() => {
                if (!payoutForm.affiliate_id || !payoutForm.amount) return;
                affiliatePayoutsStore.save({
                  ...payoutForm,
                  amount: Number(payoutForm.amount),
                  status: 'paid',
                  paid_at: new Date().toISOString(),
                });
                setPayoutForm({ affiliate_id: '', amount: '', note: '' });
                refresh();
                toastSuccess('Payout marked paid');
              }}
            >
              Mark paid
            </button>
          </div>
          <div className="space-y-2 pt-2 border-t border-ink-100">
            {payouts.slice(0, 12).map((p) => {
              const a = rows.find((r) => String(r.id) === String(p.affiliate_id));
              return (
                <div key={p.id} className="flex text-sm justify-between">
                  <span className="text-ink-600">{a?.name || '—'} · {p.status}</span>
                  <span className="font-medium">${Number(p.amount).toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Affiliates;
