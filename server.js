const http = require('http');
const fs   = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

// Railway inietta PORT automaticamente, fallback 3000 per locale
const PORT = process.env.PORT || 3000;

// ── HTTP server (serve file statici) ───────────────────────────────
const httpServer = http.createServer((req, res) => {
  // Mappa URL → file
  const urlMap = {
    '/':                    'ledwall.html',
    '/ledwall':             'ledwall.html',
    '/ledwall.html':        'ledwall.html',
    '/controller':          'spray_controller.html',
    '/spray_controller.html': 'spray_controller.html',
    '/index.html':          'index.html',
    '/index':               'index.html',
    '/download.html':       'download.html',
    '/download':            'download.html',
    '/gallery.html':        'gallery.html',
    '/gallery':             'gallery.html',
  };

  const urlPath = req.url.split('?')[0]; // ignora query string
  const fileName = urlMap[urlPath];

  if (!fileName) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }

  const filePath = path.join(__dirname, fileName);
  const ext  = path.extname(filePath);
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'application/javascript',
    '.css':  'text/css',
    '.png':  'image/png',
    '.svg':  'image/svg+xml',
  }[ext] || 'text/plain';

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

// ── WebSocket server ────────────────────────────────────────────────
const wss = new WebSocketServer({
  server: httpServer,
  maxPayload: 10 * 1024 * 1024 // 10MB per immagini sfondo
});

const clients = new Set();

wss.on('connection', (ws, req) => {
  clients.add(ws);
  const type = req.url === '/controller' ? 'controller' : 'display';
  console.log(`[+] ${type} connesso — totale: ${clients.size}`);

  ws.on('message', (data) => {
    // Relay a tutti i client tranne il mittente
    for (const client of clients) {
      if (client !== ws && client.readyState === 1) {
        client.send(data.toString());
      }
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[-] disconnesso — totale: ${clients.size}`);
  });

  ws.on('error', (err) => {
    console.error('WS error:', err.message);
    clients.delete(ws);
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎨 SprayAR online su porta ${PORT}`);
  console.log(`   Ledwall     → http://localhost:${PORT}/ledwall`);
  console.log(`   Controller  → http://localhost:${PORT}/controller`);
  console.log(`   Sito        → http://localhost:${PORT}/index`);
  console.log(`\n   Su Railway l'URL sarà assegnato automaticamente.\n`);
});
