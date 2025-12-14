/* 
# Fix Missing Tables and Order Dependencies
1. Changes
   - Create `workflows` table FIRST (referenced by app_tasks)
   - Create `app_tasks` table SECOND (references workflows)
   - Ensure `app_notes`, `app_versions`, `app_backups`, `workflow_executions` exist
2. Security
   - Enable RLS and policies for all tables
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

-- 3. Ensure other tables exist (App Notes)
CREATE TABLE IF NOT EXISTS app_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id uuid REFERENCES apps(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  title text NOT NULL,
  content text,
  note_type text DEFAULT 'general', -- general, bug, feature, idea
  tags text[],
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_notes ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_notes' AND policyname = 'Users can CRUD own app notes') THEN
        CREATE POLICY "Users can CRUD own app notes" ON app_notes FOR ALL USING (
          EXISTS (SELECT 1 FROM apps WHERE apps.id = app_notes.app_id AND apps.user_id = auth.uid())
        );
    END IF;
END $$;

-- 4. Ensure App Versions exists
CREATE TABLE IF NOT EXISTS app_versions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id uuid REFERENCES apps(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  version_number text NOT NULL,
  version_type text NOT NULL, -- major, minor, patch, hotfix
  release_notes text,
  changelog text,
  commit_hash text,
  branch text,
  build_url text,
  status text DEFAULT 'development', -- development, testing, staging, production, archived
  release_date timestamptz,
  is_current boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_versions' AND policyname = 'Users can CRUD own app versions') THEN
        CREATE POLICY "Users can CRUD own app versions" ON app_versions FOR ALL USING (
          EXISTS (SELECT 1 FROM apps WHERE apps.id = app_versions.app_id AND apps.user_id = auth.uid())
        );
    END IF;
END $$;

-- 5. Ensure App Backups exists
CREATE TABLE IF NOT EXISTS app_backups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id uuid REFERENCES apps(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  backup_name text,
  backup_type text NOT NULL, -- manual, automatic, snapshot, migration
  backup_size numeric,
  storage_location text,
  compression_type text,
  is_encrypted boolean DEFAULT false,
  backup_date timestamptz DEFAULT now(),
  expiry_date timestamptz,
  status text DEFAULT 'active', -- active, expired, deleted, restoring
  restore_point text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE app_backups ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_backups' AND policyname = 'Users can CRUD own app backups') THEN
        CREATE POLICY "Users can CRUD own app backups" ON app_backups FOR ALL USING (
          EXISTS (SELECT 1 FROM apps WHERE apps.id = app_backups.app_id AND apps.user_id = auth.uid())
        );
    END IF;
END $$;

-- 6. Ensure Workflow Executions exists
CREATE TABLE IF NOT EXISTS workflow_executions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id uuid REFERENCES workflows(id) ON DELETE CASCADE,
  app_id uuid REFERENCES apps(id) ON DELETE CASCADE,
  status text DEFAULT 'running', -- running, completed, failed, cancelled
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  execution_data jsonb DEFAULT '{}',
  error_message text,
  steps_completed integer DEFAULT 0,
  total_steps integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workflow_executions' AND policyname = 'Users can view own workflow executions') THEN
        CREATE POLICY "Users can view own workflow executions" ON workflow_executions FOR SELECT USING (
          EXISTS (SELECT 1 FROM workflows WHERE workflows.id = workflow_executions.workflow_id AND workflows.user_id = auth.uid())
        );
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_app_notes_app_id ON app_notes(app_id);
CREATE INDEX IF NOT EXISTS idx_app_tasks_app_id ON app_tasks(app_id);
CREATE INDEX IF NOT EXISTS idx_app_versions_app_id ON app_versions(app_id);
CREATE INDEX IF NOT EXISTS idx_app_backups_app_id ON app_backups(app_id);
CREATE INDEX IF NOT EXISTS idx_workflows_app_id ON workflows(app_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);