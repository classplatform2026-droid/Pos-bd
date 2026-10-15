const fs = require('fs');
const path = require('path');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItem => {
      copyRecursive(path.join(src, childItem), path.join(dest, childItem));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// 1. Check if src/main.tsx exists locally in owner
const mainFile = path.join(__dirname, 'src', 'main.tsx');
if (!fs.existsSync(mainFile)) {
  console.log('[sync-fallback] src/main.tsx missing in owner. Searching for root src...');
  
  const possibleSrcs = [
    path.join(__dirname, '..', '..', 'src'),
    path.join(__dirname, '..', 'src'),
    '/opt/render/project/src/src'
  ];

  for (const candidate of possibleSrcs) {
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'main.tsx'))) {
      console.log(`[sync-fallback] Found root src at: ${candidate}. Syncing files...`);
      copyRecursive(candidate, path.join(__dirname, 'src'));
      break;
    }
  }
}

// 2. Also ensure tsconfig.json exists
const tsConfigFile = path.join(__dirname, 'tsconfig.json');
if (!fs.existsSync(tsConfigFile)) {
  const possibleConfigs = [
    path.join(__dirname, '..', '..', 'tsconfig.json'),
    path.join(__dirname, '..', 'tsconfig.json'),
    '/opt/render/project/src/tsconfig.json'
  ];

  for (const candidate of possibleConfigs) {
    if (fs.existsSync(candidate)) {
      fs.copyFileSync(candidate, tsConfigFile);
      break;
    }
  }
}

console.log('[sync-fallback] Ready for build.');
