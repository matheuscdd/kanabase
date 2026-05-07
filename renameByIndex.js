const fs = require('fs');
const path = require('path');

const [,, jsonPath, folderPath] = process.argv;

if (!jsonPath || !folderPath) {
  console.error('Usage: node renameByIndex.js <path-to-index.json> <path-to-png-folder>');
  process.exit(1);
}

const items = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

let renamed = 0;
let notFound = 0;

for (const item of items) {
  const src = path.join(folderPath, `${item.name}.png`);
  const dest = path.join(folderPath, `${item.id}.png`);

  if (fs.existsSync(src)) {
    fs.renameSync(src, dest);
    console.log(`  ${item.name}.png -> ${item.id}.png`);
    renamed++;
  } else {
    console.warn(`  NOT FOUND: ${item.name}.png`);
    notFound++;
  }
}

console.log(`\nDone: ${renamed} renamed, ${notFound} not found.`);
