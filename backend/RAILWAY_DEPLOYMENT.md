# Railway Deployment Guide

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Your code should be pushed to GitHub
3. **Environment Variables**: Have your API keys ready

## Step-by-Step Deployment

### 1. Connect GitHub Repository

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Select the `backend` folder as the root directory

### 2. Configure Environment Variables

In Railway dashboard, go to your project settings and add these environment variables:

```bash
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
LANDING_AI_API_KEY=your_landing_ai_api_key
```

### 3. Configure Build Settings

Railway should automatically detect your Node.js project, but you can verify:

- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Root Directory**: `backend` (if deploying from monorepo)

### 4. Domain Configuration

1. In Railway dashboard, go to your service
2. Click on "Settings" → "Networking"
3. Click "Generate Domain" to get a public URL
4. Your backend will be available at: `https://your-app-name.railway.app`

### 5. Update Frontend CORS

After deployment, update your frontend to use the Railway URL instead of localhost:

```typescript
// In your frontend code, replace:
const API_URL = 'http://localhost:3000'

// With your Railway URL:
const API_URL = 'https://your-app-name.railway.app'
```

Also update the CORS configuration in your backend if needed.

## Monitoring and Logs

1. **View Logs**: Go to Railway dashboard → Your service → "Logs" tab
2. **Monitor Performance**: Check the "Metrics" tab for CPU/memory usage
3. **Health Check**: Your app includes a health endpoint at `/health`

## Troubleshooting

### Common Issues:

1. **Build Failures**: Check if all dependencies are in `package.json`
2. **Environment Variables**: Ensure all required vars are set in Railway
3. **Port Issues**: Railway automatically sets the `PORT` environment variable
4. **File Uploads**: Railway has ephemeral storage - consider using cloud storage for persistent files

### Debugging Steps:

1. Check Railway logs for error messages
2. Verify environment variables are set correctly
3. Test endpoints using the Railway URL
4. Check if all dependencies are installed properly

## Files Created for Railway

- `railway.json` - Railway configuration
- `Dockerfile` - Container configuration (optional)
- `.railwayignore` - Files to exclude from deployment
- Health check endpoint added to `/health`

## Next Steps

1. Deploy and test your backend
2. Update frontend to use Railway URL
3. Set up monitoring and alerts
4. Consider setting up staging environment

Your backend should now be ready for Railway deployment! 🚀 