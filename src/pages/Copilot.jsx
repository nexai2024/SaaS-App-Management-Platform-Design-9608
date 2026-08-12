import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { dataFetch } from '../api';
import { sales as salesApi, tasks as tasksApi, pricingPlans as plansApi } from '../services/dataLayer';
import { ideasStore, costsStore } from '../services/portfolioStore';
import { ticketsStore } from '../services/studioFeatures';
import { appMonitoring } from '../services/appMonitoring';
import { computePortfolioMetrics } from '../lib/portfolioMetrics';
import { scoreAppHealth } from '../lib/healthScores';
import { askCopilot } from '../lib/copilot';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiSend, FiLoader, FiMessageCircle } = FiIcons;

const SUGGESTIONS = [
  'Which app should I push this week?',
  'What is my runway?',
  'Which products are at risk?',
  'What are my overdue tasks?',
  'Summarize portfolio MRR',
];

const Copilot = () => {
  const [loading, setLoading] = useState(true);
  const [ctx, setCtx] = useState(null);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const userId = localStorage.getItem('user_id');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await dataFetch(`read/apps_1739884512?owner_id=${userId}`).catch(() => null);
        const apps = res?.data ?? [];
        const salesByApp = {};
        const plansByApp = {};
        const allTasks = [];
        await Promise.all(
          apps.map(async (app) => {
            try {
              salesByApp[app.id] = await salesApi.list(app.id);
              plansByApp[app.id] = await plansApi.list(app.id);
              const tasks = await tasksApi.list(app.id);
              tasks.forEach((t) => allTasks.push({ ...t, app_id: app.id }));
            } catch {
              salesByApp[app.id] = [];
              plansByApp[app.id] = [];
            }
          })
        );
        const metrics = computePortfolioMetrics(apps, salesByApp, plansByApp);
        const tickets = ticketsStore.list();
        const health = apps.map((app) =>
          scoreAppHealth({
            app,
            sales: salesByApp[app.id] || [],
            tickets: tickets.filter((t) => String(t.app_id) === String(app.id)),
            monitor: appMonitoring.get(app.id),
            openTasks: allTasks.filter((t) => String(t.app_id) === String(app.id) && t.status !== 'completed').length,
          })
        );
        setCtx({
          apps,
          metrics,
          health,
          ideas: ideasStore.list(),
          costsMonthly: costsStore.monthlyTotal(),
          tasks: allTasks,
          tickets,
        });
        const intro = askCopilot('brief', {
          apps,
          metrics,
          health,
          ideas: ideasStore.list(),
          costsMonthly: costsStore.monthlyTotal(),
          tasks: allTasks,
          tickets,
        });
        setMessages([{ role: 'assistant', ...intro }]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const ask = (q) => {
    const text = (q || question).trim();
    if (!text || !ctx) return;
    const result = askCopilot(text, ctx);
    setMessages((prev) => [...prev, { role: 'user', answer: text }, { role: 'assistant', ...result }]);
    setQuestion('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SafeIcon icon={FiLoader} className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page-shell max-w-3xl">
      <div>
        <h1 className="page-title">Founder co-pilot</h1>
        <p className="page-subtitle">Ask portfolio questions — answers cite Revenue, Costs, Ideas, Tasks & Health</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" className="btn-secondary text-xs" onClick={() => ask(s)}>
            {s}
          </button>
        ))}
      </div>

      <div className="panel p-5 space-y-4 min-h-[320px]">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            {m.role === 'user' ? (
              <span className="inline-block rounded-2xl bg-brand-600 text-white px-4 py-2 text-sm">{m.answer}</span>
            ) : (
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-xl bg-ink-100 flex items-center justify-center shrink-0">
                    <SafeIcon icon={FiMessageCircle} className="w-4 h-4 text-ink-500" />
                  </div>
                  <p
                    className="text-sm text-ink-800 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: String(m.answer || '')
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\n/g, '<br/>'),
                    }}
                  />
                </div>
                {m.citations?.length > 0 && (
                  <div className="ml-10 flex flex-wrap gap-2">
                    {m.citations.map((c, j) => (
                      <span key={j} className="text-[11px] px-2 py-1 rounded-lg bg-ink-50 text-ink-600 border border-ink-100">
                        <span className="font-semibold text-ink-800">{c.label}:</span> {c.detail}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
      >
        <input
          className="input-field flex-1"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask anything about your portfolio…"
        />
        <button type="submit" className="btn-primary">
          <SafeIcon icon={FiSend} className="w-4 h-4" />
        </button>
      </form>
    </motion.div>
  );
};

export default Copilot;
