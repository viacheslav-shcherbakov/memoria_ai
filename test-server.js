const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 8080;
const ROOT = process.cwd();

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg'
};

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    
    // Disable caching for JS files during development
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    let filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Server Error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`\n✅ Server running at ${url}`);
    console.log('\n========================================');
    console.log('  MEMORIA IS READY!');
    console.log('========================================');
    console.log(`\n📱 Open: ${url}`);
    console.log('\n⚠️  ВАЖНО: Открывай через http://, а не file://');
    console.log('   (Web Workers и AI не работают с file://)');
    console.log('\n🔄 Cache disabled for development');
    console.log('\n========================================\n');
    
    // Авто-открытие браузера
    const platform = process.platform;
    let cmd;
    
    if (platform === 'darwin') {
        cmd = `open ${url}`;
    } else if (platform === 'win32') {
        cmd = `start ${url}`;
    } else {
        const browsers = ['google-chrome', 'chromium-browser', 'firefox', 'xdg-open'];
        cmd = browsers.map(b => `which ${b} >/dev/null 2>&1 && ${b} ${url}`).join(' || ');
    }
    
    exec(cmd, (err) => {
        if (err) {
            console.log('Could not auto-open browser. Please open manually:');
            console.log(url);
        } else {
            console.log('🚀 Opening browser...');
        }
    });
});
