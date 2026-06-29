# CORS & Deployment Configuration Guide

## Problem Summary

The application was experiencing CORS errors with the error:
```
Access-Control-Allow-Origin: https://ccdclinic.vercel.app
```

While the actual frontend was deployed at:
```
https://ccdclinic-git-main-clarence-ccd.vercel.app
```

**Root Causes:**
1. Backend `CLIENT_URL` was hardcoded in `docker-compose.yml` to old frontend URL
2. Render deployment didn't have `CLIENT_URL` environment variable configured
3. Frontend API URL not properly configured - fell back to wrong URL
4. `localhost:8001` hardcoded in frontend instead of correct port `8000`
5. Dockerfile exposed wrong port

## Deployment Architecture

```
┌─────────────────────────────────────┐
│     Frontend (Vercel)               │
│  https://ccdclinic.vercel.app       │
│  https://ccdclinic-git-*.vercel.app │
│  (with VITE_API_URL env var set)    │
└──────────┬──────────────────────────┘
           │
           │ POST /login (CORS preflight)
           │
           v
┌─────────────────────────────────────┐
│     Backend (Render)                │
│  https://ccdclinic.onrender.com     │
│  (with CLIENT_URL env var set)      │
│  Port: 8000                         │
│                                     │
│  CORS headers configured to match   │
│  all frontend origins               │
└─────────────────────────────────────┘
```

## Fix Summary

### 1. Backend CORS Configuration (✓ Fixed)
**File: `backend/src/engine.rs`**

**Changes:**
- Enhanced CORS to handle multiple origins from `CLIENT_URL` (comma-separated)
- Added automatic development origins for local testing
- Improved error handling with logging
- Allow `PUT` and `DELETE` methods in addition to GET/POST
- Support for OPTIONS preflight requests

**How it works:**
```rust
// CLIENT_URL=https://ccdclinic.vercel.app,https://ccdclinic-git-main-*.vercel.app,http://localhost:5173
// Results in CORS allowing all three origins
```

### 2. Remove Hardcoded URLs (✓ Fixed)
**File: `docker-compose.yml`**

**Before:**
```yaml
environment:
  DATABASE_URL: postgresql://postgres.bjhvwegcauvpjzsgkkeu:...
  SUPABASE_URL: https://bjhvwegcauvpjzsgkkeu.supabase.co
  CLIENT_URL: https://ccdclinic.vercel.app  # ❌ HARDCODED
```

**After:**
```yaml
# Uses .env file for configuration
# Environment variables set in Render dashboard
```

### 3. Frontend API URL Configuration (✓ Fixed)
**File: `clinic-app/src/services/api.ts`**

**Before:**
```typescript
const API_BASE_URLS = apiUrl
  ? [apiUrl]
  : import.meta.env.DEV
  ? ['http://localhost:8001']  // ❌ WRONG PORT
  : [typeof window !== 'undefined' ? window.location.origin : ''];  // ❌ WRONG - uses frontend URL
```

**After:**
```typescript
// Priority:
// 1. VITE_API_URL (highest priority)
// 2. VITE_BACKEND_URL (fallback)
// 3. http://localhost:8000 (local dev)
// 4. window.location.origin (last resort with warning)
```

### 4. Add Frontend Environment Files (✓ Fixed)
**Files Created:**
- `clinic-app/.env.example` - Template for frontend env vars
- `clinic-app/.env.local` - Local dev configuration

**Content:**
```env
VITE_API_URL=http://localhost:8000
VITE_BASE=/
```

### 5. Update Render Configuration (✓ Fixed)
**File: `render.yaml`**

**Changes:**
- Added default value for `CLIENT_URL` with examples
- Enhanced documentation with deployment checklist
- Added CORS error troubleshooting guide

### 6. Update Vercel Configuration (✓ Fixed)
**File: `vercel.json`**

**Changes:**
- Added documentation for `VITE_API_URL` environment variable
- Added documentation for `VITE_BACKEND_URL` environment variable

### 7. Environment Variable Documentation (✓ Fixed)
**File: `.env.example`**

**Changes:**
- Clear examples for all environments
- Comma-separated list support for CLIENT_URL
- Documentation for Vercel preview deployments

### 8. Fix Docker Port (✓ Fixed)
**File: `Dockerfile`**

**Changed:**
```dockerfile
EXPOSE 8001  # ❌ Wrong
# to
EXPOSE 8000  # ✓ Correct
```

## Deployment Instructions

### For Backend (Render)

1. **Go to Render Dashboard** → Your Service → Environment

2. **Add/Update Environment Variables:**

   | Variable | Value | Example |
   |----------|-------|---------|
   | `DATABASE_URL` | Your PostgreSQL connection string | `postgresql://postgres:pwd@host:5432/db?sslmode=require` |
   | `JWT_SECRET` | Random 32-char hex (use: `openssl rand -hex 32`) | `a1b2c3d4e5f6...` |
   | `CLIENT_URL` | Your Vercel frontend URL(s), comma-separated | `https://ccdclinic.vercel.app,https://ccdclinic-git-main-*.vercel.app,http://localhost:5173` |
   | `RUST_LOG` | Logging level | `info` |

3. **Critical: CLIENT_URL Configuration**
   - Add your main Vercel deployment: `https://ccdclinic.vercel.app`
   - Add preview deployments pattern: `https://ccdclinic-git-*.vercel.app`
   - Add local dev URLs for testing: `http://localhost:5173,http://localhost:3000`
   - **Comma-separated with NO spaces**

4. **Redeploy** - Render will automatically pick up new environment variables

### For Frontend (Vercel)

1. **Go to Vercel Dashboard** → Your Project → Settings → Environment Variables

2. **Add Environment Variable:**
   - **Name:** `VITE_API_URL`
   - **Value:** `https://ccdclinic.onrender.com` (your Render backend URL)
   - **Environments:** Production, Preview, Development

3. **(Optional) Add Fallback:**
   - **Name:** `VITE_BACKEND_URL`
   - **Value:** `https://ccdclinic.onrender.com`

4. **Redeploy** from Git or manually trigger deployment

### For Local Development

1. **Backend:**
   ```bash
   cd backend
   # .env.local already configured with:
   # - DATABASE_URL pointing to local/remote DB
   # - CLIENT_URL=http://localhost:5173
   # - PORT=8000
   cargo run
   ```

2. **Frontend:**
   ```bash
   cd clinic-app
   # .env.local already configured with:
   # - VITE_API_URL=http://localhost:8000
   npm install
   npm run dev
   ```

## Verification Checklist

### ✓ Backend Ready

- [ ] `render.yaml` has DATABASE_URL, JWT_SECRET, CLIENT_URL in environment section
- [ ] Render dashboard shows all environment variables are set
- [ ] Backend service status shows "Live" or "Running"
- [ ] Health check passes: `curl https://ccdclinic.onrender.com/healthz`

### ✓ Frontend Ready

- [ ] Vercel project has VITE_API_URL set to Render backend URL
- [ ] Frontend builds successfully: `npm run build`
- [ ] Frontend environment shows env vars are available

### ✓ CORS Configured

- [ ] CLIENT_URL on Render matches your Vercel frontend URL
- [ ] Multiple origins supported (main + preview deployments)
- [ ] OPTIONS preflight requests return 200 with CORS headers

### ✓ Login Works End-to-End

1. Visit: `https://ccdclinic-git-main-*.vercel.app/login`
2. Open Browser Console → Network tab
3. Enter credentials and submit
4. Check for:
   - OPTIONS request to `/login` returns 200 (preflight)
   - POST request to `/login` succeeds
   - Response has `Access-Control-Allow-Origin` header matching your domain
   - No "Failed to fetch" errors
   - Token is received and stored
   - Dashboard loads successfully

## Debugging CORS Errors

### Error: "Failed to fetch"

**Check:**
1. Browser Console → Network tab
2. Find the failing request (usually OPTIONS preflight)
3. Check Response Headers for `Access-Control-Allow-Origin`
4. If missing or wrong: Check `CLIENT_URL` in Render environment

**Solution:**
1. Copy exact frontend URL from browser
2. Add it to `CLIENT_URL` in Render environment
3. Redeploy backend

### Error: "Access-Control-Allow-Origin: wrong-url"

**Fix:**
1. Go to Render dashboard
2. Find `CLIENT_URL` variable
3. Update to correct value (comma-separated for multiple):
   ```
   https://ccdclinic.vercel.app,https://ccdclinic-git-main-*.vercel.app
   ```
4. Save and redeploy

### Error: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Fix:**
1. Ensure `CLIENT_URL` is set (not empty) in Render
2. Ensure it includes your exact frontend domain
3. Check backend logs for CORS configuration

### Error: "OPTIONS request returns 405 Method Not Allowed"

**Fix:**
- Backend CORS layer should handle OPTIONS automatically
- If not working, verify `CorsLayer` is configured in `backend/src/engine.rs`
- Check RUST_LOG for errors

## Environment Variables Reference

### Backend (Render)

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | PostgreSQL connection string with credentials |
| `JWT_SECRET` | Yes | Random secret for token signing |
| `CLIENT_URL` | Yes* | Comma-separated frontend URL(s), essential for CORS |
| `RUST_LOG` | No | Default: `info` |
| `PORT` | No | Set by Render automatically (8000) |

*Without CLIENT_URL, backend uses permissive CORS (allows all origins) but logs a warning

### Frontend (Vercel)

| Variable | Required | Notes |
|----------|----------|-------|
| `VITE_API_URL` | Yes | Backend URL for API requests |
| `VITE_BACKEND_URL` | No | Fallback backend URL |
| `VITE_BASE` | No | Base path for routing (default: `/`) |

## Files Changed

1. ✓ `backend/src/engine.rs` - Enhanced CORS configuration
2. ✓ `docker-compose.yml` - Removed hardcoded URLs
3. ✓ `clinic-app/src/services/api.ts` - Fixed API URL logic
4. ✓ `clinic-app/.env.example` - Frontend env template
5. ✓ `clinic-app/.env.local` - Frontend local config
6. ✓ `clinic-app/src/vite-env.d.ts` - Added VITE_BACKEND_URL type
7. ✓ `render.yaml` - Enhanced documentation and defaults
8. ✓ `vercel.json` - Added env var documentation
9. ✓ `.env.example` - Enhanced with all env vars
10. ✓ `Dockerfile` - Fixed exposed port (8001 → 8000)

---

**Last Updated:** 2026-06-29
**Status:** All CORS issues fixed and deployment ready
