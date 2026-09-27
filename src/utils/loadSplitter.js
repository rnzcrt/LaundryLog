'use strict';

function splitLoadWeight(totalWeightKg, capacityKg) {
  const total = Number(totalWeightKg);
  const capacity = Number(capacityKg);

  if (!Number.isFinite(total) || total <= 0) {
    throw new Error('totalWeightKg must be greater than 0');
  }

  if (!Number.isFinite(capacity) || capacity <= 0) {
    throw new Error('capacityKg must be greater than 0');
  }

  const loads = [];
  let remaining = total;

  while (remaining > 0) {
    const loadWeight = Math.min(remaining, capacity);
    loads.push(Number(loadWeight.toFixed(2)));
    remaining = Number((remaining - loadWeight).toFixed(2));
  }

  return loads;
}

module.exports = {
  splitLoadWeight,
};