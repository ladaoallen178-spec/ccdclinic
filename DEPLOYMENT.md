Deployment guide — Frontend (Vercel) and Backend (Render)
===============================================

Overview
--
This repo contains two deployable parts:

- Frontend: `clinic-app` — a Vite React app. We configured `vercel.json` to build this directory.
- Backend: `backend` — a Rust (Axum) server with a Dockerfile. Deploy to Render as a Docker service.

Frontend — Vercel
--
1. Push your repo to GitHub (or connect your Git provider to Vercel).
2. Create a new Vercel project and point it to this repository.
   - Vercel normally detects frameworks. We added `vercel.json` to instruct Vercel to build `clinic-app` using `@vercel/static-build`.
   - If Vercel doesn't pick the right root, set Project Root to the repository root (the `vercel.json` will pick `clinic-app`).
3. Build & Output settings (if asked):
   - Build Command: leave blank (uses `@vercel/static-build` to run `npm run build` in `clinic-app`).
   - Output Directory: leave default (static-build will detect `dist`).
4. Environment Variables (set in Vercel dashboard → Settings → Environment Variables):
   - `VITE_BASE` = `/` (or `/ccdclinic/` if you intend to serve under that subpath)
   - `VITE_API_URL` = `https://<your-backend-url>` OR leave empty to use relative API calls (recommended when backend is on a separate host, set to its full URL)
5. Deploy. Vercel will run the build and publish the static `dist/` generated from `clinic-app`.

Backend — Render
--
1. In Render, create a new Web Service from the repository.
   - Use the Docker option and point to `backend/Dockerfile` (or use the `render.yaml` manifest we added).
2. Configure Environment / Secrets in Render (Dashboard → Environment):
   - `DATABASE_URL` (required)
   - `JWT_SECRET` (required)
   - `CLIENT_URL` (set to your Vercel app URL if using CORS or to the domain you serve the frontend from)
   - `RUST_LOG` (optional, default `info`)
3. Render will set the `PORT` environment variable for your service automatically — the backend reads `PORT` at runtime.
4. Build & Deploy. Render will build the Docker image using your `backend/Dockerfile` and run the container.

Notes and tips
--
- Do NOT store production secrets in the repo. Use the Vercel and Render dashboards to configure secret values.
- If you want the frontend and backend under the same origin (same domain), you can host the frontend as static assets served by the backend container. The current `backend/Dockerfile` already copies `clinic-app/dist` into `/app/public` during build. In that case set `VITE_API_URL` empty and deploy only the backend container (on Render) — the backend will serve the frontend and API on the same origin.
- If hosting frontend on Vercel and backend on Render, set `VITE_API_URL` to your Render service URL (e.g., `https://schoolclinic-backend.onrender.com`). Ensure `CLIENT_URL` (on backend) includes your Vercel URL for CORS.

Local testing
--
- Frontend:
  cd clinic-app
  npm install
  npm run build
  npm run preview

- Backend (requires Rust toolchain and Docker if you want Docker build):
  # Run locally (requires Rust + environment variables):
  cd backend
  cargo run --release

  # Or build the Docker image and run:
  docker build -t schoolclinic-backend -f backend/Dockerfile .
  docker run -e DATABASE_URL="<your-db>" -e JWT_SECRET="<secret>" -p 8000:8000 schoolclinic-backend

If you want, I can:
- Create a GitHub Actions workflow to automatically deploy frontend to Vercel and backend to Render on push to `main`.
- Deploy the backend to Render for you (I can prepare the `render.yaml` or push via Render CLI if you provide access).
