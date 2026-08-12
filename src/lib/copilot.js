/**
 * Founder co-pilot: rule-based answers over portfolio signals with citations.
 */

import { formatMoney } from './portfolioMetrics';
import { ideasStore, costsStore } from '../services/portfolioStore';

function cite(label, detail) {
  return { label, detail };
}

/**
 * @param {string} question
 * @param {object} ctx
 */
export function askCopilot(question, ctx = {}) {
  const q = String(question || '').toLowerCase().trim();
  const {
    apps = [],
    metrics = { mrr: 0, arr: 0, perApp: [] },
    health = [],
    ideas = ideasStore.list(),
    costsMonthly = costsStore.monthlyTotal(),
    tasks = [],
    tickets = [],
  } = ctx;

  const citations = [];
  const openTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'done');
  const overdue = openTasks.filter((t) => t.due_date && new Date(t.due_date).getTime() < Date.now());
  const openTickets = tickets.filter((t) => !['resolved', 'closed'].includes(String(t.status || '').toLowerCase()));

  const perApp = metrics.perApp || [];
  const topMrr = [...perApp].sort((a, b) => (b.mrr || 0) - (a.mrr || 0))[0];
  const weakest = [...health].sort((a, b) => a.score - b.score)[0];
  const strongest = [...health].sort((a, b) => b.score - a.score)[0];
  const topIdea = [...ideas]
    .filter((i) => i.status !== 'promoted')
    .sort((a, b) => Number(b.score) - Number(a.score))[0];

  const runway =
    costsMonthly > 0 && metrics.mrr < costsMonthly
      ? (metrics.mrr / costsMonthly).toFixed(1)
      : costsMonthly > 0 && metrics.mrr >= costsMonthly
        ? '∞ (cash-flow positive)'
        : 'n/a';

  // Intent routing
  if (/push|focus|double.?down|which app|priorit/.test(q)) {
    citations.push(
      cite('Portfolio MRR', formatMoney(metrics.mrr)),
      cite('Top revenue app', topMrr ? `${topMrr.name || topMrr.appName}: ${formatMoney(topMrr.mrr)}` : 'none'),
      cite('Weakest health', weakest ? `${weakest.name}: ${weakest.score}/100 (${weakest.band})` : 'n/a'),
      cite('Top idea', topIdea ? `${topIdea.title} (score ${topIdea.score})` : 'none')
    );

    let recommendation;
    if (weakest && weakest.band === 'critical') {
      recommendation = `Stabilize **${weakest.name}** first — health is critical (${weakest.score}/100). ${
        weakest.reasons?.[0] || ''
      } Then push **${topMrr?.name || topMrr?.appName || 'your top MRR app'}** for growth.`;
    } else if (topMrr && (topMrr.mrr || 0) > 0) {
      recommendation = `Push **${topMrr.name || topMrr.appName}** this week — it leads portfolio MRR at ${formatMoney(
        topMrr.mrr
      )}. Pair with idea “${topIdea?.title || 'your highest-scored idea'}” if it maps to that product.`;
    } else if (topIdea) {
      recommendation = `No clear MRR leader yet — promote idea **${topIdea.title}** (score ${topIdea.score}/10) into an MVP sprint.`;
    } else {
      recommendation = 'Capture a scored idea and log at least one sale so I can rank focus.';
    }

    return { answer: recommendation, citations, intent: 'focus' };
  }

  if (/runway|burn|cost|cash/.test(q)) {
    citations.push(
      cite('MRR', formatMoney(metrics.mrr)),
      cite('Monthly burn', formatMoney(costsMonthly)),
      cite('Net', formatMoney((metrics.mrr || 0) - costsMonthly)),
      cite('Runway (mo)', String(runway))
    );
    return {
      answer: `Monthly burn is ${formatMoney(costsMonthly)} against ${formatMoney(metrics.mrr)} MRR (net ${formatMoney(
        (metrics.mrr || 0) - costsMonthly
      )}). Estimated runway: **${runway}** months.`,
      citations,
      intent: 'runway',
    };
  }

  if (/risk|health|churn|at.?risk/.test(q)) {
    const atRisk = health.filter((h) => h.band === 'at_risk' || h.band === 'critical');
    citations.push(
      cite('At-risk apps', atRisk.map((h) => `${h.name} (${h.score})`).join(', ') || 'none'),
      cite('Open tickets', String(openTickets.length)),
      cite('Overdue tasks', String(overdue.length))
    );
    if (!atRisk.length) {
      return {
        answer: 'No apps currently score at-risk. Keep an eye on support load and renewals.',
        citations,
        intent: 'health',
      };
    }
    return {
      answer: `At-risk: ${atRisk
        .map((h) => `**${h.name}** (${h.score}/100 — ${(h.reasons || []).slice(0, 2).join('; ')})`)
        .join('; ')}.`,
      citations,
      intent: 'health',
    };
  }

  if (/task|ship|overdue|board/.test(q)) {
    citations.push(
      cite('Open tasks', String(openTasks.length)),
      cite('Overdue', String(overdue.length)),
      cite('Sample overdue', overdue.slice(0, 3).map((t) => t.title).join(', ') || 'none')
    );
    return {
      answer: `You have **${openTasks.length}** open tasks (**${overdue.length}** overdue). ${
        overdue[0] ? `Start with “${overdue[0].title}”.` : 'Board looks clear of overdue work.'
      }`,
      citations,
      intent: 'tasks',
    };
  }

  if (/idea|pipeline/.test(q)) {
    const ranked = [...ideas]
      .filter((i) => i.status !== 'promoted')
      .sort((a, b) => Number(b.score) - Number(a.score))
      .slice(0, 3);
    citations.push(cite('Top ideas', ranked.map((i) => `${i.title} (${i.score})`).join(', ') || 'none'));
    return {
      answer: ranked.length
        ? `Top ideas: ${ranked.map((i) => `**${i.title}** (${i.score}/10)`).join(', ')}.`
        : 'Idea pipeline is empty — capture a few scored bets.',
      citations,
      intent: 'ideas',
    };
  }

  if (/mrr|revenue|arr|portfolio/.test(q)) {
    citations.push(
      cite('MRR', formatMoney(metrics.mrr)),
      cite('ARR', formatMoney(metrics.arr)),
      cite('Apps', String(apps.length)),
      cite('Leaders', perApp.slice(0, 3).map((p) => `${p.name || p.appName}: ${formatMoney(p.mrr)}`).join(', ') || 'n/a')
    );
    return {
      answer: `Portfolio **${formatMoney(metrics.mrr)} MRR** / **${formatMoney(metrics.arr)} ARR** across ${apps.length} apps.`,
      citations,
      intent: 'revenue',
    };
  }

  // Default brief
  citations.push(
    cite('MRR', formatMoney(metrics.mrr)),
    cite('Runway', String(runway)),
    cite('Open tasks', String(openTasks.length)),
    cite('Open tickets', String(openTickets.length)),
    cite('Focus hint', topMrr ? topMrr.name || topMrr.appName : 'n/a')
  );

  return {
    answer: `Quick brief: **${formatMoney(metrics.mrr)} MRR**, runway **${runway}**, **${openTasks.length}** open tasks, **${openTickets.length}** open tickets. ${
      topMrr
        ? `Default focus: **${topMrr.name || topMrr.appName}**.`
        : 'Ask “which app should I push?” for a ranked recommendation.'
    }`,
    citations,
    intent: 'brief',
  };
}
