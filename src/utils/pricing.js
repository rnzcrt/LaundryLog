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

function calculateServicePrice(service, machineType) {
  if (service === 'fold') {
    return PRICES.folding;
  }

  if (!['wash', 'dry'].includes(service)) {
    throw new Error('service must be wash, dry, or fold');
  }

  if (!['regular', 'titan'].includes(machineType)) {
    throw new Error('machineType must be regular or titan');
  }

  // Capacity and machine cycles affect scheduling only. The selected service
  // has one flat base price per order.
  return PRICES[`${machineType}_${service}`];
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
    calculateLoadCount(weight, washMachineType);
    calculateLoadCount(weight, dryMachineType);

    total += calculateServicePrice('wash', washMachineType);
    total += calculateServicePrice('dry', dryMachineType);
    // The selected Wash & Fold base service includes one folding service fee;
    // load splitting never multiplies any service charge.
    total += calculateServicePrice('fold', 'regular');

    return total;
  }

  if (loadType === 'wash_only') {
    calculateLoadCount(weight, washMachineType);
    return calculateServicePrice('wash', washMachineType);
  }

  if (loadType === 'dry_only') {
    calculateLoadCount(weight, dryMachineType);
    return calculateServicePrice('dry', dryMachineType);
  }

  if (loadType === 'fold_only') {
    calculateLoadCount(weight, 'regular');
    return calculateServicePrice('fold', 'regular');
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
