// Servidor simples sem dependências: node server.js  ->  http://localhost:5500
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 5500;
const PUBLIC_DIR = path.join(__dirname, 'public');
const USERS_FILE = path.join(__dirname, 'users.json');
const sessions = new Map(); // token -> { email, nome }

// ---------- usuários ----------
function loadUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// A senha nunca é salva em texto puro: guardamos salt + hash (scrypt).
function hashSenha(senha, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(senha, salt, 64).toString('hex');
  return { salt, hash };
}

function senhaConfere(senha, user) {
  const { hash } = hashSenha(senha, user.salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.hash, 'hex'));
}

// ---------- utilidades ----------
function sendJson(res, status, data, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 10_000) {
        reject(new Error('corpo grande demais'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
  });
}

function getSession(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/(?:^|;\s*)sid=([a-f0-9]+)/);
  return match ? sessions.get(match[1]) : null;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

function serveFile(res, file) {
  const full = path.join(PUBLIC_DIR, file);
  if (!full.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403);
    return res.end('Acesso negado');
  }
  fs.readFile(full, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Página não encontrada');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
    res.end(data);
  });
}

// ---------- rotas ----------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function handleApi(req, res, pathname) {
  try {
    if (req.method === 'POST' && pathname === '/api/cadastro') {
      const { nome, email, senha } = await readBody(req);
      const nomeLimpo = String(nome || '').trim();
      const emailLimpo = String(email || '').trim().toLowerCase();
      const senhaStr = String(senha || '');

      if (!nomeLimpo) return sendJson(res, 400, { erro: 'Informe o nome.' });
      if (!EMAIL_RE.test(emailLimpo)) return sendJson(res, 400, { erro: 'E-mail inválido.' });
      if (senhaStr.length < 6) return sendJson(res, 400, { erro: 'A senha deve ter pelo menos 6 caracteres.' });

      const users = loadUsers();
      if (users.some((u) => u.email === emailLimpo)) {
        return sendJson(res, 409, { erro: 'Este e-mail já está cadastrado.' });
      }

      users.push({ nome: nomeLimpo, email: emailLimpo, ...hashSenha(senhaStr), criadoEm: new Date().toISOString() });
      saveUsers(users);
      return sendJson(res, 201, { ok: true });
    }

    if (req.method === 'POST' && pathname === '/api/login') {
      const { email, senha } = await readBody(req);
      const emailLimpo = String(email || '').trim().toLowerCase();
      const user = loadUsers().find((u) => u.email === emailLimpo);

      if (!user || !senhaConfere(String(senha || ''), user)) {
        return sendJson(res, 401, { erro: 'E-mail ou senha incorretos.' });
      }

      const token = crypto.randomBytes(24).toString('hex');
      sessions.set(token, { email: user.email, nome: user.nome });
      return sendJson(res, 200, { ok: true }, {
        'Set-Cookie': `sid=${token}; HttpOnly; SameSite=Strict; Path=/`,
      });
    }

    if (req.method === 'POST' && pathname === '/api/logout') {
      const match = (req.headers.cookie || '').match(/(?:^|;\s*)sid=([a-f0-9]+)/);
      if (match) sessions.delete(match[1]);
      return sendJson(res, 200, { ok: true }, {
        'Set-Cookie': 'sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0',
      });
    }

    if (req.method === 'GET' && pathname === '/api/me') {
      const session = getSession(req);
      if (!session) return sendJson(res, 401, { erro: 'Não autenticado.' });
      return sendJson(res, 200, session);
    }

    return sendJson(res, 404, { erro: 'Rota não encontrada.' });
  } catch (err) {
    return sendJson(res, 400, { erro: err.message });
  }
}

const PAGES = {
  '/': 'login.html',
  '/cadastro': 'cadastro.html',
  '/esqueci-senha': 'esqueci-senha.html',
  '/logado': 'logado.html',
};

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;

  if (pathname.startsWith('/api/')) return handleApi(req, res, pathname);

  if (pathname === '/logado' && !getSession(req)) {
    res.writeHead(302, { Location: '/' });
    return res.end();
  }

  if (PAGES[pathname]) return serveFile(res, PAGES[pathname]);
  if (pathname === '/style.css') return serveFile(res, 'style.css');

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Página não encontrada');
});

server.listen(PORT, () => console.log(`Rodando em http://localhost:${PORT}`));
