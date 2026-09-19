'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const required = [
  'package.json',
  'db/schema.sql',
  'db/seed.sql',
  'src/server.js',
  'src/app.js',
  'src/db.js',
  'src/routes/orders.js',
  'src/routes/customers.js',
  'src/validators/orderValidators.js',
  'src/middleware/errorHandler.js',
  'public/index.html',
  'public/app.js',
  'public/styles.css',
];

const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error('Missing required files:');
  missing.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}

const jsFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') walk(full);
    else if (entry.isFile() && full.endsWith('.js')) jsFiles.push(full);
  }
}
walk(path.join(root, 'src'));
walk(path.join(root, 'public'));
walk(path.join(root, 'scripts'));

for (const file of jsFiles) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
}

console.log(`Preflight passed: ${required.length} required files present; ${jsFiles.length} JavaScript files passed syntax checks.`);
