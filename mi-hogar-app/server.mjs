import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./dist', import.meta.url));
const port = process.env.PORT || 4173;

const mime = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.webmanifest': 'application/manifest+json',
    '.map': 'application/json'
};

const server = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url, 'http://localhost');
        const path = decodeURIComponent(url.pathname).replace(/^\/+/, '');
        let file;
        try {
            file = join(root, path || 'index.html');
        } catch {
            res.writeHead(403);
            return res.end();
        }
        if (!file.startsWith(root)) {
            res.writeHead(403);
            return res.end();
        }
        try {
            const data = await readFile(file);
            res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
            return res.end(data);
        } catch {
            if (!path || path.startsWith('assets/') || path.startsWith('icons/') || path === 'sw.js' || path.startsWith('workbox-')) {
                res.writeHead(404);
                return res.end('Not Found');
            }
            const data = await readFile(join(root, 'index.html'));
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            return res.end(data);
        }
    } catch {
        res.writeHead(500);
        res.end('Internal Server Error');
    }
});

server.listen(port, '0.0.0.0', () => {
    console.log(`Mi Hogar serving http://0.0.0.0:${port}`);
});
