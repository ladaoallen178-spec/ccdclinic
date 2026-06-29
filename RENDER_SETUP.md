# Render Deployment Setup Guide

## Quick Start for Render

This guide will help you deploy the School Clinic application to Render.

### Prerequisites
- GitHub account with access to the repository
- Render account (free tier available)
- Database service (Supabase, Neon, or other PostgreSQL provider)

### Step 1: Create a PostgreSQL Database

Choose one of these options:

#### Option A: Supabase (Recommended)
1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Create a new project
4. Note your connection string from Project Settings → Database → Connection Pooling
5. Copy the full connection string: `postgresql://postgres:YOUR_PASSWORD@YOUR_HOST.supabase.co:5432/postgres?sslmode=require`

#### Option B: Neon
1. Go to [console.neon.tech](https://console.neon.tech)
2. Create a new project
3. Copy the connection string from the dashboard

### Step 2: Deploy Backend to Render

1. Go to [render.com](https://render.com)
2. Sign in with GitHub
3. Click **New +** → **Web Service**
4. Connect your GitHub repository
5. Fill in the configuration:
   - **Name**: `schoolclinic-backend` (or your preferred name)
   - **Region**: `Oregon` (or your preferred region)
   - **Branch**: `main`
   - **Runtime**: `Docker`
   - **Build Command**: Leave empty
   - **Start Command**: Leave empty

6. Click **Create Web Service**

### Step 3: Configure Environment Variables

**This is the critical step that fixes the deployment errors!**

1. In Render dashboard, go to your service → **Environment**
2. Add these environment variables:

   | Key | Value | Notes |
   |-----|-------|-------|
   | `DATABASE_URL` | `postgresql://postgres:YOUR_PASSWORD@YOUR_HOST.supabase.co:5432/postgres?sslmode=require` | Your database connection string (include ?sslmode=require) |
   | `JWT_SECRET` | `<generate-random-32-char-hex>` | Run: `openssl rand -hex 32` to generate |
   | `CLIENT_URL` | `https://YOUR_VERCEL_URL` | Your Vercel frontend URL (e.g., https://ccdclinic.vercel.app) |
   | `RUST_LOG` | `info` | Optional logging level |

3. **Save** the environment variables

### Step 4: Deploy Frontend to Vercel (Optional)

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click **Add New** → **Project**
4. Import your repository
5. Set up environment variables:
   - `VITE_API_URL`: `https://schoolclinic-backend.onrender.com` (your Render service URL)

### Step 5: Monitor Deployment

1. In Render dashboard, watch the **Build & Deploy** logs
2. If deployment fails, check the logs for DATABASE_URL errors
3. If you see "password authentication failed", double-check your DATABASE_URL credentials

### Troubleshooting

#### Error: "DATABASE_URL must be set"
**Fix**: Add DATABASE_URL to Render Environment variables (Step 3)

#### Error: "password authentication failed for user postgres"
**Causes**:
- Wrong password in DATABASE_URL
- DATABASE_URL not properly formatted
- Database user doesn't exist

**Fix**:
1. Copy the exact connection string from your database provider
2. Verify the password is correct (no special characters that need escaping)
3. Verify the database is running
4. Test locally first with the same DATABASE_URL

#### Error: "connection refused"
**Fix**: 
1. Ensure your database is accessible from Render servers
2. Check firewall/network rules in your database provider
3. Verify the host and port in DATABASE_URL

#### Error: "Certificate error" or SSL issues
**Fix**:
1. Add `?sslmode=require` to your DATABASE_URL
2. Or use `?sslmode=prefer` if require doesn't work

### Environment Variable Examples

#### Supabase Example
```
DATABASE_URL=postgresql://postgres:abc123def456ghi@db.abc123def456.supabase.co:5432/postgres?sslmode=require
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
CLIENT_URL=https://ccdclinic.vercel.app
RUST_LOG=info
```

#### Neon Example
```
DATABASE_URL=postgresql://user:password@ep-random-id.us-east-1.neon.tech/dbname?sslmode=require
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
CLIENT_URL=https://ccdclinic.vercel.app
RUST_LOG=info
```

### Local Testing

Before deploying to Render, test locally:

1. Create `.env` file in the project root (copy from `.env.example`)
2. Fill in your DATABASE_URL and JWT_SECRET
3. Run the backend:
   ```bash
   cd backend
   cargo run
   ```
4. Should see: `Server listening on http://0.0.0.0:8000`

### Support

- Check logs in Render dashboard: Your Service → Logs
- Enable debug logging: Set `RUST_LOG=debug` (use sparingly, can be verbose)
- Review this file for common issues
- Check GitHub repository for updates

---

**Last Updated**: 2026-06-29
