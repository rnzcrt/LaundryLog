'use strict';

const INVENTORY_CATALOG = Object.freeze({
  Ariel: Object.freeze(['Sunrise Fresh']),
  Downy: Object.freeze(['Antibac', 'Sunrise']),
  Surf: Object.freeze(['Fabcon Sunbloom', 'Liquid Detergent Rose Fresh']),
  Tide: Object.freeze(['Garden Bloom']),
  Champion: Object.freeze(['Original']),
  Zonrox: Object.freeze(['Colorsafe']),
});

function inventoryProductName(brand, product) {
  if (typeof brand !== 'string' || !Object.hasOwn(INVENTORY_CATALOG, brand)) return null;
  if (typeof product !== 'string' || !INVENTORY_CATALOG[brand].includes(product)) return null;
  return `${brand} — ${product}`;
}

function parseInventoryProductName(name) {
  if (typeof name !== 'string') return null;
  const separator = name.indexOf(' — ');
  if (separator < 1) return null;
  return inventoryProductName(name.slice(0, separator), name.slice(separator + 3));
}

module.exports = { INVENTORY_CATALOG, inventoryProductName, parseInventoryProductName };
