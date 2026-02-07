# Security Best Practices - FitMind

## 🔒 Environment Variables & Secrets Management

### Critical Files to Protect

**NEVER commit these files to git:**
- `backend/.env` - Contains Google Gemini API key and other secrets
- `backend/firebase-service-account*.json` - Firebase admin credentials
- Any files matching `*-key.json` or `*.pem`

### Setup Instructions

1. **Backend Environment Variables**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and add your actual API keys
   ```

2. **Google Gemini API Key**
   - Get your API key from: https://aistudio.google.com/
   - Add to `backend/.env`: `GOOGLE_API_KEY=your-gemini-key-here`

3. **Firebase Service Account**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project → Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save as `backend/firebase-service-account.json`
   - **IMPORTANT:** This file is automatically gitignored

## 🛡️ CORS Configuration

### Development
```bash
ALLOWED_ORIGINS=http://localhost:4200
```

### Production
```bash
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

**Never use wildcard (`*`) origins with credentials enabled in production!**

## 🔐 API Security

### Rate Limiting
The backend implements rate limiting to prevent abuse:
- Default: 100 requests per minute per IP
- Configurable via environment variables

### Authentication
- All user-specific endpoints require authentication
- Firebase Authentication is used for user identity
- Admin endpoints have additional authorization checks

## 🚀 Production Deployment Checklist

- [ ] Create `.env` file with production values
- [ ] Set `ENV=production` in `.env`
- [ ] Configure `ALLOWED_ORIGINS` with your production domain
- [ ] Set secure `PORT` (default: 8000)
- [ ] Upload Firebase service account JSON securely
- [ ] Enable HTTPS on your hosting platform
- [ ] Review Firestore security rules
- [ ] Test all endpoints with production configuration

## 📋 Firebase Security Rules

Current security model:
- **Users**: Read/write only own profile
- **Reviews**: Public read, authenticated write, owner edit/delete
- **Admin**: Read-only access to admin status
- **Catch-all**: Deny by default

Review `firestore.rules` before deploying to production.

## ⚠️ Common Security Mistakes to Avoid

1. ❌ Committing `.env` files to git
2. ❌ Using wildcard CORS origins with credentials
3. ❌ Exposing stack traces in production errors
4. ❌ Not implementing rate limiting
5. ❌ Hardcoding API keys in source code
6. ❌ Not validating user inputs
7. ❌ Using overly permissive Firestore rules

## 🔍 Security Audit Commands

```bash
# Check for secrets in git history
git log -p | grep -i "api.key\|secret\|password"

# Audit npm dependencies
npm audit

# Check for hardcoded secrets
grep -r "sk-proj-\|AIza" src/
```

## 📞 Security Incident Response

If you accidentally commit secrets:
1. **Immediately rotate** all exposed credentials
2. Remove from git history using `git filter-branch` or BFG Repo-Cleaner
3. Force push to remote (coordinate with team)
4. Review access logs for unauthorized usage

## 🔗 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Firebase Security Rules Guide](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
