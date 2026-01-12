# FitMind Deployment Guide

## 🚀 Overview

This guide covers deploying the FitMind application to production, including both the Angular frontend and FastAPI backend.

## 📋 Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- Firebase project with Firestore enabled
- OpenAI API key
- Hosting platform account (recommended: Vercel for frontend, Railway/Render for backend)

## 🔧 Environment Setup

### Backend Environment Variables

Create `backend/.env` with the following:

```bash
# OpenAI API Key
OPENAI_API_KEY=sk-proj-your-actual-api-key-here

# Server Configuration
PORT=8000
ENV=production

# CORS - Add your frontend domain(s)
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://www.your-frontend-domain.com

# Optional: Rate limiting (default: 100)
RATE_LIMIT_PER_MINUTE=100
```

### Frontend Environment Variables

Update `src/environments/environment.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-backend-domain.com/api',
  backendUrl: 'https://your-backend-domain.com'
};
```

### Firebase Service Account

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project → Settings → Service Accounts
3. Click "Generate New Private Key"
4. Save as `backend/firebase-service-account.json`

**IMPORTANT:** This file should NEVER be committed to git!

## 🏗️ Backend Deployment

### Option 1: Railway (Recommended)

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Initialize Railway project:**
   ```bash
   cd backend
   railway init
   ```

3. **Configure environment variables:**
   ```bash
   railway variables set OPENAI_API_KEY="sk-proj-..."
   railway variables set ENV="production"
   railway variables set ALLOWED_ORIGINS="https://your-domain.com"
   ```

4. **Upload Firebase credentials:**
   ```bash
   # Convert to base64 and set as variable
   railway variables set FIREBASE_CREDENTIALS="$(cat firebase-service-account.json | base64)"
   ```

5. **Create `Procfile`:**
   ```
   web: uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

6. **Deploy:**
   ```bash
   railway up
   ```

### Option 2: Render

1. Create a new **Web Service** on [Render](https://render.com/)
2. Connect your GitHub repository
3. Configure:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Root Directory:** `backend`

4. Add environment variables in Render dashboard:
   - `OPENAI_API_KEY`
   - `ENV=production`
   - `ALLOWED_ORIGINS`

5. Upload `firebase-service-account.json` as a secret file

### Option 3: Manual VPS Deployment

1. **Install dependencies:**
   ```bash
   sudo apt update
   sudo apt install python3 python3-pip nginx
   ```

2. **Clone and setup:**
   ```bash
   git clone <your-repo>
   cd backend
   pip3 install -r requirements.txt
   ```

3. **Configure systemd service** (`/etc/systemd/system/fitmind.service`):
   ```ini
   [Unit]
   Description=FitMind Backend
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/path/to/backend
   Environment="PATH=/usr/bin"
   ExecStart=/usr/bin/uvicorn main:app --host 127.0.0.1 --port 8000
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

4. **Configure Nginx as reverse proxy:**
   ```nginx
   server {
       listen 80;
       server_name api.your-domain.com;

       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

5. **Enable and start:**
   ```bash
   sudo systemctl enable fitmind
   sudo systemctl start fitmind
   sudo systemctl enable nginx
   sudo systemctl restart nginx
   ```

## 🎨 Frontend Deployment

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Build production bundle:**
   ```bash
   npm run build:prod
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

4. **Configure environment:**
   - In Vercel dashboard, add environment variables if needed
   - Set build command: `npm run build:prod`
   - Set output directory: `dist/fitmind/browser`

### Option 2: Netlify

1. **Build:**
   ```bash
   npm run build:prod
   ```

2. **Deploy to Netlify:**
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod --dir=dist/fitmind/browser
   ```

3. **Configure:**
   - Create `netlify.toml`:
     ```toml
     [build]
       command = "npm run build:prod"
       publish = "dist/fitmind/browser"

     [[redirects]]
       from = "/*"
       to = "/index.html"
       status = 200
     ```

### Option 3: Firebase Hosting

1. **Install Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Initialize:**
   ```bash
   firebase init hosting
   ```

3. **Configure `firebase.json`:**
   ```json
   {
     "hosting": {
       "public": "dist/fitmind/browser",
       "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
       "rewrites": [
         {
           "source": "**",
           "destination": "/index.html"
         }
       ]
     }
   }
   ```

4. **Deploy:**
   ```bash
   npm run build:prod
   firebase deploy --only hosting
   ```

## ✅ Post-Deployment Checklist

### Backend
- [ ] Backend is accessible at configured URL
- [ ] Health check endpoint works: `GET /health`
- [ ] CORS is properly configured (test from frontend)
- [ ] Rate limiting is working
- [ ] Firebase connection is successful
- [ ] OpenAI API is responding
- [ ] Error messages don't expose sensitive information
- [ ] API documentation is disabled (`/docs` returns 404)

### Frontend
- [ ] Frontend loads without errors
- [ ] API calls reach backend successfully
- [ ] Firebase Authentication works
- [ ] All routes are accessible
- [ ] Production build is optimized (check bundle sizes)
- [ ] HTTPS is enabled
- [ ] Environment variables are correctly set

### Security
- [ ] No `.env` files in git repository
- [ ] Firebase service account is secure
- [ ] HTTPS is enforced
- [ ] Security headers are present
- [ ] Firestore rules are restrictive
- [ ] No API keys in client-side code
- [ ] Rate limiting prevents abuse

## 🔍 Testing Production Deployment

```bash
# Test backend health
curl https://your-backend.com/health

# Test frontend
curl https://your-frontend.com

# Test API from frontend origin
curl -H "Origin: https://your-frontend.com" \
     https://your-backend.com/api/admin/list

# Check security headers
curl -I https://your-backend.com
```

## 🐛 Troubleshooting

### CORS Errors
- Verify `ALLOWED_ORIGINS` includes your frontend domain
- Check that protocol (http/https) matches
- Ensure no trailing slashes in origins

### Firebase Connection Issues
- Verify `firebase-service-account.json` is uploaded
- Check Firebase project ID matches
- Review Firestore rules

### Rate Limiting Too Strict
- Adjust `RATE_LIMIT_PER_MINUTE` environment variable
- Consider implementing user-based rate limiting

### Build Failures
- Check Node.js version (18+)
- Clear cache: `npm cache clean --force`
- Delete `node_modules` and reinstall

## 📊 Monitoring

Consider adding:
- **Uptime monitoring:** UptimeRobot, Pingdom
- **Error tracking:** Sentry
- **Analytics:** Google Analytics, Plausible
- **Logging:** LogRocket, Datadog

## 🔄 Continuous Deployment

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install and Build
        run: |
          npm ci
          npm run build:prod
      - name: Deploy to Vercel
        run: npx vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

## 📞 Support

For deployment issues:
1. Check logs on your hosting platform
2. Review `SECURITY.md` for security best practices
3. Verify all environment variables are set correctly
4. Test locally with production configuration first

## 🎯 Performance Optimization

- Enable gzip/brotli compression
- Configure CDN for static assets
- Implement caching headers
- Use HTTP/2
- Minimize bundle sizes
- Enable lazy loading for routes
