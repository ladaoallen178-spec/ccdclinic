# GitHub Actions Auto-Deploy Setup

This workflow automatically deploys your backend to Render and frontend to Vercel when you push to the `main` branch.

## Required GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

### For Render (Backend)

1. **RENDER_SERVICE_ID**
   - Found in Render dashboard URL: `https://dashboard.render.com/services/srv-xxxxx`
   - Copy the `srv-xxxxx` part

2. **RENDER_DEPLOY_KEY**
   - Go to Render Dashboard → Account Settings → API Keys
   - Create a new API key and copy it

### For Vercel (Frontend)

1. **VERCEL_TOKEN**
   - Go to Vercel dashboard → Settings → Tokens
   - Create a new token with deployment permissions
   - Copy the token

2. **VERCEL_TEAM_ID**
   - In Vercel dashboard URL: `https://vercel.com/teams/[team-id]/...`
   - Or run: `vercel whoami --token [your-token]` to find it

3. **VERCEL_REPO_ID**
   - In Vercel project settings → Git integration
   - Copy the Repository ID

## How to Add Secrets to GitHub

1. Go to your repository on GitHub
2. Click **Settings**
3. Click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each secret one at a time
6. Once all are added, the workflow is ready

## Testing the Workflow

1. Make a small change to your code
2. Push to `main`: `git push origin main`
3. Go to **GitHub** → **Actions** tab
4. Watch the workflow run
5. Check Render and Vercel dashboards to confirm deployment

## Notes

- The workflow runs on every push to `main`
- Both Render and Vercel deployments happen in parallel
- Check GitHub Actions logs if deployment fails
- If a deployment fails, fix the issue and push again
