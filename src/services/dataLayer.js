import { dataFetch, publicDataFetch } from '../api';
import {
  asId,
  asDbId,
  assertSuccess,
  getUserId,
  normalizeApp,
  normalizeBackup,
  normalizeNote,
  normalizePlan,
  normalizeTask,
  normalizeVersion,
  normalizeWorkflow,
  nowIso,
  isTruthyFlag,
  parseJsonArray,
  serializeArray,
  serializeJson,
  toDbArray,
  compactPayload,
  toDbFlag,
  toMysqlDate,
  toMysqlDatetime,
  unwrapList,
  unwrapOne,
} from '../lib/dataUtils';
import { saveWithCachedStrategies, listCachedStrategies, clearCachedStrategy, clearAllCachedStrategies } from '../lib/ncbSaveCache';
import { toastError } from '../components/common/Toast';

export const TABLES = {
  profiles: 'profiles_1739884512',
  apps: 'apps_1739884512',
  pricingPlans: 'pricing_plans_1739884512',
  sales: 'sales_1739884512',
  marketingMaterials: 'marketing_materials_1739884512',
  notes: 'app_notes_1739884512',
  tasks: 'app_tasks_1739884512',
  versions: 'app_versions_1739884512',
  backups: 'app_backups_1739884512',
  workflows: 'workflows_1739884512',
  workflowExecutions: 'workflow_executions_1739884512',
  teamMembers: 'team_members_1739884512',
};

async function request(path, options = {}, { silent = false, errorMessage } = {}) {
  try {
    const res = await dataFetch(path, options);
    return assertSuccess(res, errorMessage);
  } catch (error) {
    if (!silent) toastError(error.message || errorMessage || 'Request failed');
    throw error;
  }
}

function ownerQuery(extra = '') {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');
  if (!extra) return `owner_id=${userId}`;
  return `owner_id=${userId}&${String(extra).replace(/^[?&]/, '')}`;
}

/** Tables without a user_id column — do not send owner_id (NCB maps it to WHERE user_id). */
function queryParams(extra = '') {
  const cleaned = String(extra || '').replace(/^[?&]/, '');
  return cleaned;
}

function requireUser() {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');
  return userId;
}

function withUser(payload = {}) {
  return { ...payload, user_id: requireUser() };
}

/** Child rows scoped by app_id only (no user_id column on the table). */
function withoutUser(payload = {}) {
  requireUser();
  const { user_id: _ignored, ...rest } = payload;
  return rest;
}

/**
 * Execute a cached create/update/bulk strategy against an NCB table.
 */
async function executeTableStrategy(table, existingId, strategy, mode) {
  const qs = strategy.useOwner ? `?${ownerQuery()}` : '';
  if (mode === 'update') {
    return request(
      `update/${table}/${existingId}${qs}`,
      { method: 'PUT', body: JSON.stringify(strategy.body) },
      { silent: true, errorMessage: 'Failed to update record' }
    );
  }
  if (mode === 'bulk') {
    return request(
      `bulk/create/${table}${qs}`,
      { method: 'POST', body: JSON.stringify({ records: [strategy.body] }) },
      { silent: true, errorMessage: 'Failed to create record' }
    );
  }
  return request(
    `create/${table}${qs}`,
    { method: 'POST', body: JSON.stringify(strategy.body) },
    { silent: true, errorMessage: 'Failed to create record' }
  );
}

export const apps = {
  async get(id) {
    const appId = asDbId(id, 'app id');
    const res = await request(
      `read/${TABLES.apps}?id=${appId}&${ownerQuery()}`,
      {},
      { errorMessage: 'Failed to load app' }
    );
    return normalizeApp(unwrapOne(res.data));
  },

  async update(id, fields) {
    const appId = asDbId(id, 'app id');
    const payload = withUser({
      ...fields,
      updated_at: nowIso(),
    });
    if (fields.tech_stack !== undefined) {
      // NCB stores tech_stack as JSON text in this instance
      payload.tech_stack = serializeArray(fields.tech_stack);
    }
    if (fields.specifications !== undefined) {
      payload.specifications = serializeJson(fields.specifications, {});
    }
    const res = await request(
      `update/${TABLES.apps}/${appId}?${ownerQuery()}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      { errorMessage: 'Failed to save app' }
    );
    return normalizeApp(unwrapOne(res.data) || { id: appId, ...fields });
  },

  async create(fields) {
    const payload = withUser({
      ...fields,
      tech_stack: serializeArray(fields.tech_stack || []),
      specifications: serializeJson(fields.specifications || {}, {}),
      created_at: nowIso(),
      updated_at: nowIso(),
    });
    const res = await request(
      `create/${TABLES.apps}?${ownerQuery()}`,
      { method: 'POST', body: JSON.stringify(payload) },
      { errorMessage: 'Failed to create app' }
    );
    return normalizeApp(unwrapOne(res.data));
  },
};

export const pricingPlans = {
  async list(appId) {
    const id = asDbId(appId, 'app id');
    requireUser();
    // Do not send owner_id first — this table has no user_id column (NCB maps owner_id → WHERE user_id).
    const queries = [
      `read/${TABLES.pricingPlans}?app_id=${id}`,
      `read/${TABLES.pricingPlans}?app_id=${id}&${ownerQuery('sort=price&order=asc')}`,
    ];
    for (const path of queries) {
      try {
        const res = await request(path, {}, { silent: true, errorMessage: 'Failed to load pricing plans' });
        return unwrapList(res.data).map(normalizePlan);
      } catch {
        /* try next */
      }
    }
    return [];
  },

  async save(appId, plan, existingId = null) {
    const id = asDbId(appId, 'app id');
    const userId = requireUser();
    const name = String(plan.name || '').trim();
    if (!name) throw new Error('Plan name is required');

    const priceNum = Number(plan.price);
    const price = Number.isFinite(priceNum) ? priceNum : 0;
    const featuresList = parseJsonArray(plan.features);
    const featuresJson = serializeArray(featuresList);
    const featuresText = featuresList.join('\n');

    const strategies = [
      {
        id: 'no-owner:features-array+created',
        useOwner: false,
        tryBulk: true,
        body: compactPayload({
          app_id: id,
          name,
          price,
          features: featuresList,
          ...(existingId ? {} : { created_at: nowIso() }),
        }),
      },
      {
        id: 'no-owner:features-json+created',
        useOwner: false,
        tryBulk: true,
        body: compactPayload({
          app_id: id,
          name,
          price,
          features: featuresJson,
          ...(existingId ? {} : { created_at: nowIso() }),
        }),
      },
      {
        id: 'no-owner:features-text+created',
        useOwner: false,
        tryBulk: true,
        body: compactPayload({
          app_id: id,
          name,
          price,
          features: featuresText || undefined,
          ...(existingId ? {} : { created_at: nowIso() }),
        }),
      },
      {
        id: 'no-owner:name-price-created',
        useOwner: false,
        tryBulk: true,
        body: compactPayload({
          app_id: id,
          name,
          price,
          ...(existingId ? {} : { created_at: nowIso() }),
        }),
      },
      {
        id: 'no-owner:name-price',
        useOwner: false,
        tryBulk: true,
        body: compactPayload({ app_id: id, name, price }),
      },
      {
        id: 'owner:features-json',
        useOwner: true,
        tryBulk: true,
        body: compactPayload({
          app_id: id,
          user_id: userId,
          name,
          price,
          features: featuresJson,
          ...(existingId ? {} : { created_at: nowIso() }),
        }),
      },
    ];

    try {
      const { result } = await saveWithCachedStrategies({
        table: TABLES.pricingPlans,
        existingId,
        strategies,
        errorMessage: 'Failed to save pricing plan',
        execute: (strategy, mode) =>
          executeTableStrategy(TABLES.pricingPlans, existingId, strategy, mode),
      });
      return normalizePlan(
        unwrapOne(result?.data) || { id: existingId, name, price, features: featuresList }
      );
    } catch (error) {
      toastError(error?.message || 'Failed to save pricing plan');
      throw error;
    }
  },

  async remove(planId) {
    requireUser();
    try {
      await request(
        `delete/${TABLES.pricingPlans}/${planId}`,
        { method: 'DELETE' },
        { silent: true, errorMessage: 'Failed to delete pricing plan' }
      );
    } catch {
      await request(
        `delete/${TABLES.pricingPlans}/${planId}?${ownerQuery()}`,
        { method: 'DELETE' },
        { errorMessage: 'Failed to delete pricing plan' }
      );
    }
  },
};

export const sales = {
  async list(appId) {
    const id = asDbId(appId, 'app id');
    requireUser();
    // Prefer no owner_id — sales often has no user_id column (same class as pricing_plans).
    const queries = [
      `read/${TABLES.sales}?app_id=${id}`,
      `read/${TABLES.sales}?app_id=${id}&${ownerQuery('sort=date&order=desc')}`,
    ];
    let rows = [];
    for (const path of queries) {
      try {
        const res = await request(path, {}, { silent: true, errorMessage: 'Failed to load sales' });
        rows = unwrapList(res.data);
        break;
      } catch {
        /* try next */
      }
    }

    try {
      const noteRows = await notes.list(appId);
      const saleNotes = (noteRows || [])
        .filter((n) => n.note_type === 'sale' || String(n.title || '').startsWith('[Sale]'))
        .map((n) => {
          let parsed = {};
          try {
            parsed = typeof n.content === 'string' ? JSON.parse(n.content) : n.content || {};
          } catch {
            parsed = { customer_name: String(n.title || '').replace(/^\[Sale\]\s*/, ''), amount: 0 };
          }
          return {
            id: n.id,
            app_id: id,
            customer_name: parsed.customer_name || 'Unknown',
            plan_name: parsed.plan_name || 'Custom',
            amount: parsed.amount ?? 0,
            status: parsed.status || 'Completed',
            date: parsed.date || n.created_at,
            _stored_as_note: true,
          };
        });
      const existingIds = new Set(rows.map((r) => String(r.id)));
      rows = [...rows, ...saleNotes.filter((s) => !existingIds.has(String(s.id)))];
    } catch {
      /* notes optional */
    }

    return rows;
  },

  async save(appId, sale, existingId = null) {
    const id = asDbId(appId, 'app id');
    const userId = requireUser();
    const customerName = String(sale.customer_name || '').trim();
    if (!customerName) throw new Error('Customer name is required');

    const amountNum = Number(sale.amount);
    if (Number.isNaN(amountNum)) throw new Error('Amount must be a number');

    const planName = String(sale.plan_name || 'Custom').trim() || 'Custom';
    const status = sale.status || 'Completed';
    const dateMysql = sale.date ? toMysqlDate(sale.date) : nowIso();
    const dateOnly =
      sale.date && /^\d{4}-\d{2}-\d{2}/.test(String(sale.date))
        ? String(sale.date).slice(0, 10)
        : dateMysql
          ? String(dateMysql).slice(0, 10)
          : undefined;

    // No-owner strategies first: owner_id → WHERE user_id blows up on this table.
    const strategies = [
      {
        id: 'no-owner:full-date-mysql',
        useOwner: false,
        tryBulk: true,
        body: compactPayload({
          app_id: id,
          customer_name: customerName,
          plan_name: planName,
          amount: amountNum,
          status,
          date: dateMysql,
        }),
      },
      {
        id: 'no-owner:full-date-only',
        useOwner: false,
        tryBulk: true,
        body: compactPayload({
          app_id: id,
          customer_name: customerName,
          plan_name: planName,
          amount: amountNum,
          status,
          date: dateOnly,
        }),
      },
      {
        id: 'no-owner:amount-string-date-only',
        useOwner: false,
        tryBulk: true,
        body: compactPayload({
          app_id: id,
          customer_name: customerName,
          plan_name: planName,
          amount: String(amountNum),
          status,
          date: dateOnly,
        }),
      },
      {
        id: 'no-owner:no-status',
        useOwner: false,
        tryBulk: true,
        body: compactPayload({
          app_id: id,
          customer_name: customerName,
          plan_name: planName,
          amount: amountNum,
          date: dateOnly || dateMysql,
        }),
      },
      {
        id: 'no-owner:minimal',
        useOwner: false,
        tryBulk: true,
        body: compactPayload({
          app_id: id,
          customer_name: customerName,
          amount: amountNum,
        }),
      },
      {
        id: 'no-owner:with-created-at',
        useOwner: false,
        tryBulk: true,
        body: compactPayload({
          app_id: id,
          customer_name: customerName,
          plan_name: planName,
          amount: amountNum,
          status,
          date: dateMysql,
          created_at: nowIso(),
        }),
      },
      {
        id: 'owner:full-date-mysql',
        useOwner: true,
        tryBulk: true,
        body: compactPayload({
          app_id: id,
          user_id: userId,
          customer_name: customerName,
          plan_name: planName,
          amount: amountNum,
          status,
          date: dateMysql,
        }),
      },
      {
        id: 'owner:minimal',
        useOwner: true,
        tryBulk: true,
        body: compactPayload({
          app_id: id,
          user_id: userId,
          customer_name: customerName,
          amount: amountNum,
        }),
      },
    ];

    try {
      const { result, strategy } = await saveWithCachedStrategies({
        table: TABLES.sales,
        existingId,
        strategies,
        errorMessage: 'Failed to save sale',
        execute: (s, mode) => executeTableStrategy(TABLES.sales, existingId, s, mode),
      });
      return (
        unwrapOne(result?.data) || {
          id: existingId,
          ...strategy.body,
        }
      );
    } catch (error) {
      // Fallback: persist as a structured note so revenue tracking still works.
      try {
        const payload = {
          customer_name: customerName,
          plan_name: planName,
          amount: amountNum,
          status,
          date: dateOnly || dateMysql || nowIso(),
        };
        const note = await notes.save(
          appId,
          {
            title: `[Sale] ${customerName} — $${amountNum}`,
            content: JSON.stringify(payload, null, 2),
            note_type: 'sale',
            tags: 'sale',
            is_pinned: 0,
            is_encrypted: 0,
            is_shared: 0,
          },
          existingId && sale._stored_as_note ? existingId : null
        );
        console.warn('sales create failed; stored as note', error?.message);
        return {
          id: note?.id,
          app_id: id,
          ...payload,
          _stored_as_note: true,
        };
      } catch {
        toastError(error?.message || 'Failed to save sale');
        throw error;
      }
    }
  },

  async remove(saleId, { storedAsNote = false } = {}) {
    requireUser();
    if (storedAsNote) {
      await notes.remove(saleId);
      return;
    }
    try {
      await request(
        `delete/${TABLES.sales}/${saleId}`,
        { method: 'DELETE' },
        { silent: true, errorMessage: 'Failed to delete sale' }
      );
    } catch {
      try {
        await request(
          `delete/${TABLES.sales}/${saleId}?${ownerQuery()}`,
          { method: 'DELETE' },
          { silent: true, errorMessage: 'Failed to delete sale' }
        );
      } catch {
        await notes.remove(saleId);
      }
    }
  },
};

export const notes = {
  async list(appId) {
    const id = asDbId(appId, 'app id');
    const res = await request(
      `read/${TABLES.notes}?app_id=${id}&${ownerQuery('sort=is_pinned&order=desc')}`,
      {},
      { errorMessage: 'Failed to load notes' }
    );
    return unwrapList(res.data).map(normalizeNote);
  },

  async save(appId, note, existingId = null) {
    const id = asDbId(appId, 'app id');
    const payload = withUser(
      compactPayload({
        title: note.title,
        content: note.content,
        note_type: note.note_type || 'general',
        tags: note.tags || '',
        app_id: id,
        is_pinned: toDbFlag(note.is_pinned),
        is_encrypted: toDbFlag(note.is_encrypted),
        is_shared: toDbFlag(note.is_shared),
        share_token: note.share_token || undefined,
        updated_at: nowIso(),
        ...(existingId ? {} : { created_at: nowIso() }),
      })
    );
    const res = existingId
      ? await request(
          `update/${TABLES.notes}/${existingId}?${ownerQuery()}`,
          { method: 'PUT', body: JSON.stringify(payload) },
          { errorMessage: 'Failed to save note' }
        )
      : await request(
          `create/${TABLES.notes}?${ownerQuery()}`,
          { method: 'POST', body: JSON.stringify(payload) },
          { errorMessage: 'Failed to save note' }
        );
    return normalizeNote(unwrapOne(res.data));
  },

  async updateFlags(noteId, fields) {
    const payload = withUser({
      ...fields,
      ...(fields.is_pinned !== undefined ? { is_pinned: toDbFlag(fields.is_pinned) } : {}),
      ...(fields.is_encrypted !== undefined ? { is_encrypted: toDbFlag(fields.is_encrypted) } : {}),
      ...(fields.is_shared !== undefined ? { is_shared: toDbFlag(fields.is_shared) } : {}),
      updated_at: nowIso(),
    });
    const res = await request(
      `update/${TABLES.notes}/${noteId}?${ownerQuery()}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      { errorMessage: 'Failed to update note' }
    );
    return normalizeNote(unwrapOne(res.data));
  },

  async remove(noteId) {
    await request(
      `delete/${TABLES.notes}/${noteId}?${ownerQuery()}`,
      { method: 'DELETE' },
      { errorMessage: 'Failed to delete note' }
    );
  },

  async getByShareToken(token) {
    const res = await publicDataFetch(`read/${TABLES.notes}?share_token=${encodeURIComponent(token)}`);
    assertSuccess(res, 'Failed to load shared note');
    return normalizeNote(unwrapOne(res.data));
  },
};

export const tasks = {
  async list(appId) {
    const id = asDbId(appId, 'app id');
    const res = await request(
      `read/${TABLES.tasks}?app_id=${id}&${ownerQuery()}`,
      {},
      { errorMessage: 'Failed to load tasks' }
    );
    return unwrapList(res.data).map(normalizeTask);
  },

  async save(appId, task, existingId = null) {
    const id = asDbId(appId, 'app id');
    const userId = requireUser();
    const tags = toDbArray(task.tags);

    // Keep payload minimal — NCB rejects unknown/null columns and array-typed tags.
    const payload = compactPayload({
      app_id: id,
      user_id: userId,
      title: String(task.title || '').trim(),
      description: task.description || '',
      task_type: task.task_type || 'manual',
      priority: task.priority || 'medium',
      status: task.status || 'todo',
      ...(tags.length ? { tags: serializeArray(tags) } : {}),
      estimated_hours:
        task.estimated_hours !== '' && task.estimated_hours != null
          ? Number(task.estimated_hours)
          : undefined,
      due_date: task.due_date ? toMysqlDate(task.due_date) : undefined,
      assignee_id: task.assignee_id || undefined,
    });

    if (!payload.title) {
      throw new Error('Task title is required');
    }

    // Retry without optional fields if the first create fails (schema variance across NCB tables).
    const attempts = existingId
      ? [payload]
      : [
          payload,
          compactPayload({
            app_id: id,
            user_id: userId,
            title: payload.title,
            description: payload.description,
            task_type: payload.task_type,
            priority: payload.priority,
            status: payload.status,
          }),
          compactPayload({
            app_id: id,
            title: payload.title,
            status: payload.status || 'todo',
          }),
        ];

    let lastError;
    for (const body of attempts) {
      try {
        const res = existingId
          ? await request(
              `update/${TABLES.tasks}/${existingId}?${ownerQuery()}`,
              { method: 'PUT', body: JSON.stringify(body) },
              { silent: true, errorMessage: 'Failed to save task' }
            )
          : await request(
              `create/${TABLES.tasks}?${ownerQuery()}`,
              { method: 'POST', body: JSON.stringify(body) },
              { silent: true, errorMessage: 'Failed to save task' }
            );
        return normalizeTask(unwrapOne(res.data));
      } catch (error) {
        lastError = error;
      }
    }

    toastError(lastError?.message || 'Failed to save task');
    throw lastError || new Error('Failed to save task');
  },

  async updateStatus(taskId, status) {
    await request(
      `update/${TABLES.tasks}/${taskId}?${ownerQuery()}`,
      {
        method: 'PUT',
        body: JSON.stringify(withUser({ status })),
      },
      { errorMessage: 'Failed to update task status' }
    );
  },

  async remove(taskId) {
    await request(
      `delete/${TABLES.tasks}/${taskId}?${ownerQuery()}`,
      { method: 'DELETE' },
      { errorMessage: 'Failed to delete task' }
    );
  },
};

/** Plain text must be wrapped — NCB `details` is often JSON and rejects freeform strings. */
function toMarketingDetailsJson(details) {
  if (details == null || details === '') return undefined;
  if (typeof details === 'object') return JSON.stringify(details);
  if (typeof details === 'string') {
    const trimmed = details.trim();
    if (!trimmed) return undefined;
    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch {
      return JSON.stringify({ text: trimmed });
    }
  }
  return undefined;
}

function marketingContent(item) {
  if (typeof item.details === 'string') return item.details;
  if (item.details != null) return JSON.stringify(item.details, null, 2);
  if (typeof item.content === 'string') return item.content;
  return '';
}

function normalizeMarketingItem(item) {
  if (!item) return item;
  let details = item.details;
  if (typeof details === 'string') {
    try {
      details = JSON.parse(details);
    } catch {
      /* keep string */
    }
  }
  if (details && typeof details === 'object' && details.text && !item.content) {
    details = details.text;
  }
  const content = item.content || (typeof details === 'string' ? details : null);
  return {
    ...item,
    details: details ?? content ?? '',
    content: content ?? (typeof details === 'string' ? details : item.content),
    name: item.name || item.artifact_type || 'Untitled Asset',
    category: item.category || 'General',
    artifact_type: item.artifact_type || item.name || 'Document',
  };
}

export const marketing = {
  async list(appId) {
    const id = asDbId(appId, 'app id');
    requireUser();
    // Live NCB table includes user_id (unlike the Postgres migration notes).
    const queries = [
      `read/${TABLES.marketingMaterials}?app_id=${id}&${ownerQuery()}`,
      `read/${TABLES.marketingMaterials}?app_id=${id}`,
    ];
    let materials = [];
    for (const path of queries) {
      try {
        const res = await request(path, {}, { silent: true, errorMessage: 'Failed to load marketing materials' });
        materials = unwrapList(res.data).map(normalizeMarketingItem);
        break;
      } catch {
        /* try next */
      }
    }

    // Include marketing assets that were persisted as notes (fallback path).
    try {
      const noteRows = await notes.list(appId);
      const marketingNotes = (noteRows || [])
        .filter((n) => n.note_type === 'marketing' || String(n.title || '').startsWith('[Marketing]'))
        .map((n) =>
          normalizeMarketingItem({
            id: n.id,
            app_id: id,
            name: String(n.title || '').replace(/^\[Marketing\]\s*/, '') || 'Untitled Asset',
            category: String(n.tags || '')
              .split(',')
              .map((t) => t.trim())
              .find((t) => t && t !== 'marketing') || 'General',
            artifact_type: 'Document',
            type: 'document',
            details: n.content,
            content: n.content,
            _stored_as_note: true,
          })
        );
      const existingIds = new Set(materials.map((m) => String(m.id)));
      materials = [...materials, ...marketingNotes.filter((n) => !existingIds.has(String(n.id)))];
    } catch {
      /* notes optional */
    }

    return materials;
  },

  async save(appId, item, existingId = null) {
    const id = asDbId(appId, 'app id');
    const userId = requireUser();

    const name =
      String(item.name || item.artifact_type || 'Untitled Asset').trim() || 'Untitled Asset';
    const content = marketingContent(item);
    const detailsJson = toMarketingDetailsJson(item.details ?? content);
    const type = item.type || 'document';
    const description =
      item.description ||
      [item.category, item.artifact_type].filter(Boolean).join(' · ') ||
      undefined;

    if (existingId && item._stored_as_note) {
      const note = await notes.save(
        appId,
        {
          title: `[Marketing] ${name}`,
          content: content || name,
          note_type: 'marketing',
          tags: ['marketing', item.category, item.artifact_type].filter(Boolean).join(','),
          is_pinned: 0,
          is_encrypted: 0,
          is_shared: 0,
        },
        existingId
      );
      return normalizeMarketingItem({
        id: note?.id || existingId,
        app_id: id,
        name,
        category: item.category || 'General',
        artifact_type: item.artifact_type || 'Document',
        type: 'document',
        details: content,
        content,
        _stored_as_note: true,
      });
    }

    const strategies = [
      {
        id: 'owner:full',
        useOwner: true,
        tryBulk: true,
        body: compactPayload({
          app_id: id,
          user_id: userId,
          name,
          category: item.category || 'General',
          artifact_type: item.artifact_type || 'Document',
          type,
          details: detailsJson,
          content: content || name,
          description,
          ...(existingId ? {} : { created_at: nowIso() }),
        }),
      },
      {
        id: 'owner:content',
        useOwner: true,
        tryBulk: true,
        body: compactPayload({
          app_id: id,
          user_id: userId,
          name,
          type: 'document',
          content: content || name,
          description: description || 'Marketing asset',
          ...(existingId ? {} : { created_at: nowIso() }),
        }),
      },
      {
        id: 'owner:minimal',
        useOwner: true,
        tryBulk: true,
        body: compactPayload({
          app_id: id,
          user_id: userId,
          name,
          type: 'document',
          ...(existingId ? {} : { created_at: nowIso() }),
        }),
      },
      {
        id: 'no-owner:content',
        useOwner: false,
        tryBulk: true,
        body: compactPayload({
          app_id: id,
          name,
          type: 'document',
          content: content || name,
          ...(existingId ? {} : { created_at: nowIso() }),
        }),
      },
      {
        id: 'no-owner:minimal',
        useOwner: false,
        tryBulk: true,
        body: compactPayload({
          app_id: id,
          name,
          type: 'document',
        }),
      },
    ];

    try {
      const { result, strategy } = await saveWithCachedStrategies({
        table: TABLES.marketingMaterials,
        existingId,
        strategies,
        errorMessage: 'Failed to save marketing asset',
        execute: (s, mode) =>
          executeTableStrategy(TABLES.marketingMaterials, existingId, s, mode),
      });
      return normalizeMarketingItem(
        unwrapOne(result?.data) || { id: existingId, ...strategy.body, details: content, content }
      );
    } catch (lastError) {
      // Last resort: persist as a typed note so the UI can still save content.
      try {
        const note = await notes.save(appId, {
          title: `[Marketing] ${name}`,
          content: content || name,
          note_type: 'marketing',
          tags: ['marketing', item.category, item.artifact_type].filter(Boolean).join(','),
          is_pinned: 0,
          is_encrypted: 0,
          is_shared: 0,
        });
        console.warn('marketing_materials create failed; stored as note', lastError?.message);
        return normalizeMarketingItem({
          id: note?.id,
          app_id: id,
          name,
          category: item.category || 'General',
          artifact_type: item.artifact_type || 'Document',
          type: 'document',
          details: content,
          content,
          _stored_as_note: true,
        });
      } catch {
        toastError(lastError?.message || 'Failed to save marketing asset');
        throw lastError || new Error('Failed to save marketing asset');
      }
    }
  },

  async bulkCreate(records) {
    const userId = requireUser();
    const payload = {
      records: records.map((record) => {
        const content = marketingContent(record);
        return compactPayload({
          app_id: asDbId(record.app_id, 'app id'),
          user_id: userId,
          name:
            String(record.name || record.artifact_type || 'Untitled Asset').trim() ||
            'Untitled Asset',
          type: record.type || 'document',
          content: content || undefined,
          description:
            record.description ||
            [record.category, record.artifact_type].filter(Boolean).join(' · ') ||
            undefined,
          created_at: record.created_at || nowIso(),
        });
      }),
    };
    try {
      await request(
        `bulk/create/${TABLES.marketingMaterials}?${ownerQuery()}`,
        { method: 'POST', body: JSON.stringify(payload) },
        { silent: true, errorMessage: 'Failed to create marketing materials' }
      );
    } catch {
      // Fallback without user_id for schemas that omit it
      const lean = {
        records: payload.records.map(({ user_id: _u, ...rest }) => rest),
      };
      await request(
        `bulk/create/${TABLES.marketingMaterials}`,
        { method: 'POST', body: JSON.stringify(lean) },
        { errorMessage: 'Failed to create marketing materials' }
      );
    }
  },

  async remove(materialId, { storedAsNote = false } = {}) {
    const id = asDbId(materialId, 'material id');
    requireUser();
    if (storedAsNote) {
      await notes.remove(id);
      return;
    }
    try {
      await request(
        `delete/${TABLES.marketingMaterials}/${id}?${ownerQuery()}`,
        { method: 'DELETE' },
        { silent: true, errorMessage: 'Failed to delete marketing asset' }
      );
    } catch {
      try {
        await request(
          `delete/${TABLES.marketingMaterials}/${id}`,
          { method: 'DELETE' },
          { silent: true, errorMessage: 'Failed to delete marketing asset' }
        );
      } catch {
        // May have been saved via notes fallback
        await notes.remove(id);
      }
    }
  },
};

export const versions = {
  async list(appId) {
    const id = asDbId(appId, 'app id');
    const res = await request(
      `read/${TABLES.versions}?app_id=${id}&${ownerQuery('sort=created_at&order=desc')}`,
      {},
      { errorMessage: 'Failed to load versions' }
    );
    return unwrapList(res.data).map(normalizeVersion);
  },

  async create(appId, version) {
    const id = asDbId(appId, 'app id');
    const payload = withUser({
      ...version,
      app_id: id,
      is_current: toDbFlag(version.is_current),
      release_date: version.status === 'production' ? nowIso() : null,
      created_at: nowIso(),
    });
    const res = await request(
      `create/${TABLES.versions}?${ownerQuery()}`,
      { method: 'POST', body: JSON.stringify(payload) },
      { errorMessage: 'Failed to create version' }
    );
    return normalizeVersion(unwrapOne(res.data));
  },

  async setCurrent(appId, versionId, currentList = []) {
    const currents = currentList.filter((v) => isTruthyFlag(v.is_current));
    if (currents.length > 0) {
      await request(
        `bulk/update/${TABLES.versions}?${ownerQuery()}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            records: currents.map((v) => withUser({ id: v.id, is_current: 0 })),
          }),
        },
        { errorMessage: 'Failed to update current version' }
      );
    }
    await request(
      `update/${TABLES.versions}/${versionId}?${ownerQuery()}`,
      { method: 'PUT', body: JSON.stringify(withUser({ is_current: 1 })) },
      { errorMessage: 'Failed to set current version' }
    );
  },
};

export const backups = {
  async list(appId) {
    const id = asDbId(appId, 'app id');
    const res = await request(
      `read/${TABLES.backups}?app_id=${id}&${ownerQuery('sort=backup_date&order=desc')}`,
      {},
      { errorMessage: 'Failed to load backups' }
    );
    return unwrapList(res.data).map(normalizeBackup);
  },

  async create(appId, backup) {
    const id = asDbId(appId, 'app id');
    const payload = withUser({
      ...backup,
      app_id: id,
      is_encrypted: toDbFlag(backup.is_encrypted),
      backup_name: backup.backup_name || `Backup ${new Date().toLocaleString()}`,
      backup_size: backup.backup_size ?? Math.floor(Math.random() * 1000000000),
      storage_location:
        backup.storage_location || `https://storage.example.com/backups/${id}/${Date.now()}`,
      expiry_date: backup.expiry_date ? toMysqlDate(backup.expiry_date) : null,
      backup_date: nowIso(),
      status: 'active',
      created_at: nowIso(),
    });
    const res = await request(
      `create/${TABLES.backups}?${ownerQuery()}`,
      { method: 'POST', body: JSON.stringify(payload) },
      { errorMessage: 'Failed to create backup' }
    );
    return normalizeBackup(unwrapOne(res.data));
  },

  async update(backupId, fields) {
    await request(
      `update/${TABLES.backups}/${backupId}?${ownerQuery()}`,
      { method: 'PUT', body: JSON.stringify(withUser(fields)) },
      { errorMessage: 'Failed to update backup' }
    );
  },

  async remove(backupId) {
    await request(
      `delete/${TABLES.backups}/${backupId}?${ownerQuery()}`,
      { method: 'DELETE' },
      { errorMessage: 'Failed to delete backup' }
    );
  },
};

export const workflows = {
  async list(appId) {
    const id = asDbId(appId, 'app id');
    try {
      const res = await request(
        `read/${TABLES.workflows}?app_id=${id}&${ownerQuery('sort=created_at&order=desc')}`,
        {},
        { silent: true, errorMessage: 'Failed to load workflows' }
      );
      return unwrapList(res.data).map(normalizeWorkflow);
    } catch {
      return [];
    }
  },

  async listExecutions(appId) {
    const id = asDbId(appId, 'app id');
    try {
      const res = await request(
        `read/${TABLES.workflowExecutions}?app_id=${id}&${ownerQuery('sort=started_at&order=desc&limit=30')}`,
        {},
        { silent: true }
      );
      return unwrapList(res.data);
    } catch {
      return [];
    }
  },

  buildPayload(appId, workflow, { isCreate = false } = {}) {
    const id = asDbId(appId, 'app id');
    const userId = requireUser();
    const steps = Array.isArray(workflow.steps)
      ? workflow.steps
      : [
          { id: 'step1', name: 'Run Tests', type: 'testing' },
          { id: 'step2', name: 'Build App', type: 'build' },
          { id: 'step3', name: 'Deploy', type: 'deploy' },
        ];
    const triggerConfig =
      typeof workflow.trigger_config === 'string'
        ? workflow.trigger_config
        : JSON.stringify(workflow.trigger_config || {});

    return compactPayload({
      app_id: id,
      user_id: userId,
      name: String(workflow.name || '').trim(),
      description: workflow.description || '',
      trigger_type: workflow.trigger_type || 'manual',
      trigger_config: triggerConfig,
      steps: serializeArray(steps),
      is_active: toDbFlag(workflow.is_active ?? 1),
      updated_at: nowIso(),
      ...(isCreate
        ? {
            created_at: nowIso(),
            run_count: 0,
            success_count: 0,
          }
        : {}),
    });
  },

  async save(appId, workflow, existingId = null) {
    const payload = this.buildPayload(appId, workflow, { isCreate: !existingId });
    if (!payload.name) throw new Error('Workflow name is required');

    const lean = compactPayload({
      app_id: payload.app_id,
      user_id: payload.user_id,
      name: payload.name,
      description: payload.description,
      trigger_type: payload.trigger_type,
      steps: payload.steps,
      is_active: payload.is_active,
      updated_at: payload.updated_at,
      ...(existingId ? {} : { created_at: payload.created_at }),
    });

    const attempts = [payload, lean];
    let lastError;
    for (const body of attempts) {
      try {
        const res = existingId
          ? await request(
              `update/${TABLES.workflows}/${existingId}?${ownerQuery()}`,
              { method: 'PUT', body: JSON.stringify(body) },
              { silent: true, errorMessage: 'Failed to save workflow' }
            )
          : await request(
              `create/${TABLES.workflows}?${ownerQuery()}`,
              { method: 'POST', body: JSON.stringify(body) },
              { silent: true, errorMessage: 'Failed to save workflow' }
            );
        return normalizeWorkflow(unwrapOne(res.data) || { id: existingId, ...workflow, ...body });
      } catch (error) {
        lastError = error;
      }
    }
    toastError(lastError?.message || 'Failed to save workflow');
    throw lastError || new Error('Failed to save workflow');
  },

  async create(appId, workflow) {
    return this.save(appId, workflow, null);
  },

  async update(workflowId, appId, workflow) {
    return this.save(appId, workflow, workflowId);
  },

  async remove(workflowId) {
    await request(
      `delete/${TABLES.workflows}/${workflowId}?${ownerQuery()}`,
      { method: 'DELETE' },
      { errorMessage: 'Failed to delete workflow' }
    );
  },

  async toggle(workflow) {
    const next = toDbFlag(!isTruthyFlag(workflow.is_active));
    await request(
      `update/${TABLES.workflows}/${workflow.id}?${ownerQuery()}`,
      {
        method: 'PUT',
        body: JSON.stringify(withUser({ is_active: next, updated_at: nowIso() })),
      },
      { errorMessage: 'Failed to toggle workflow' }
    );
    return { ...workflow, is_active: next };
  },

  async run(appId, workflow) {
    const id = asDbId(appId, 'app id');
    const workflowId = typeof workflow === 'object' ? workflow.id : workflow;
    const steps = typeof workflow === 'object' ? normalizeWorkflow(workflow).steps : [];
    const totalSteps = steps.length || 3;
    const payload = withUser(
      compactPayload({
        workflow_id: workflowId,
        app_id: id,
        status: 'running',
        total_steps: totalSteps,
        steps_completed: 0,
        started_at: nowIso(),
        execution_data: JSON.stringify({ step_names: steps.map((s) => s.name || s.type) }),
      })
    );
    const res = await request(
      `create/${TABLES.workflowExecutions}?${ownerQuery()}`,
      { method: 'POST', body: JSON.stringify(payload) },
      { errorMessage: 'Failed to start workflow' }
    );
    return unwrapOne(res.data);
  },

  async completeExecution(executionId, workflow, { failed = false, errorMessage } = {}) {
    const steps = normalizeWorkflow(workflow || {}).steps || [];
    const totalSteps = steps.length || 3;
    await request(
      `update/${TABLES.workflowExecutions}/${executionId}?${ownerQuery()}`,
      {
        method: 'PUT',
        body: JSON.stringify(
          withUser(
            compactPayload({
              status: failed ? 'failed' : 'completed',
              steps_completed: failed ? Math.max(0, totalSteps - 1) : totalSteps,
              completed_at: nowIso(),
              error_message: failed ? errorMessage || 'Workflow failed during execution' : undefined,
            })
          )
        ),
      },
      { silent: true }
    );
    if (workflow?.id) {
      await request(
        `update/${TABLES.workflows}/${workflow.id}?${ownerQuery()}`,
        {
          method: 'PUT',
          body: JSON.stringify(
            withUser({
              run_count: Number(workflow.run_count || 0) + 1,
              success_count: failed
                ? Number(workflow.success_count || 0)
                : Number(workflow.success_count || 0) + 1,
              last_run: nowIso(),
              updated_at: nowIso(),
            })
          ),
        },
        { silent: true }
      );
    }
  },

  async cancelExecution(executionId) {
    await request(
      `update/${TABLES.workflowExecutions}/${executionId}?${ownerQuery()}`,
      {
        method: 'PUT',
        body: JSON.stringify(
          withUser({
            status: 'cancelled',
            completed_at: nowIso(),
            error_message: 'Cancelled by user',
          })
        ),
      },
      { errorMessage: 'Failed to cancel execution' }
    );
  },
};

export const team = {
  async listMembers() {
    const userId = requireUser();
    try {
      // NCB's owner_id query param always filters user_id; this table uses owner_id column.
      const res = await request(`read/${TABLES.teamMembers}`, {}, { silent: true });
      return unwrapList(res.data).filter(
        (member) => !member.owner_id || String(member.owner_id) === String(userId)
      );
    } catch {
      return [];
    }
  },

  async inviteMember({ email, role = 'Member', name } = {}) {
    const userId = requireUser();
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('A valid email is required');
    }
    const displayName = name || cleanEmail.split('@')[0];
    const payload = compactPayload({
      owner_id: userId,
      email: cleanEmail,
      name: displayName,
      role,
      status: 'Invited',
      projects: [],
      invited_at: nowIso(),
      created_at: nowIso(),
    });

    const strategies = [
      { id: 'owner_id+email+role', body: payload },
      {
        id: 'user_id+email+role',
        body: compactPayload({
          user_id: userId,
          email: cleanEmail,
          name: displayName,
          role,
          status: 'Invited',
          created_at: nowIso(),
        }),
      },
      {
        id: 'minimal',
        body: compactPayload({
          owner_id: userId,
          email: cleanEmail,
          role,
          status: 'Invited',
        }),
      },
    ];

    for (const strategy of strategies) {
      try {
        const res = await request(
          `create/${TABLES.teamMembers}`,
          { method: 'POST', body: JSON.stringify(strategy.body) },
          { silent: true, errorMessage: 'Failed to invite member' }
        );
        return unwrapOne(res.data) || { ...strategy.body, id: `local_${Date.now()}` };
      } catch {
        /* try next */
      }
    }

    // Soft success for UI — caller can also persist via invitesStore
    return {
      id: `pending_${Date.now()}`,
      ...payload,
      _local_only: true,
    };
  },

  async removeMember(memberId) {
    requireUser();
    try {
      await request(
        `delete/${TABLES.teamMembers}/${memberId}`,
        { method: 'DELETE' },
        { silent: true, errorMessage: 'Failed to remove member' }
      );
    } catch {
      await request(
        `delete/${TABLES.teamMembers}/${memberId}?${ownerQuery()}`,
        { method: 'DELETE' },
        { errorMessage: 'Failed to remove member' }
      );
    }
  },
};

export const profiles = {
  async createForUser(user, { fullName, email } = {}) {
    const userId = asId(user?.id || user, 'user id');
    const payload = {
      id: userId,
      full_name: fullName || user?.name || 'New User',
      email: email || user?.email || '',
      role: 'Developer',
      avatar_url:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      updated_at: nowIso(),
    };
    const res = await request(
      `create/${TABLES.profiles}?owner_id=${userId}`,
      { method: 'POST', body: JSON.stringify(payload) },
      { errorMessage: 'Failed to create profile' }
    );
    return unwrapOne(res.data);
  },
};

export { serializeArray, toDbFlag, isTruthyFlag, listCachedStrategies, clearCachedStrategy, clearAllCachedStrategies };
