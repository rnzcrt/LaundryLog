'use strict';

const MAX_WEIGHT_KG = 100;
const MAX_CAPACITY_KG = 100;
const MIN_CAPACITY_KG = 0.1;
const MAX_LOAD_COUNT = 1000;
const HUNDREDTHS_TOLERANCE = 1e-7;

function toHundredths(value, fieldName) {
  let number;
  try {
    number = Number(value);
  } catch {
    throw new Error(`${fieldName} must be a finite number greater than 0`);
  }
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`${fieldName} must be a finite number greater than 0`);
  }

  const hundredths = Math.round(number * 100);
  if (Math.abs(number * 100 - hundredths) > HUNDREDTHS_TOLERANCE) {
    throw new Error(`${fieldName} must have no more than two decimal places`);
  }
  if (hundredths < 1) {
    throw new Error(`${fieldName} must be at least 0.01 kg`);
  }

  return hundredths;
}

function splitLoadWeight(totalWeightKg, capacityKg) {
  const total = toHundredths(totalWeightKg, 'totalWeightKg');
  const capacity = toHundredths(capacityKg, 'capacityKg');

  if (total > MAX_WEIGHT_KG * 100) {
    throw new Error(`totalWeightKg cannot exceed ${MAX_WEIGHT_KG} kg`);
  }
  if (capacity > MAX_CAPACITY_KG * 100) {
    throw new Error(`capacityKg cannot exceed ${MAX_CAPACITY_KG} kg`);
  }
  if (capacity < MIN_CAPACITY_KG * 100) {
    throw new Error(`capacityKg must be at least ${MIN_CAPACITY_KG} kg`);
  }

  const loadCount = Math.ceil(total / capacity);
  if (loadCount > MAX_LOAD_COUNT) {
    throw new Error(
      `capacityKg is too small; splitting would require more than ${MAX_LOAD_COUNT} loads`,
    );
  }

  const loads = [];
  let remaining = total;

  while (remaining > 0) {
    const loadWeight = Math.min(remaining, capacity);
    // Both values are positive integer hundredths, so this always reduces the
    // remaining weight and avoids floating-point drift or a stalled loop.
    loads.push(loadWeight / 100);
    remaining -= loadWeight;
  }

  return loads;
}

module.exports = {
  splitLoadWeight,
};
