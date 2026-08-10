# SaaS Management Platform

## Overview
The **SaaS Management Platform** is a robust, all-in-one command center designed for founders, indie hackers, and product teams to build, manage, and scale software applications. It consolidates the fragmented workflow of building a startup—replacing scattered spreadsheets, notion docs, and task managers with a single, integrated system.

From tracking revenue and sales to managing technical documentation, marketing assets, and development tasks, this platform provides a unified view of your product's lifecycle. It features enterprise-grade security with Row Level Security (RLS) and client-side encryption for sensitive data.

## Key Features

### 🚀 Application Lifecycle Management
- **Centralized Dashboard**: View real-time stats for all your apps, including total revenue, active users, and growth rates.
- **Tech Stack Tracking**: Document and manage the technologies, frameworks, and libraries used in each project.
- **Version Control**: Log releases (SemVer), changelogs, commit hashes, and build URLs to keep a history of your product's evolution.
- **Backup Management**: Track backup sets, storage locations, and restoration points.

### 📝 Content & Marketing Engine
- **Intelligent JSON Import**: Bootstrap entire project structures, including marketing strategies and artifacts, by importing a single JSON file.
- **Marketing Artifacts**: structured management for:
  - **Core Messaging**: Taglines, one-liners, and value props.
  - **Ideal Customer Profiles (ICPs)**: Detailed persona mapping with pain points.
  - **Copywriting**: Website hero sections, feature descriptions, and email sequences.
  - **Sales Assets**: Elevator pitches (short/medium/long) and investor materials.
- **Rich Text Editing**: Full-screen editor for drafting and refining content directly within the platform.
- **Asset Library**: Store and organize images, documents, and external links.

### 🔒 Security & Documentation
- **Secure Notes**: A robust note-taking system for ideas, requirements, and documentation.
- **Client-Side Encryption**: **AES-256 encryption** for sensitive notes. Users can encrypt specific notes with a custom password, ensuring that even if the database is compromised, the content remains unreadable without the key.
- **Tagging & Pinning**: Organize documentation with custom tags and pin critical information to the top.

### 💰 Sales & Revenue
- **Revenue Analytics**: Visual charts tracking monthly revenue trends (`recharts` integration).
- **Sales Ledger**: Record individual sales transactions, link them to specific customers, and track status.
- **Pricing Strategy**: Define pricing plans (Tiers), feature lists, and monthly/yearly rates.

### ✅ Task & Workflow Management
- **Kanban/List Views**: Manage development tasks with status tracking (Todo, In Progress, Done).
- **Workflows**: Define automated or manual workflow steps (triggers, actions) for repetitive processes.
- **Team Collaboration**: Assign tasks to team members and track progress.

### 👥 Team & Access
- **Team Management**: Invite members, assign roles, and track activity.
- **Row Level Security (RLS)**: Built on Supabase Auth, ensuring that data is strictly isolated. Users can only access data they own or are explicitly granted access to.

## Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Encryption**: Crypto-js (AES)
- **UI Components**: Framer Motion (animations), React Icons, Recharts
- **Date Handling**: date-fns

## Getting Started
1. **Install Dependencies**: `npm install`
2. **Start Development Server**: `npm run dev`
3. **Build for Production**: `npm run build`