'use strict';

const PRICES = {
  regular_wash: 70,
  titan_wash: 90,
  regular_dry: 90,
  titan_dry: 110,
  folding: 20,
};

function calculateServicePrice(service, machineType, loadCount) {
  const count = Number(loadCount);

  if (!Number.isInteger(count) || count < 1) {
    throw new Error('loadCount must be a positive whole number');
  }

  if (service === 'fold') {
    return PRICES.folding * count;
  }

  if (!['wash', 'dry'].includes(service)) {
    throw new Error('service must be wash, dry, or fold');
  }

  if (!['regular', 'titan'].includes(machineType)) {
    throw new Error('machineType must be regular or titan');
  }

  const key = `${machineType}_${service}`;
  return PRICES[key] * count;
}

function calculateOrderPrice({
  washMachineType = null,
  dryMachineType = null,
  loadCount,
  includeWash = false,
  includeDry = false,
  includeFold = false,
}) {
  const count = Number(loadCount);

  if (!Number.isInteger(count) || count < 1) {
    throw new Error('loadCount must be a positive whole number');
  }

  let total = 0;

  if (includeWash) {
    total += calculateServicePrice('wash', washMachineType, count);
  }

  if (includeDry) {
    total += calculateServicePrice('dry', dryMachineType, count);
  }

  if (includeFold) {
    total += calculateServicePrice('fold', 'regular', count);
  }

  if (total === 0) {
    throw new Error('At least one service must be selected');
  }

  return total;
}

module.exports = {
  PRICES,
  calculateServicePrice,
  calculateOrderPrice,
};