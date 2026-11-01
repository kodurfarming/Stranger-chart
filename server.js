// Random one-on-one chat server. Created by Sai Anvesh Reddy.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const html = fs.readFileSync(path.join(__dirname, 'index.html'));

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url.startsWith('/?')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } else if (req.url === '/health') {
    res.end('ok');
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const wss = new WebSocketServer({ server, maxPayload: 64 * 1024 });
const queues = { text: [], video: [] };

function send(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function broadcastOnline() {
  const n = wss.clients.size;
  wss.clients.forEach((c) => send(c, { type: 'online', n }));
}

function unpair(ws, notify = true) {
  for (const k in queues) queues[k] = queues[k].filter((x) => x !== ws);
  const p = ws.partner;
  if (p) {
    ws.partner = null;
    p.partner = null;
    if (notify) send(p, { type: 'partner_left' });
  }
}

wss.on('connection', (ws, req) => {
  ws.partner = null;
  ws.alive = true;
  ws.stamps = [];
  ws.ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  ws.on('pong', () => { ws.alive = true; });
  broadcastOnline();

  ws.on('message', (raw) => {
    const now = Date.now();
    ws.stamps = ws.stamps.filter((t) => now - t < 1000);
    ws.stamps.push(now);
    if (ws.stamps.length > 40) return; // basic flood protection

    let m;
    try { m = JSON.parse(raw); } catch { return; }

    switch (m.type) {
      case 'find': {
        unpair(ws);
        const q = queues[m.mode === 'video' ? 'video' : 'text'];
        let other;
        while ((other = q.shift()) && (other === ws || other.readyState !== 1)) {}
        if (other) {
          ws.partner = other;
          other.partner = ws;
          send(ws, { type: 'matched', initiator: true });
          send(other, { type: 'matched', initiator: false });
        } else {
          q.push(ws);
          send(ws, { type: 'waiting' });
        }
        break;
      }
      case 'chat':
        if (ws.partner && typeof m.text === 'string') {
          send(ws.partner, { type: 'chat', text: m.text.slice(0, 500) });
        }
        break;
      case 'signal':
        if (ws.partner && m.data) send(ws.partner, { type: 'signal', data: m.data });
        break;
      case 'leave':
        unpair(ws);
        break;
      case 'report':
        console.log(new Date().toISOString(), 'REPORT against', ws.partner ? ws.partner.ip : 'unknown');
        unpair(ws);
        break;
    }
  });

  ws.on('close', () => {
    unpair(ws);
    broadcastOnline();
  });
});

setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.alive) return ws.terminate();
    ws.alive = false;
    ws.ping();
  });
}, 30000);

server.listen(PORT, () => console.log('Running on http://localhost:' + PORT));
