/**
 * update-sw-version.js
 * Aggiorna BUILD_DATE nel service worker ad ogni build.
 * Eseguito automaticamente da npm via "prebuild" hook.
 */

const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '../public/service-worker.js');
const newDate = new Date().toISOString();

let content = fs.readFileSync(swPath, 'utf8');
content = content.replace(
    /const BUILD_DATE = '.*?';/,
    `const BUILD_DATE = '${newDate}';`
);

fs.writeFileSync(swPath, content, 'utf8');
console.log(`[prebuild] service-worker.js BUILD_DATE → ${newDate}`);
