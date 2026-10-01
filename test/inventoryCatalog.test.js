'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  INVENTORY_CATALOG,
  inventoryProductName,
  parseInventoryProductName,
} = require('../src/utils/inventoryCatalog');

test('inventory catalog contains only the configured brands and products', () => {
  assert.deepEqual(Object.keys(INVENTORY_CATALOG), [
    'Ariel', 'Downy', 'Surf', 'Tide', 'Champion', 'Zonrox',
  ]);
  assert.deepEqual(INVENTORY_CATALOG, {
    Ariel: ['Sunrise Fresh'],
    Downy: ['Antibac', 'Sunrise'],
    Surf: ['Fabcon Sunbloom', 'Liquid Detergent Rose Fresh'],
    Tide: ['Garden Bloom'],
    Champion: ['Original'],
    Zonrox: ['Colorsafe'],
  });

  for (const [brand, products] of Object.entries(INVENTORY_CATALOG)) {
    for (const product of products) {
      const name = `${brand} — ${product}`;
      assert.equal(inventoryProductName(brand, product), name);
      assert.equal(parseInventoryProductName(name), name);
    }
  }
});

test('inventory catalog rejects arbitrary brands, products, and product names', () => {
  assert.equal(inventoryProductName('Other', 'Original'), null);
  assert.equal(inventoryProductName('Ariel', 'Antibac'), null);
  assert.equal(inventoryProductName('Downy', 'Sunrise '), null);
  assert.equal(parseInventoryProductName('Arbitrary detergent'), null);
  assert.equal(parseInventoryProductName('Ariel — Antibac'), null);
});

test('inventory form exposes only catalog brands and uses the configured product choices', () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');

  for (const brand of Object.keys(INVENTORY_CATALOG)) {
    assert.ok(html.includes(`<option value="${brand}">${brand}</option>`));
    for (const product of INVENTORY_CATALOG[brand]) {
      assert.ok(app.includes(`${brand}: ["${product}"]`) || app.includes(`${brand}: ["${INVENTORY_CATALOG[brand].join('", "')}"]`));
    }
  }
  assert.match(html, /<select id="productSelection"[^>]*disabled>/);
  assert.doesNotMatch(html, /id="productName"[^>]*type="text"/);
});
