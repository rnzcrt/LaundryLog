'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const required = [
  'package.json',
  'db/schema.sql',
  'db/seed.sql',
  'db/migrations/000_base_schema.sql',
  'db/migrations/009_service_addons.sql',
  'db/migrations/010_order_due_completion.sql',
  'db/migrate.js',
  'db/run-migrations.js',
  'db/run-seed.js',
  'src/server.js',
  'src/app.js',
  'src/config.js',
  'src/db.js',
  'src/routes/orders.js',
  'src/routes/customers.js',
  'src/routes/machines.js',
  'src/routes/products.js',
  'src/routes/reports.js',
  'src/routes/addons.js',
  'src/validators/orderValidators.js',
  'src/middleware/basicAuth.js',
  'src/middleware/errorHandler.js',
  'public/index.html',
  'public/app.js',
  'public/workflow.js',
  'public/tabs.js',
  'public/styles.css',
  'test/frontend.test.js',
  'test/migrations.test.js',
  'test/security.test.js',
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
