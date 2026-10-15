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

const mainFile = path.join(__dirname, 'src', 'main.tsx');
if (!fs.existsSync(mainFile)) {
  const possibleSrcs = [
    path.join(__dirname, '..', '..', 'src'),
    path.join(__dirname, '..', 'src'),
    '/opt/render/project/src/src'
  ];

  for (const candidate of possibleSrcs) {
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'main.tsx'))) {
      copyRecursive(candidate, path.join(__dirname, 'src'));
      break;
    }
  }
}

console.log('[sync-fallback admin] Ready for build.');
