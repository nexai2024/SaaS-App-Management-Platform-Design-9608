/* 
# Add App Workflow Features
1. New Tables
   - `app_notes`: Notes and documentation attached to apps
   - `app_tasks`: Tasks linked to specific apps
   - `app_versions`: Version control and releases
   - `app_backups`: Backup tracking and management
   - `workflows`: Automated workflow definitions
   - `workflow_executions`: Workflow execution history
2. Security
   - Enable RLS on all new tables
   - Add owner-based access policies
*/

-- App Notes Table
CREATE TABLE IF NOT EXISTS app_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id uuid REFERENCES apps(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  title text NOT NULL,
  content text,
  note_type text DEFAULT 'general', -- general, bug, feature, idea
  tags text[], -- Array of tags for categorization
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE app_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own app notes" ON app_notes FOR ALL USING (
  EXISTS (SELECT 1 FROM apps WHERE apps.id = app_notes.app_id AND apps.user_id = auth.uid())
);

-- App Tasks Table (enhanced from existing tasks)
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
CREATE POLICY "Users can CRUD own app tasks" ON app_tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM apps WHERE apps.id = app_tasks.app_id AND apps.user_id = auth.uid())
);

-- App Versions/Releases Table
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
CREATE POLICY "Users can CRUD own app versions" ON app_versions FOR ALL USING (
  EXISTS (SELECT 1 FROM apps WHERE apps.id = app_versions.app_id AND apps.user_id = auth.uid())
);

-- App Backups Table
CREATE TABLE IF NOT EXISTS app_backups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id uuid REFERENCES apps(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  backup_name text,
  backup_type text NOT NULL, -- manual, automatic, snapshot, migration
  backup_size numeric, -- Size in bytes
  storage_location text, -- URL or path to backup
  compression_type text, -- gzip, zip, etc.
  is_encrypted boolean DEFAULT false,
  backup_date timestamptz DEFAULT now(),
  expiry_date timestamptz,
  status text DEFAULT 'active', -- active, expired, deleted, restoring
  restore_point text, -- Specific point in time or version
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE app_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own app backups" ON app_backups FOR ALL USING (
  EXISTS (SELECT 1 FROM apps WHERE apps.id = app_backups.app_id AND apps.user_id = auth.uid())
);

-- Workflows Table
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
CREATE POLICY "Users can CRUD own workflows" ON workflows FOR ALL USING (
  EXISTS (SELECT 1 FROM apps WHERE apps.id = workflows.app_id AND workflows.user_id = auth.uid())
);

-- Workflow Executions Table
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
CREATE POLICY "Users can view own workflow executions" ON workflow_executions FOR SELECT USING (
  EXISTS (SELECT 1 FROM workflows WHERE workflows.id = workflow_executions.workflow_id AND workflows.user_id = auth.uid())
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_app_notes_app_id ON app_notes(app_id);
CREATE INDEX IF NOT EXISTS idx_app_tasks_app_id ON app_tasks(app_id);
CREATE INDEX IF NOT EXISTS idx_app_versions_app_id ON app_versions(app_id);
CREATE INDEX IF NOT EXISTS idx_app_backups_app_id ON app_backups(app_id);
CREATE INDEX IF NOT EXISTS idx_workflows_app_id ON workflows(app_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);