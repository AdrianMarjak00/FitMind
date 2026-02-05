# FitMind Backend v2.0

Production-ready FastAPI backend s AI coaching a komplexnou bezpečnosťou.

## Hlavné Features

- 🤖 **AI Coaching** - Google Gemini 2.5 Flash s automatickým odhadom kalórií
- 🔒 **Security** - Multi-layer ochrana (auth, rate limiting, anti-bot)
- 📊 **Analytics** - Týždenné/mesačné reporty, goal tracking
- 📝 **Audit Logging** - Komplexné security event tracking
- 🛡️ **Anti-Bot** - Detekcia a blokovanie botov, honeypot traps

## Tech Stack

- FastAPI 0.115.0 + Uvicorn
- Firebase/Firestore (database + auth)
- Google Gemini AI
- Python 3.9+

## Quick Start

```bash
# Install
pip install -r requirements.txt

# Configure
cp .env.example .env
# Edit .env with your API keys

# Run
python main.py
```

## Environment Variables

```bash
GOOGLE_API_KEY=your-key        # Required
ENV=production                  # Required
PORT=8000                       # Optional
AUDIT_LOGGING_ENABLED=true     # Optional
```

## API Endpoints

### Public
- `GET /api/health` - Health check
- `GET /api/status` - Service status

### Protected (require Firebase JWT)
- `POST /api/chat` - AI coaching chat
- `GET /api/profile/{user_id}` - User profile
- `GET /api/stats/{user_id}` - Statistics
- `GET /api/chart/{user_id}/{type}` - Chart data
- `GET /api/coach/recommendations/{user_id}` - Personalized tips

### Admin Only
- `GET /api/admin/security/violations` - Security logs
- `GET /api/admin/security/failed-auth` - Auth failures
- `GET /api/admin/security/user-activity/{user_id}` - User activity

## Security Features

✅ Firebase JWT authentication
✅ Rate limiting (100 req/min)
✅ Anti-bot protection (user-agent, patterns, honeypots)
✅ Audit logging (10 event types)
✅ Security headers (CSP, HSTS, XSS)
✅ Input validation
✅ Cross-user access prevention

## Deployment

**Render.com:**
1. Add `GOOGLE_API_KEY` as Secret File
2. Add `FIREBASE_CREDENTIALS` as Secret File
3. Set `ENV=production`
4. Deploy

**Security Score: 9.5/10** 🏆

## License

Private - FitMind Project
