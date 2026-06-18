const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const HTTPS_PORT = 10190;
const HTTP_PORT = 10183;
const DIST_PATH = path.join(__dirname, 'dist/Frontend_Korisnik/browser');

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

function handleRequest(req, res) {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(DIST_PATH, urlPath === '/' ? '/index.html' : urlPath);
  const ext = path.extname(filePath);

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
}

// Pokusaj da ucitas dev sertifikat
const home = os.homedir();
const certPath = path.join(home, '.dotnet', 'corefx', 'cryptography', 'x509stores', 'my');

let sslOptions = null;
try {
  const certFile = fs.readdirSync(certPath).find(f => f.endsWith('.pfx'));
  if (certFile) {
    sslOptions = {
      pfx: fs.readFileSync(path.join(certPath, certFile)),
      passphrase: ''
    };
  }
} catch (e) {
  console.warn('Dev sertifikat nije pronadjen, pokrecemo samo HTTP:', e.message);
}

// HTTP server — ZAKOMENTARISANO za dev instancu (port 10183 zauzet testnom instancom)
// http.createServer(handleRequest).listen(HTTP_PORT, '0.0.0.0', () => {
//   console.log(`Frontend Korisnik HTTP running on http://0.0.0.0:${HTTP_PORT}`);
// });

// HTTPS server (samo ako postoji sertifikat)
if (sslOptions) {
  https.createServer(sslOptions, handleRequest).listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`Frontend Korisnik HTTPS running on https://0.0.0.0:${HTTPS_PORT}`);
  });
} else {
  console.warn('HTTPS nije pokrenut - sertifikat nije pronadjen.');
}
