import http from 'http';
import fs from 'fs/promises';
import fsExtra from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLIENT_DIR = path.resolve(__dirname, '..', 'dist', 'client');
const SERVER_ENTRY = path.resolve(__dirname, '..', 'dist', 'server', 'index.cjs');
// Default to a high, commonly-available port range to avoid conflicts with system services.
const CLIENT_PORT = Number(process.env.CLIENT_PORT || 3000);

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'],
]);

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return mime.get(ext) || 'application/octet-stream';
}

async function serveFile(req, res) {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, `http://localhost`).pathname);
    let filePath = path.join(CLIENT_DIR, urlPath);
    try {
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
    } catch (err) {
      // file doesn't exist — fall back to index.html for SPA
      filePath = path.join(CLIENT_DIR, 'index.html');
    }

    const data = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType(filePath) });
    res.end(data);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Server error');
  }
}

let activeServer = null;
async function startListening(startPort, maxAttempts = 200) {
  let port = Number(startPort) || CLIENT_PORT;
  for (let i = 0; i < maxAttempts; i++) {
    const s = http.createServer((req, res) => serveFile(req, res));
    try {
      await new Promise((resolve, reject) => {
        s.once('error', reject);
        s.listen(port, '127.0.0.1', () => {
          s.removeAllListeners('error');
          resolve();
        });
      });
      activeServer = s;
      console.log(`Client static server running at http://localhost:${port}`);
      return port;
    } catch (err) {
      // Clean up the server instance on failure
      try { s.close(); } catch (e) {}
      if (err && (err.code === 'EACCES' || err.code === 'EADDRINUSE')) {
        console.warn(`Port ${port} unavailable (${err.code}). Trying next port...`);
        port++;
        continue;
      }
      throw err;
    }
  }
  throw new Error('Failed to bind static server to any port');
}

let serverProc = null;
startListening(CLIENT_PORT).then((port) => {
  // Only spawn the backend server after static server started (so ports are visible)
  if (!fsExtra.existsSync(SERVER_ENTRY)) {
    console.warn(`Warning: server entry not found at ${SERVER_ENTRY}. Run 'npm run build' first or start the server another way.`);
    return;
  }
  try {
    serverProc = spawn(process.execPath, [SERVER_ENTRY], { stdio: 'inherit' });
    serverProc.on('exit', (code) => {
      console.log('Server process exited with', code);
      process.exit(code ?? 0);
    });
  } catch (err) {
    console.error('Failed to start server process:', err);
  }
}).catch((err) => {
  console.error('Failed to start client static server:', err);
  process.exit(1);
});

function cleanup() {
  if (serverProc && !serverProc.killed) serverProc.kill();
  try { if (activeServer) activeServer.close(); } catch (e) {}
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

