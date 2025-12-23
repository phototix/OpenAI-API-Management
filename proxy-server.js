const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins (restrict in production)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'x-api-key', 'anthropic-version']
}));

// Parse JSON bodies
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(__dirname, {
  extensions: ['html'],
  index: 'index.html'
}));

// Proxy endpoint
app.all('/proxy_api', async (req, res) => {
  try {
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing "url" query parameter' });
    }

    // Validate URL
    let url;
    try {
      url = new URL(targetUrl);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL provided' });
    }

    // Prepare headers (copy from original request, excluding host and connection headers)
    const headers = {};
    const excludeHeaders = ['host', 'connection', 'content-length', 'origin', 'referer'];
    
    for (const [key, value] of Object.entries(req.headers)) {
      if (!excludeHeaders.includes(key.toLowerCase())) {
        headers[key] = value;
      }
    }

    // Make the proxied request
    const fetchOptions = {
      method: req.method,
      headers: headers
    };

    // Include body for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
      headers['Content-Type'] = 'application/json';
    }

    console.log(`[Proxy] ${req.method} ${targetUrl}`);

    const response = await fetch(targetUrl, fetchOptions);
    
    // Copy response headers
    response.headers.forEach((value, key) => {
      // Skip some headers that shouldn't be forwarded
      if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    // Set status code
    res.status(response.status);

    // Get response body
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const data = await response.json();
      res.json(data);
    } else if (contentType.includes('text')) {
      const text = await response.text();
      res.send(text);
    } else {
      const buffer = await response.buffer();
      res.send(buffer);
    }

  } catch (error) {
    console.error('[Proxy Error]', error.message);
    res.status(500).json({ 
      error: 'Proxy request failed', 
      message: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Proxy server is running' });
});

// Catch-all for HTML5 history mode (for SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║  API Key Dashboard Proxy Server                       ║
║  Running on: http://localhost:${PORT}                   ║
║  Proxy endpoint: http://localhost:${PORT}/proxy_api     ║
║  Usage: /proxy_api?url=<encoded_target_url>           ║
╚═══════════════════════════════════════════════════════╝
  `);
  console.log('✓ Static files served from:', __dirname);
  console.log('✓ CORS enabled for all origins');
  console.log('✓ Proxy ready to forward requests\n');
});
