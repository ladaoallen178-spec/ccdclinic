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
4. Open **Connect** and choose **Session pooler** (recommended for Render and IPv4 networks).
5. Copy the full connection string shown by Supabase. It should have this shape:
   `postgresql://postgres.<PROJECT_REF>:<URL_ENCODED_PASSWORD>@<POOLER_HOST>:5432/postgres?sslmode=require`

   In this URL, `postgres.<PROJECT_REF>` is the username and `<POOLER_HOST>` is the exact hostname shown in Supabase. Do not guess or construct the pooler host from the region; it includes a cluster index. Replace only the password placeholder. If the password contains reserved URL characters, URL-encode it.

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
   | `DATABASE_URL` | Copy the Supabase **Session pooler** URI | Keep the username, host, port, and database exactly as shown by Supabase |
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

#### Error: `ENOTFOUND` or `tenant/user postgres.<project-ref> not found`
This usually means the pooler username was entered as the hostname, or the wrong pooler endpoint was copied.

1. In Supabase, open **Connect** and select **Session pooler**.
2. Replace Render's `DATABASE_URL` with that complete connection URI. The username goes before `:` and the pooler host goes after `@`.
3. Use the pooler hostname and port shown by Supabase; do not construct the host from the project reference.
4. Save the environment variable and redeploy the Render service.

#### Error: "Certificate error" or SSL issues
**Fix**:
1. Add `?sslmode=require` to your DATABASE_URL
2. Or use `?sslmode=prefer` if require doesn't work

### Environment Variable Examples

#### Supabase Example
```
DATABASE_URL=postgresql://postgres.abc123def456:URL_ENCODED_PASSWORD@aws-1-region.pooler.supabase.com:5432/postgres?sslmode=require
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
CLIENT_URL=https://ccdclinic.vercel.app
RUST_LOG=info
```

The host above is illustrative only. Copy the complete URI from that project's **Connect → Session pooler** panel, then replace only its password placeholder. The exact host includes a pooler cluster index and cannot be inferred from the region.

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
