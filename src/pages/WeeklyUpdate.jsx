import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { dataFetch } from '../api';
import { sales as salesApi, pricingPlans as plansApi, tasks as tasksApi, versions as versionsApi } from '../services/dataLayer';
import { ideasStore, draftWeeklyUpdate } from '../services/portfolioStore';
import {
  computePortfolioMetrics,
  buildRenewalAlerts,
} from '../lib/portfolioMetrics';
import { toastSuccess } from '../components/common/Toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiLoader, FiCopy, FiRefreshCw } = FiIcons;

const WeeklyUpdate = () => {
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const userId = localStorage.getItem('user_id');

  const generate = async () => {
    try {
      setLoading(true);
      const appsRes = await dataFetch(`read/apps_1739884512?owner_id=${userId}`);
      const apps = appsRes?.data ?? [];
      const salesByApp = {};
      const plansByApp = {};
      const allSales = [];
      const allTasks = [];
      const allVersions = [];
      const appsById = {};

      await Promise.all(
        apps.map(async (app) => {
          appsById[app.id] = app;
          try {
            const [sales, plans, tasks, versions] = await Promise.all([
              salesApi.list(app.id),
              plansApi.list(app.id),
              tasksApi.list(app.id),
              versionsApi.list(app.id),
            ]);
            salesByApp[app.id] = sales;
            plansByApp[app.id] = plans;
            allSales.push(...sales.map((s) => ({ ...s, app_id: s.app_id || app.id })));
            allTasks.push(...tasks);
            allVersions.push(...versions.map((v) => ({ ...v, app_name: app.name })));
          } catch {
            salesByApp[app.id] = [];
            plansByApp[app.id] = [];
          }
        })
      );

      const metrics = computePortfolioMetrics(apps, salesByApp, plansByApp);
      const alerts = buildRenewalAlerts(allSales, appsById);
      const text = draftWeeklyUpdate({
        apps,
        metrics,
        alerts,
        tasks: allTasks,
        versions: allVersions,
        ideas: ideasStore.list(),
      });
      setDraft(text);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generate();
  }, []);

  const copy = async () => {
    await navigator.clipboard.writeText(draft);
    toastSuccess('Update copied to clipboard');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page-shell">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Investor / Weekly Update</h1>
          <p className="page-subtitle">Auto-draft from sales, tasks, versions, ideas, and renewals</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={generate}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            <SafeIcon icon={FiRefreshCw} className="w-4 h-4" /> Regenerate
          </button>
          <button
            type="button"
            onClick={copy}
            disabled={!draft}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <SafeIcon icon={FiCopy} className="w-4 h-4" /> Copy
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <SafeIcon icon={FiLoader} className="w-8 h-8 text-brand-600 animate-spin" />
        </div>
      ) : (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={24}
          className="w-full font-mono text-sm px-4 py-3 border border-gray-300 rounded-lg bg-white"
        />
      )}
    </motion.div>
  );
};

export default WeeklyUpdate;
