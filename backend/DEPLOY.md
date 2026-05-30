# MindGlass Backend Deployment

## Goal

Run the backend on an always-on host so the frontend never depends on a laptop tunnel or a local machine staying awake.

## Recommended: Fly.io (~$2-5/month)

Cheapest option here that stays reachable 24/7 with full WebSocket support.

### 1. Install Fly CLI

```bash
# macOS
brew install flyctl

# Windows
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Linux
curl -L https://fly.io/install.sh | sh
```

### 2. Sign Up & Login

```bash
fly auth signup    # Creates account with $5 free credit
fly auth login     # Or login if you have account
```

### 3. Deploy

```bash
cd backend

# Launch (creates app, choose region like 'iad' for Virginia)
fly launch --name mindglass-backend --region iad --no-deploy

# Set secrets (your own API key and frontend URL)
fly secrets set CEREBRAS_API_KEY=your_cerebras_api_key
fly secrets set OPENROUTER_API_KEY=your_openrouter_api_key
fly secrets set FRONTEND_URL=https://frontend-nine-iota-86.vercel.app
fly secrets set DEBUG=false

# Deploy
fly deploy

# Open in browser
fly open
```

### 4. Verify

```bash
# Check health endpoint
curl https://mindglass-backend.fly.dev/api/health

# Should return: {"status": "ok", "timestamp": "..."}
```

### 5. Update Frontend

1. Go to [vercel.com](https://vercel.com) → your project → Settings → Environment Variables
2. Add: `VITE_WS_URL=wss://<your-backend-domain>/ws/debate`
3. (Optional) Add: `VITE_API_URL=https://<your-backend-domain>` for health checks/wake-ups
4. Redeploy frontend

This is the key change that removes the need for Cloudflare Tunnel, ngrok, or keeping a laptop open.

### Fly.io Config Files (Already Created)

- `fly.toml` - App configuration
- `Dockerfile` - Container build
- `.dockerignore` - Exclude files from build

---

## Alternative: Railway

1. Create a Railway service rooted at `backend/`
2. Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --ws websockets
```

3. Add env vars:
   - `CEREBRAS_API_KEY`
   - `OPENROUTER_API_KEY` (optional fallback)
   - `FRONTEND_URL`
   - `DEBUG=false`
4. Point the Vercel frontend at the Railway backend with:
   - `VITE_WS_URL=wss://<your-backend-domain>/ws/debate`
   - `VITE_API_URL=https://<your-backend-domain>`

## Alternative: Render ($7/month)

If Fly.io doesn't work for you:

1. Push code to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect GitHub repo
4. Settings:
   - **Build:** `pip install -r requirements.txt`
   - **Start:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT --ws websockets`
   - **Plan:** Standard ($7/month) for always-on WebSockets
5. Env vars:
   - `CEREBRAS_API_KEY` = your key
   - `OPENROUTER_API_KEY` = optional fallback key
   - `FRONTEND_URL` = https://prism-cerebras.vercel.app

---

## Costs

| Platform | Monthly Cost | Always On | WebSockets |
|----------|-------------|-----------|------------|
| Fly.io | ~$2-5 | Yes | Full support |
| Render | $7 | Yes | Full support |
| Railway | ~$5+ | Yes | Full support |

---

## Troubleshooting

### Fly.io "out of memory" errors
Scale up: `fly scale memory 1024`

### WebSocket connection fails
- Check `wss://` not `ws://` in Vercel env var
- Verify CORS in `app/config.py` includes your Vercel URL
- Check Fly logs: `fly logs`

### API key not working
- Verify key is set: `fly secrets list`
- Check logs for errors: `fly logs`

### Preset demos should not use model quota
- Homepage presets pass `demo=1` and stream a scripted debate from the backend.
- Custom prompts still use the live model path with Cerebras first and OpenRouter fallback when configured.
