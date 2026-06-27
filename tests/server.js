// Simple static file server for Playwright tests — no CSP headers
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = 3737;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

http.createServer(function (req, res) {
  let urlPath = req.url.split('?')[0].split('#')[0];
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(ROOT, urlPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, function (err, data) {
    if (err) {
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(ROOT, '404.html'), function (e, html) {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(e ? 'Not found' : html);
        });
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}).listen(PORT, function () {
  console.log('Test server: http://localhost:' + PORT);
});
