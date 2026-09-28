'use strict';

const PRICES = {
  regular_wash: 70,
  titan_wash: 90,
  regular_dry: 90,
  titan_dry: 110,
  folding: 20,
};

const MACHINE_CAPACITY_KG = {
  regular: 8,
  titan: 10,
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

  return PRICES[`${machineType}_${service}`] * count;
}

function calculateLoadCount(weightKg, machineType) {
  const weight = Number(weightKg);
  const capacity = MACHINE_CAPACITY_KG[machineType];

  if (!Number.isFinite(weight) || weight <= 0) {
    throw new Error('weightKg must be greater than 0');
  }

  if (!capacity) {
    throw new Error('machineType must be regular or titan');
  }

  return Math.ceil(weight / capacity);
}

function calculateOrderPrice({
  loadType,
  weightKg,
  washMachineType = null,
  dryMachineType = null,
}) {
  const weight = Number(weightKg);

  if (!Number.isFinite(weight) || weight <= 0) {
    throw new Error('weightKg must be greater than 0');
  }

  let total = 0;

  if (loadType === 'wash_fold') {
    const washLoads = calculateLoadCount(weight, washMachineType);
    const dryLoads = calculateLoadCount(weight, dryMachineType);

    total += calculateServicePrice('wash', washMachineType, washLoads);
    total += calculateServicePrice('dry', dryMachineType, dryLoads);

    // Folding follows the number of wash loads.
    total += calculateServicePrice('fold', 'regular', washLoads);

    return total;
  }

  if (loadType === 'wash_only') {
    const loads = calculateLoadCount(weight, washMachineType);
    return calculateServicePrice('wash', washMachineType, loads);
  }

  if (loadType === 'dry_only') {
    const loads = calculateLoadCount(weight, dryMachineType);
    return calculateServicePrice('dry', dryMachineType, loads);
  }

  if (loadType === 'fold_only') {
    const loads = calculateLoadCount(weight, 'regular');
    return calculateServicePrice('fold', 'regular', loads);
  }

  throw new Error(`Unsupported load type: ${loadType}`);
}

module.exports = {
  PRICES,
  MACHINE_CAPACITY_KG,
  calculateServicePrice,
  calculateLoadCount,
  calculateOrderPrice,
};