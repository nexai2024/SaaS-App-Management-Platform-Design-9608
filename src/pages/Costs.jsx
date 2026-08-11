import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { dataFetch } from '../api';
import { sales as salesApi, pricingPlans as plansApi } from '../services/dataLayer';
import { costsStore } from '../services/portfolioStore';
import { computePortfolioMetrics, formatMoney } from '../lib/portfolioMetrics';
import { toastSuccess } from '../components/common/Toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiPlus, FiTrash2, FiLoader } = FiIcons;

const Costs = () => {
  const [costs, setCosts] = useState([]);
  const [mrr, setMrr] = useState(0);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    category: 'Infra',
    amount: '',
    cadence: 'monthly',
    app_id: '',
    notes: '',
  });
  const [apps, setApps] = useState([]);
  const userId = localStorage.getItem('user_id');

  const refresh = () => setCosts(costsStore.list());

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        refresh();
        const appsRes = await dataFetch(`read/apps_1739884512?owner_id=${userId}`);
        const appRows = appsRes?.data ?? [];
        setApps(appRows);
        const salesByApp = {};
        const plansByApp = {};
        await Promise.all(
          appRows.map(async (app) => {
            try {
              salesByApp[app.id] = await salesApi.list(app.id);
              plansByApp[app.id] = await plansApi.list(app.id);
            } catch {
              salesByApp[app.id] = [];
              plansByApp[app.id] = [];
            }
          })
        );
        setMrr(computePortfolioMetrics(appRows, salesByApp, plansByApp).mrr);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const monthlyBurn = costsStore.monthlyTotal();
  const runwayMonths = monthlyBurn > 0 && mrr >= monthlyBurn ? Infinity : monthlyBurn > 0 ? mrr / monthlyBurn : null;
  const net = mrr - monthlyBurn;

  const handleAdd = () => {
    if (!form.name.trim() || form.amount === '') return;
    costsStore.save({
      ...form,
      amount: Number(form.amount),
      app_id: form.app_id || null,
    });
    setForm({ name: '', category: 'Infra', amount: '', cadence: 'monthly', app_id: '', notes: '' });
    refresh();
    toastSuccess('Cost added');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SafeIcon icon={FiLoader} className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page-shell">
      <div>
        <h1 className="page-title">Costs & Runway</h1>
        <p className="page-subtitle">Track infra/tools spend against portfolio MRR</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="panel p-4">
          <p className="text-xs text-gray-500">Portfolio MRR</p>
          <p className="page-title">{formatMoney(mrr)}</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs text-gray-500">Monthly burn</p>
          <p className="page-title">{formatMoney(monthlyBurn)}</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs text-gray-500">Net monthly</p>
          <p className={`text-2xl font-bold ${net >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatMoney(net)}</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs text-gray-500">Runway signal</p>
          <p className="page-title">
            {net >= 0 ? 'Profitable' : runwayMonths == null ? '—' : `${runwayMonths.toFixed(1)}×`}
          </p>
          <p className="text-[10px] text-gray-500 mt-1">MRR ÷ burn when burning</p>
        </div>
      </div>

      <div className="panel p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="Cost name (e.g. Vercel)"
          className="px-3 py-2 border border-gray-300 rounded-lg"
        />
        <input
          type="number"
          value={form.amount}
          onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
          placeholder="Amount"
          className="px-3 py-2 border border-gray-300 rounded-lg"
        />
        <select
          value={form.category}
          onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          {['Infra', 'Tools', 'Ads', 'Contractors', 'Other'].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          value={form.cadence}
          onChange={(e) => setForm((p) => ({ ...p, cadence: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
          <option value="one-time">One-time</option>
        </select>
        <select
          value={form.app_id}
          onChange={(e) => setForm((p) => ({ ...p, app_id: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg md:col-span-2"
        >
          <option value="">Portfolio-wide</option>
          {apps.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAdd}
          className="md:col-span-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          <SafeIcon icon={FiPlus} className="w-4 h-4" /> Add cost
        </button>
      </div>

      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Cadence</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {costs.map((c) => (
              <tr key={c.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                <td className="px-4 py-3 text-gray-600">{c.category}</td>
                <td className="px-4 py-3 text-gray-600">{c.cadence}</td>
                <td className="px-4 py-3 text-gray-900">${Number(c.amount).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      costsStore.remove(c.id);
                      refresh();
                    }}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {costs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No costs yet — add subscriptions and infra spend above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default Costs;
