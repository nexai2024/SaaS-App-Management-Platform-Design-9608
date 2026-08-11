import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { dataFetch } from '../api';
import { createApp } from '../services/appService';
import { sales as salesApi, pricingPlans as plansApi } from '../services/dataLayer';
import {
  computePortfolioMetrics,
  buildRenewalAlerts,
  formatMoney,
} from '../lib/portfolioMetrics';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

import StatsCard from '../components/dashboard/StatsCard';
import RevenueChart from '../components/dashboard/RevenueChart';
import AppsList from '../components/dashboard/AppsList';
import RecentActivity from '../components/dashboard/RecentActivity';
import TasksWidget from '../components/dashboard/TasksWidget';

const {
  FiDollarSign,
  FiUsers,
  FiTrendingUp,
  FiLayers,
  FiLoader,
  FiAlertTriangle,
  FiColumns,
  FiFileText,
  FiLightbulb,
  FiArrowRight,
} = FiIcons;

const Dashboard = () => {
  const [stats, setStats] = useState([
    { title: 'Portfolio MRR', value: '$0', change: '—', changeType: 'neutral', icon: FiDollarSign },
    { title: 'ARR run-rate', value: '$0', change: '—', changeType: 'neutral', icon: FiTrendingUp },
    { title: 'Active Users', value: '0', change: '—', changeType: 'neutral', icon: FiUsers },
    { title: 'Active Apps', value: '0', change: '—', changeType: 'neutral', icon: FiLayers },
  ]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const userId = localStorage.getItem('user_id');

  useEffect(() => {
    if (userId) fetchDashboardData();
    else setLoading(false);
  }, [userId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await dataFetch(`read/apps_1739884512?owner_id=${userId}`);
      if (res?.status === 'error') throw new Error(res.error);

      const apps = res?.data ?? [];
      const salesByApp = {};
      const plansByApp = {};
      const allSales = [];
      const appsById = {};

      await Promise.all(
        apps.map(async (app) => {
          appsById[app.id] = app;
          try {
            const [sales, plans] = await Promise.all([salesApi.list(app.id), plansApi.list(app.id)]);
            salesByApp[app.id] = sales;
            plansByApp[app.id] = plans;
            allSales.push(...sales.map((s) => ({ ...s, app_id: s.app_id || app.id })));
          } catch {
            salesByApp[app.id] = [];
            plansByApp[app.id] = [];
          }
        })
      );

      const metrics = computePortfolioMetrics(apps, salesByApp, plansByApp);
      const renewalAlerts = buildRenewalAlerts(allSales, appsById).slice(0, 5);
      setAlerts(renewalAlerts);

      const totalUsers = apps.reduce((acc, app) => acc + (app.users_count || 0), 0);
      const activeAppsCount = apps.filter((app) => app.status === 'Active').length;

      setStats([
        {
          title: 'Portfolio MRR',
          value: formatMoney(metrics.mrr),
          change: `${metrics.perApp.filter((p) => p.mrr > 0).length} apps`,
          changeType: metrics.mrr > 0 ? 'positive' : 'neutral',
          icon: FiDollarSign,
        },
        {
          title: 'ARR run-rate',
          value: formatMoney(metrics.arr),
          change: renewalAlerts.length ? `${renewalAlerts.length} alerts` : 'On track',
          changeType: renewalAlerts.length ? 'negative' : 'positive',
          icon: FiTrendingUp,
        },
        {
          title: 'Active Users',
          value: totalUsers.toLocaleString(),
          change: `${apps.length} apps`,
          changeType: 'positive',
          icon: FiUsers,
        },
        {
          title: 'Active Apps',
          value: activeAppsCount.toString(),
          change: `${apps.length} total`,
          changeType: 'positive',
          icon: FiLayers,
        },
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewApp = async () => {
    if (!userId) return;
    try {
      const { data, error } = await createApp({
        name: `New App ${new Date().getTime()}`,
        description: 'A new SaaS application',
        status: 'Development',
        tech_stack: JSON.stringify(['React', 'Node.js']),
        users_count: 0,
        revenue: 0,
        growth_rate: 0,
        specifications: JSON.stringify({}),
      });
      if (error) {
        alert('Failed to create app: ' + error);
        return;
      }
      if (data?.id) navigate(`/apps/${data.id}`);
    } catch (error) {
      console.error('Error creating app:', error);
    }
  };

  if (loading) {
    return (
      <div className="page-shell flex items-center justify-center min-h-[50vh]">
        <div className="panel px-5 py-4 flex items-center gap-3">
          <SafeIcon icon={FiLoader} className="w-5 h-5 text-brand-600 animate-spin" />
          <span className="text-sm text-ink-600">Loading dashboard…</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="page-shell">
      <div className="page-header">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700 mb-2">
            Portfolio OS
          </p>
          <h1 className="page-title">Founder dashboard</h1>
          <p className="page-subtitle">
            MRR, renewals, tasks, and shipping — a command center, not a CRM log.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/updates" className="btn-secondary">
            <SafeIcon icon={FiFileText} className="w-4 h-4" /> Weekly update
          </Link>
          <Link to="/board" className="btn-secondary">
            <SafeIcon icon={FiColumns} className="w-4 h-4" /> Task board
          </Link>
          <button onClick={handleAddNewApp} className="btn-primary">
            Add New App
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: '/portfolio', label: 'Revenue', icon: FiDollarSign },
          { to: '/ideas', label: 'Ideas', icon: FiLightbulb },
          { to: '/roadmap', label: 'Roadmap', icon: FiTrendingUp },
          { to: '/costs', label: 'Runway', icon: FiLayers },
        ].map((item) => (
          <Link key={item.to} to={item.to} className="chip-link">
            <span className="text-sm font-medium text-ink-800 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
                <SafeIcon icon={item.icon} className="w-4 h-4" />
              </span>
              {item.label}
            </span>
            <SafeIcon icon={FiArrowRight} className="w-3.5 h-3.5 text-ink-300" />
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {alerts.length > 0 && (
        <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/60 p-4 sm:p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <SafeIcon icon={FiAlertTriangle} className="w-4 h-4 text-amber-700" />
            <h2 className="font-display font-semibold text-amber-950 text-sm">
              Renewals & churn risk
            </h2>
            <Link to="/portfolio" className="ml-auto text-sm text-amber-800 hover:underline font-medium">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {alerts.map((alert) => (
              <Link
                key={alert.id}
                to={alert.appId ? `/apps/${alert.appId}` : '/portfolio'}
                className="bg-white/80 border border-amber-100 rounded-xl px-3.5 py-2.5 hover:bg-white transition-colors"
              >
                <p className="text-sm font-medium text-ink-900">{alert.title}</p>
                <p className="text-xs text-ink-500 mt-0.5">{alert.detail}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <div>
          <TasksWidget />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AppsList />
        <RecentActivity />
      </div>
    </motion.div>
  );
};

export default Dashboard;
