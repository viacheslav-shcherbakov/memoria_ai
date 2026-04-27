# Memoria AI - Local Development

## How to Run Locally

**IMPORTANT:** Due to CORS and security restrictions, you CANNOT open `index.html` directly from the file system (`file://`). You MUST use a local web server.

### Option 1: Windows (using the batch file)
Simply double-click `start.bat` or run it from command prompt:
```
start.bat
```

Then open your browser and navigate to: **http://localhost:8000**

### Option 2: Manual Python Server
If you have Python installed:
```bash
python -m http.server 8000
```

Then open your browser and navigate to: **http://localhost:8000**

### Option 3: Node.js http-server
If you have Node.js installed:
```bash
npx http-server -p 8000
```

Then open your browser and navigate to: **http://localhost:8000**

### Option 4: VS Code Live Server
1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

## Why Not File://?

Modern browsers block many features when opening HTML files directly:
- ❌ Service Workers won't work
- ❌ IndexedDB may be blocked
- ❌ CORS restrictions prevent loading resources
- ❌ PWA features are disabled
- ❌ Web Workers may not function properly

Using a local server (http://localhost) ensures all features work correctly.

## Troubleshooting

### Error: "Cannot read properties of null (reading 'classList')"
This was fixed. Make sure you're running the latest version from the repository.

### Error: "setupProjectPills is not a function"
This was fixed. The method call was removed as it was redundant.

### Tailwind CSS Warning
The warning about `cdn.tailwindcss.com` is expected in development. For production, Tailwind should be installed via PostCSS, but for local development the CDN version works fine.

## Features Requiring HTTP Server
- ✅ Service Worker registration
- ✅ PWA installation
- ✅ IndexedDB operations
- ✅ Web Workers (AI processing)
- ✅ Manifest.json loading
- ✅ All modern browser APIs
