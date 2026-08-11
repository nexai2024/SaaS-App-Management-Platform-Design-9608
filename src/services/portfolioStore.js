/**
 * Local portfolio stores (ideas, costs, competitors, invites).
 * Persists in localStorage so features work even when NCB tables are incomplete.
 */

import { generateShareToken } from '../lib/dataUtils';
import { formatMoney } from '../lib/portfolioMetrics';

function storageKey(base) {
  const userId = localStorage.getItem('user_id') || 'anon';
  return `${base}:${userId}`;
}

function readList(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeList(key, rows) {
  localStorage.setItem(key, JSON.stringify(rows));
  return rows;
}

function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function makeStore(baseKey) {
  return {
    list() {
      return readList(storageKey(baseKey));
    },
    save(item) {
      const key = storageKey(baseKey);
      const rows = readList(key);
      const now = new Date().toISOString();
      if (item.id) {
        const next = rows.map((row) =>
          String(row.id) === String(item.id) ? { ...row, ...item, updated_at: now } : row
        );
        return writeList(key, next).find((r) => String(r.id) === String(item.id));
      }
      const row = {
        id: uid(),
        created_at: now,
        updated_at: now,
        ...item,
      };
      writeList(key, [row, ...rows]);
      return row;
    },
    remove(id) {
      const key = storageKey(baseKey);
      writeList(
        key,
        readList(key).filter((row) => String(row.id) !== String(id))
      );
    },
  };
}

export const ideasStore = {
  ...makeStore('portfolio_ideas_v1'),
  markPromoted(ideaId, appId) {
    const key = storageKey('portfolio_ideas_v1');
    const rows = readList(key).map((row) =>
      String(row.id) === String(ideaId)
        ? {
            ...row,
            status: 'promoted',
            promoted_app_id: appId,
            updated_at: new Date().toISOString(),
          }
        : row
    );
    writeList(key, rows);
  },
};

export const costsStore = {
  ...makeStore('portfolio_costs_v1'),
  monthlyTotal() {
    return this.list().reduce((sum, cost) => {
      const amount = Number(cost.amount) || 0;
      const cadence = String(cost.cadence || 'monthly').toLowerCase();
      if (cadence === 'yearly' || cadence === 'annual') return sum + amount / 12;
      if (cadence === 'quarterly') return sum + amount / 3;
      if (cadence === 'weekly') return sum + (amount * 52) / 12;
      return sum + amount;
    }, 0);
  },
};

export const competitorsStore = {
  list(appId) {
    return makeStore('portfolio_competitors_v1')
      .list()
      .filter((row) => !appId || String(row.app_id) === String(appId));
  },
  save(item) {
    return makeStore('portfolio_competitors_v1').save(item);
  },
  remove(id) {
    return makeStore('portfolio_competitors_v1').remove(id);
  },
};

export const invitesStore = {
  list() {
    return makeStore('portfolio_invites_v1').list();
  },
  save(item) {
    const token = item.token || generateShareToken();
    return makeStore('portfolio_invites_v1').save({
      status: 'Invited',
      role: item.role || 'Member',
      email: String(item.email || '').trim().toLowerCase(),
      token,
      invited_at: new Date().toISOString(),
      ...item,
    });
  },
  remove(id) {
    return makeStore('portfolio_invites_v1').remove(id);
  },
  markAccepted(id) {
    const key = storageKey('portfolio_invites_v1');
    writeList(
      key,
      readList(key).map((row) =>
        String(row.id) === String(id)
          ? { ...row, status: 'Active', accepted_at: new Date().toISOString() }
          : row
      )
    );
  },
};

export const githubRepoStore = {
  get(appId) {
    try {
      const map = JSON.parse(localStorage.getItem(storageKey('portfolio_github_repos_v1')) || '{}');
      return map[String(appId)] || '';
    } catch {
      return '';
    }
  },
  set(appId, repo) {
    const key = storageKey('portfolio_github_repos_v1');
    let map = {};
    try {
      map = JSON.parse(localStorage.getItem(key) || '{}');
    } catch {
      map = {};
    }
    map[String(appId)] = String(repo || '').trim();
    localStorage.setItem(key, JSON.stringify(map));
  },
};

/** Draft a founder/investor weekly update from portfolio signals. */
export function draftWeeklyUpdate({
  apps = [],
  metrics = { mrr: 0, arr: 0, perApp: [] },
  alerts = [],
  tasks = [],
  versions = [],
  ideas = [],
} = {}) {
  const weekOf = new Date().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const openTasks = tasks.filter((t) => t.status !== 'completed');
  const overdue = openTasks.filter((t) => {
    if (!t.due_date) return false;
    return new Date(t.due_date).getTime() < Date.now();
  });
  const shipped = versions.slice(0, 5);
  const topIdeas = ideas
    .filter((i) => i.status !== 'promoted')
    .sort((a, b) => Number(b.score) - Number(a.score))
    .slice(0, 3);
  const renewals = alerts.filter((a) => a.type === 'renewal' || a.type === 'at_risk').slice(0, 5);

  const lines = [
    `# Weekly update — week of ${weekOf}`,
    '',
    '## Snapshot',
    `- Portfolio MRR: ${formatMoney(metrics.mrr)}`,
    `- ARR run-rate: ${formatMoney(metrics.arr)}`,
    `- Active apps: ${metrics.activeApps ?? apps.filter((a) => a.status === 'Active').length} / ${apps.length}`,
    `- Open tasks: ${openTasks.length} (${overdue.length} overdue)`,
    '',
    '## Revenue by app',
    ...(metrics.perApp?.length
      ? metrics.perApp.slice(0, 8).map((row) => `- ${row.name}: ${formatMoney(row.mrr)} MRR`)
      : ['- No revenue recorded yet']),
    '',
    '## Shipping',
    ...(shipped.length
      ? shipped.map(
          (v) =>
            `- ${v.app_name || 'App'} ${v.version_number || 'release'}: ${(v.release_notes || v.changelog || 'Shipped').slice(0, 120)}`
        )
      : ['- No new versions this period']),
    '',
    '## Pipeline & risk',
    ...(renewals.length
      ? renewals.map((a) => `- ${a.title} — ${a.detail}`)
      : ['- No renewal/churn alerts in the next 45 days']),
    '',
    '## Focus / asks',
    ...(topIdeas.length
      ? topIdeas.map((i) => `- Idea (${i.score}/10): ${i.title}`)
      : ['- Capture next bets in Ideas']),
    '- [ ] Top priority for next week:',
    '- [ ] Help needed / investor ask:',
    '',
  ];

  return lines.join('\n');
}
