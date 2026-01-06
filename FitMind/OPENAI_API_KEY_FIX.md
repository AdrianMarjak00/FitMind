# 🤖 Fix: OpenAI API Key Error

## ❌ Problem

The AI Chat feature is failing with error:
```
Error code: 401 - Incorrect API key provided
```

This means the OpenAI API key in `backend/.env` is either:
- Invalid
- Expired
- Not set correctly

## ✅ Solution

### Option 1: Get a Valid OpenAI API Key (Recommended)

1. Go to [OpenAI Platform](https://platform.openai.com/account/api-keys)
2. Sign in or create an account
3. Click **"Create new secret key"**
4. Copy the key (starts with `sk-proj-...` or `sk-...`)
5. Update `backend/.env`:
   ```env
   OPENAI_API_KEY=sk-proj-your-actual-key-here
   ```
6. Restart the backend:
   ```bash
   # Stop: Ctrl+C in the backend terminal
   # Start: python main.py
   ```

### Option 2: Disable AI Chat (Temporary Workaround)

If you don't need the AI chat feature right now, you can:

1. Navigate away from the AI Chat page
2. Use other features (Dashboard, Training, etc.)
3. The error only affects the `/api/chat` endpoint

## 📝 Notes

- OpenAI API keys are **paid** (after free trial)
- Free tier: $5 credit for 3 months
- GPT-3.5-turbo is cheapest (~$0.002 per 1K tokens)
- GPT-4 is more expensive (~$0.03 per 1K tokens)

## 🔍 Check Your Current Key

To verify if your key is valid, you can:

1. Go to [OpenAI Usage](https://platform.openai.com/usage)
2. Check if key is active
3. Check if you have remaining credits

## 🚀 After Fixing

1. Restart backend server
2. Go to AI Chat page
3. Send a message
4. Should get a response instead of 500 error

---

**Current Status:** ⚠️ Invalid API key  
**Impact:** AI Chat feature not working  
**Other Features:** ✅ Working fine (Dashboard, Charts, Registration, Reviews)

