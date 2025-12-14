/* 
# Retry Fix for Missing Tables and Schema Cache
1. Changes
   - Ensure `workflows` exists (created first)
   - Ensure `app_tasks` exists (created second)
   - Add RLS policies
   - Reload schema cache
*/

-- 1. Create Workflows Table first (Dependency for app_tasks)
CREATE TABLE IF NOT EXISTS workflows (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id uuid REFERENCES apps(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL, -- manual, push, schedule, webhook, event
  trigger_config jsonb DEFAULT '{}',
  steps jsonb NOT NULL, -- Array of workflow steps
  is_active boolean DEFAULT true,
  last_run timestamptz,
  run_count integer DEFAULT 0,
  success_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workflows' AND policyname = 'Users can CRUD own workflows') THEN
        CREATE POLICY "Users can CRUD own workflows" ON workflows FOR ALL USING (
          EXISTS (SELECT 1 FROM apps WHERE apps.id = workflows.app_id AND apps.user_id = auth.uid())
        );
    END IF;
END $$;

-- 2. Create App Tasks Table (Now that workflows exists)
CREATE TABLE IF NOT EXISTS app_tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id uuid REFERENCES apps(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  title text NOT NULL,
  description text,
  task_type text DEFAULT 'manual', -- manual, automated, bug, feature, testing
  priority text DEFAULT 'medium', -- low, medium, high, critical
  status text DEFAULT 'todo', -- todo, in_progress, review, completed, cancelled
  assignee_id uuid REFERENCES profiles(id),
  due_date timestamptz,
  estimated_hours numeric,
  actual_hours numeric,
  tags text[],
  attachments text[], -- Array of file URLs
  parent_task_id uuid REFERENCES app_tasks(id), -- For subtasks
  workflow_id uuid REFERENCES workflows(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_tasks ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_tasks' AND policyname = 'Users can CRUD own app tasks') THEN
        CREATE POLICY "Users can CRUD own app tasks" ON app_tasks FOR ALL USING (
          EXISTS (SELECT 1 FROM apps WHERE apps.id = app_tasks.app_id AND apps.user_id = auth.uid())
        );
    END IF;
END $$;

-- 3. Force schema cache reload to ensure PostgREST sees the new tables
NOTIFY pgrst, 'reload schema';