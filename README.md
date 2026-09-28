# OpsNexus Enterprise Company Management & Operations System

A full-stack enterprise platform engineered for centralized organizational management, workforce administration, project distribution, task workflows, attendance telemetry, payroll calculation, overtime approvals, internal company email, real-time team chat, file vault, and audit compliance.

---

## 🚀 Quick Deployment Guide: GitHub & Vercel

This repository is pre-configured with complete configuration files for immediate deployment to **GitHub** and **Vercel**.

### 1. Pushing to GitHub

Run the following commands in your terminal:

```bash
# Initialize git repository (if not already initialized)
git init

# Add all files (all necessary configurations and .gitignore are pre-configured)
git add .

# Create initial commit
git commit -m "feat: complete OpsNexus enterprise platform with GitHub & Vercel support"

# Rename default branch to main
git branch -M main

# Add your GitHub remote repository URL
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPOSITORY_NAME>.git

# Push to GitHub
git push -u origin main
```

> **Automated CI/CD**: A GitHub Actions workflow (`.github/workflows/ci.yml`) is included. Every push or pull request to `main` will automatically execute type checking and verify that production build succeeds without issues.

---

### 2. Hosting on Vercel

OpsNexus includes native Vercel configuration (`vercel.json` and `/api/index.ts` serverless handler) to run both the React SPA frontend and the Express REST API backend seamlessly on Vercel.

#### Option A: Deploy via Vercel Web Dashboard (Recommended)
1. Go to [Vercel](https://vercel.com) and sign in.
2. Click **"Add New..."** -> **"Project"**.
3. Select your GitHub repository (`OpsNexus`).
4. Vercel will automatically detect:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**, add the following:
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: `your_random_production_jwt_secret_key` (generate any long random string)
   - `JWT_REFRESH_SECRET`: `your_random_production_refresh_secret_key`
   - *(Optional)* `SUPABASE_URL`: Your Supabase Project URL
   - *(Optional)* `SUPABASE_ANON_KEY`: Your Supabase Anon Key
   - *(Optional)* `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key
6. Click **Deploy**. Vercel will build the frontend into `dist/` and mount all `/api/*` endpoints via Serverless Functions!

#### Option B: Deploy via Vercel CLI
```bash
# Install Vercel CLI globally (if not already installed)
npm install -g vercel

# Log in and deploy
vercel

# Deploy to production
vercel --prod
```

---

## 🔑 Initial Administrator Credentials

When the platform boots for the first time:
- **Username**: `admin`
- **Password**: `admin`

*Note: On your first login, the platform will prompt you to set a new permanent password (minimum 8 characters) to unlock the full administrative dashboard.*

---

## ⚙️ Vercel Architecture Details

| Component | Path | Vercel Handling |
| :--- | :--- | :--- |
| **Frontend** | `/src` | Compiled with `vite build` to `/dist` and served through global CDN. |
| **API Backend** | `/server` & `/api/index.ts` | Executed as Vercel Serverless Functions on Node.js runtime. |
| **Routing** | `vercel.json` | Rewrites `/api/(.*)` to `/api` serverless handler, and SPA routes `/(.*)` to `/index.html`. |
| **Data Engine** | Embedded & Supabase | Auto-detects serverless filesystem; seamlessly reads seed data and saves state, with direct plug-and-play Supabase PostgreSQL connection. |

---

## 🛠️ Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start full-stack development server (Express API + Vite HMR)
npm run dev

# 3. Open in browser
# http://localhost:3000

# 4. Check TypeScript types and lint
npm run lint

# 5. Build for production locally
npm run build
```

---

## 📁 Repository Structure

```
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI for automated build & lint checks
├── api/
│   └── index.ts                 # Vercel Serverless Function entry point
├── database/                    # Complete Supabase PostgreSQL SQL migrations
│   ├── schema.sql
│   ├── policies.sql
│   └── functions.sql
├── data/
│   └── opsnexus.db.json         # Seed database store with roles, permissions, & admin account
├── server/
│   ├── app.ts                   # Core Express application (shared across local & Vercel)
│   ├── config/                  # Configuration & Supabase client integration
│   ├── controllers/             # REST controllers for all modules
│   ├── db/                      # Database interface (embedded + Supabase bridge)
│   ├── middleware/              # JWT auth and RBAC guards
│   └── routes/                  # Express API routes
├── src/                         # React 19 Frontend application
│   ├── components/              # Shared UI components, layout, nav, modals
│   ├── context/                 # AuthContext and state management
│   ├── pages/                   # Application views (Dashboard, Attendance, Tasks, etc.)
│   └── services/                # API client with automatic token refresh
├── .env.example                 # Environment variables blueprint
├── .gitignore                   # Configured git exclusions for node, build, vercel, env
├── vercel.json                  # Vercel deployment configuration
├── package.json                 # Scripts and dependencies
├── server.ts                    # Local & container server entry point
└── vite.config.ts               # Vite bundler configuration
```
