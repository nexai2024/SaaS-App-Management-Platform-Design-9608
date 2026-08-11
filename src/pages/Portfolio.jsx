import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { dataFetch } from '../api';
import { sales as salesApi, pricingPlans as plansApi } from '../services/dataLayer';
import {
  computePortfolioMetrics,
  buildRenewalAlerts,
  formatMoney,
} from '../lib/portfolioMetrics';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiDollarSign, FiTrendingUp, FiAlertTriangle, FiCalendar, FiLoader, FiArrowRight } = FiIcons;

const Portfolio = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ mrr: 0, arr: 0, perApp: [], activeApps: 0 });
  const [alerts, setAlerts] = useState([]);
  const userId = localStorage.getItem('user_id');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const appsRes = await dataFetch(`read/apps_1739884512?owner_id=${userId}`);
      const apps = appsRes?.data ?? [];
      const salesByApp = {};
      const plansByApp = {};
      const allSales = [];
      const appsById = {};

      await Promise.all(
        apps.map(async (app) => {
          appsById[app.id] = app;
          try {
            const [sales, plans] = await Promise.all([
              salesApi.list(app.id),
              plansApi.list(app.id),
            ]);
            salesByApp[app.id] = sales;
            plansByApp[app.id] = plans;
            allSales.push(...sales.map((s) => ({ ...s, app_id: s.app_id || app.id })));
          } catch {
            salesByApp[app.id] = [];
            plansByApp[app.id] = [];
          }
        })
      );

      setMetrics(computePortfolioMetrics(apps, salesByApp, plansByApp));
      setAlerts(buildRenewalAlerts(allSales, appsById));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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
        <h1 className="page-title">Portfolio Revenue</h1>
        <p className="page-subtitle">MRR / ARR rollup across apps, plus renewal and churn signals</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="panel p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <SafeIcon icon={FiDollarSign} className="w-4 h-4" /> Monthly Recurring
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatMoney(metrics.mrr)}</p>
          <p className="text-xs text-gray-500 mt-1">From completed sales + plan estimates</p>
        </div>
        <div className="panel p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <SafeIcon icon={FiTrendingUp} className="w-4 h-4" /> Annual Run Rate
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatMoney(metrics.arr)}</p>
          <p className="text-xs text-gray-500 mt-1">MRR × 12</p>
        </div>
        <div className="panel p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <SafeIcon icon={FiCalendar} className="w-4 h-4" /> Alerts
          </div>
          <p className="text-3xl font-bold text-gray-900">{alerts.length}</p>
          <p className="text-xs text-gray-500 mt-1">Renewals & at-risk in next 45 days</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">MRR by app</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {metrics.perApp.length === 0 && (
              <p className="p-6 text-sm text-gray-500">No apps yet. Create an app and record sales to see MRR.</p>
            )}
            {metrics.perApp.map((row) => (
              <Link
                key={row.appId}
                to={`/apps/${row.appId}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">{row.name}</p>
                  <p className="text-xs text-gray-500">{row.salesCount} sales · {row.users} users</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatMoney(row.mrr)} <span className="text-xs font-normal text-gray-500">MRR</span></p>
                  <p className="text-xs text-gray-500">{formatMoney(row.arr)} ARR</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
            <SafeIcon icon={FiAlertTriangle} className="w-4 h-4 text-amber-600" />
            <h2 className="font-semibold text-gray-900">Renewals & churn risk</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {alerts.length === 0 && (
              <p className="p-6 text-sm text-gray-500">No upcoming renewals. Record sales with dates to enable reminders.</p>
            )}
            {alerts.map((alert) => (
              <div key={alert.id} className="px-5 py-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{alert.title}</p>
                  <p className="text-xs text-gray-500">{alert.detail}</p>
                </div>
                {alert.appId && (
                  <Link to={`/apps/${alert.appId}`} className="text-brand-700 text-sm flex items-center gap-1 shrink-0">
                    Open <SafeIcon icon={FiArrowRight} className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Portfolio;
