# Quick Start - Proxy Server

## Running with Built-in Proxy (Recommended)

This solves CORS issues for all providers, especially SerpAPI.

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

## What You Get

✅ **No CORS issues** - All API providers work seamlessly  
✅ **Auto-configuration** - Dashboard automatically uses the proxy  
✅ **Static file serving** - Includes the full dashboard  
✅ **SerpAPI support** - Works out of the box  

## Files Created

- `proxy-server.js` - Node.js/Express proxy server
- `package.json` - Dependencies configuration
- `start-server.bat` - Windows startup script
- `PROXY_README.md` - Detailed proxy documentation

## For More Details

See [PROXY_README.md](PROXY_README.md) for:
- How the proxy works
- Production deployment
- Security considerations
- Troubleshooting
- Manual proxy configuration

## Without Proxy Server

You can still use the dashboard as a static site, but you'll need to:
1. Configure an external CORS proxy for SerpAPI
2. Open browser console and run:
   ```javascript
   localStorage.setItem('cors_proxy', 'https://corsproxy.io/?{url}')
   ```

The built-in server is recommended for the best experience.
