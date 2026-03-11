const crypto = require('crypto');
const http = require('http');
const https = require('https');

const API_BASE = process.env.CLAWDAGENT_URL || 'http://127.0.0.1:3000';
const JWT_SECRET = process.env.JWT_SECRET || '';

function base64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function makeToken() {
  if (!JWT_SECRET) return '';
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    userId: 'admin', role: 'admin',
    jti: 'broadcast_' + Date.now(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  }));
  const sig = base64url(crypto.createHmac('sha256', JWT_SECRET).update(header + '.' + payload).digest());
  return header + '.' + payload + '.' + sig;
}

function apiCall(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    const token = makeToken();
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: '/api' + path,
      method,
      headers: {
        ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = lib.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch { resolve({ error: d }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

module.exports = { apiCall };
