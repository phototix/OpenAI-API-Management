# API Key Dashboard - Proxy Server

## Quick Start

### Windows
```bash
start-server.bat
```

### Linux/Mac
```bash
npm install
npm start
```

Then open: **http://localhost:3000**

## What This Does

The proxy server solves CORS issues by:
1. **Serving your dashboard** on `http://localhost:3000`
2. **Proxying API requests** through `http://localhost:3000/proxy_api`
3. **Auto-configuring** the dashboard to use the internal proxy

## Features

### Automatic Proxy Detection
The dashboard automatically detects and uses the internal proxy endpoint when running through this server. No manual configuration needed!

### Manual Proxy Configuration
If you want to use an external proxy instead:
```javascript
localStorage.setItem('cors_proxy', 'https://corsproxy.io/?{url}')
```

### Proxy Endpoint
```
GET/POST http://localhost:3000/proxy_api?url=<encoded_target_url>
```

Example:
```
http://localhost:3000/proxy_api?url=https%3A%2F%2Fserpapi.com%2Faccount%3Fapi_key%3Dxxx
```

## Supported Providers

With this proxy, all providers work without CORS issues:
- ✅ OpenAI
- ✅ Anthropic (Claude)
- ✅ DeepSeek
- ✅ Moonshot (KIMI)
- ✅ Grok (xAI)
- ✅ Google AI Studio
- ✅ **SerpAPI** (requires proxy)

## Configuration

### Change Port
Set the `PORT` environment variable:
```bash
# Windows
set PORT=8080 && npm start

# Linux/Mac
PORT=8080 npm start
```

### Production Deployment
For production, update CORS settings in `proxy-server.js`:
```javascript
app.use(cors({
  origin: 'https://yourdomain.com',  // Restrict to your domain
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## Security Notes

⚠️ **Important:**
- The default configuration allows CORS from any origin (`origin: '*'`)
- In production, restrict `origin` to your specific domain
- API keys are never stored on the server - they're sent directly from browser to target APIs
- The proxy only forwards requests; it doesn't log or store any data

## Troubleshooting

### Port Already in Use
Change the port:
```bash
set PORT=3001
npm start
```

### Dependencies Not Installing
Make sure Node.js is installed:
```bash
node --version
npm --version
```

Install Node.js from: https://nodejs.org/

### Proxy Not Working
1. Check server is running: http://localhost:3000/health
2. Check browser console for errors
3. Clear localStorage and reload: `localStorage.clear()`

## Architecture

```
Browser (Dashboard)
    ↓
Internal Proxy (http://localhost:3000/proxy_api)
    ↓
External API (OpenAI, SerpAPI, etc.)
```

The proxy:
1. Receives request from dashboard
2. Forwards it to the target API with proper headers
3. Returns the response back to the dashboard
4. Adds CORS headers to allow browser access

## Files

- `proxy-server.js` - Main proxy server code
- `package.json` - Node.js dependencies
- `start-server.bat` - Windows startup script
- `app.js` - Dashboard (auto-detects proxy)
- `index.html` - Dashboard UI

## License

MIT
