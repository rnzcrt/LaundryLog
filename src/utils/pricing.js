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

module.exports = {
  PRICES,
  calculateServicePrice,
};