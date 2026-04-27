# Memoria AI - Local Development

## Plan for Bug Fixes

The following issues have been identified and will be fixed:

### 1. Dark/Light Mode Toggle Not Working
- **Issue**: Theme toggle button and settings checkbox are not synchronizing properly
- **Root Cause**: Logic inversion in `initTheme()` and `toggleTheme()` methods
- **Fix**: Correct the theme state logic and ensure both toggles update consistently

### 2. UI Elements Overlapping
- **Issue**: Header, tabs, and content areas overlap on some screens
- **Root Cause**: Incorrect padding/margin values and z-index conflicts
- **Fix**: Adjust header height, main content padding, and fix z-index hierarchy

### 3. Notes Not Displaying on Page Load
- **Issue**: Notes only appear after clicking a project pill or "All" button
- **Root Cause**: `currentProjectId` initialization and filter logic mismatch
- **Fix**: Ensure `filter()` is called correctly after data load with proper default state

### 4. Missing User Statistics Button/Section
- **Issue**: No visible way to access user statistics
- **Root Cause**: Analytics tab exists but may not be properly linked or visible
- **Fix**: Verify analytics tab visibility and add a statistics summary card if needed

---

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
