const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 10181;
const DIST_PATH = path.join(__dirname, 'dist/frontend/browser');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
};

http.createServer((req, res) => {
  // Ukloni query string
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(DIST_PATH, urlPath === '/' ? '/index.html' : urlPath);
  const ext = path.extname(filePath);

  // Ako fajl ne postoji ili nema ekstenziju -> vrati index.html (SPA fallback)
  if (!ext || !fs.existsSync(filePath)) {
    filePath = path.join(DIST_PATH, 'index.html');
  }

  const contentType = mimeTypes[path.extname(filePath)] || 'text/plain';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Error loading file');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend Admin running on http://0.0.0.0:${PORT}`);
});
