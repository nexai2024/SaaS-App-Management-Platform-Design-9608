/* 
# Initial Schema Setup
1. New Tables
   - `profiles`: Extends auth.users with app-specific user data
   - `apps`: Core application data (tech stack, status, revenue stats)
   - `pricing_plans`: Pricing tiers linked to apps
   - `marketing_materials`: Assets linked to apps
   - `sales`: Transaction records linked to apps
   - `team_members`: Team management linked to the account owner
   - `tasks`: Task tracking linked to apps/users
2. Security
   - Enable RLS on all tables
   - Add policies for owner-based access
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  role text,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Apps table
CREATE TABLE IF NOT EXISTS apps (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  name text NOT NULL,
  description text,
  status text DEFAULT 'Development',
  tech_stack text[], -- Array of strings
  repository text,
  domain text,
  landing_page text,
  users_count integer DEFAULT 0,
  revenue numeric DEFAULT 0,
  growth_rate numeric DEFAULT 0,
  growth_type text DEFAULT 'neutral', -- positive, negative, neutral
  specifications jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own apps" ON apps FOR ALL USING (auth.uid() = user_id);

-- Pricing Plans
CREATE TABLE IF NOT EXISTS pricing_plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id uuid REFERENCES apps(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric DEFAULT 0,
  features text[],
  created_at timestamptz DEFAULT now()
);
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own plans" ON pricing_plans FOR ALL USING (
  EXISTS (SELECT 1 FROM apps WHERE apps.id = pricing_plans.app_id AND apps.user_id = auth.uid())
);

-- Marketing Materials
CREATE TABLE IF NOT EXISTS marketing_materials (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id uuid REFERENCES apps(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text, -- 'image', 'document'
  url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE marketing_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own materials" ON marketing_materials FOR ALL USING (
  EXISTS (SELECT 1 FROM apps WHERE apps.id = marketing_materials.app_id AND apps.user_id = auth.uid())
);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id uuid REFERENCES apps(id) ON DELETE CASCADE,
  customer_name text,
  plan_name text,
  amount numeric,
  status text DEFAULT 'Completed',
  date timestamptz DEFAULT now()
);
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own sales" ON sales FOR ALL USING (
  EXISTS (SELECT 1 FROM apps WHERE apps.id = sales.app_id AND apps.user_id = auth.uid())
);

-- Team Members
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id uuid REFERENCES profiles(id) NOT NULL,
  name text NOT NULL,
  email text,
  role text,
  status text DEFAULT 'Active',
  avatar_url text,
  projects text[], -- Array of app names or IDs
  last_active text DEFAULT 'Just now',
  joined_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own team" ON team_members FOR ALL USING (auth.uid() = owner_id);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  title text NOT NULL,
  app_name text, 
  assignee_name text,
  priority text DEFAULT 'medium',
  status text DEFAULT 'pending',
  due_date timestamptz,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);