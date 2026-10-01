'use strict';

const MACHINE_SERVICES = {
  washer: new Set(['wash_fold', 'wash_only']),
  dryer: new Set(['wash_fold', 'dry_only']),
};

function requiredMachineKind(loadType, destination) {
  if (destination === 'washing' && MACHINE_SERVICES.washer.has(loadType)) return 'washer';
  if (destination === 'drying' && MACHINE_SERVICES.dryer.has(loadType)) return 'dryer';
  return null;
}

function validateMachineAssignments(assignments, totalWeightKg) {
  if (!Array.isArray(assignments)) {
    throw new Error('machine_assignments must be an array');
  }
  if (assignments.length === 0) {
    throw new Error('Select at least one available machine');
  }

  const ids = new Set();
  const normalized = assignments.map((assignment, index) => {
    if (!assignment || typeof assignment !== 'object' || Array.isArray(assignment)) {
      throw new Error(`machine_assignments[${index}] must be an object`);
    }
    const machineId = Number(assignment.machine_id);
    const weight = Number(assignment.weight_kg);
    const weightCentiKg = Math.round(weight * 100);
    if (!Number.isInteger(machineId) || machineId < 1) {
      throw new Error(`machine_assignments[${index}].machine_id must be a positive whole number`);
    }
    if (ids.has(machineId)) throw new Error('A machine cannot be assigned more than once');
    ids.add(machineId);
    if (!Number.isFinite(weight) || weight <= 0 ||
        Math.abs(weight * 100 - weightCentiKg) > 1e-7 || weightCentiKg > 10000) {
      throw new Error(`machine_assignments[${index}].weight_kg must be from 0.01 to 100 kg with at most two decimals`);
    }
    return { machineId, weightKg: weightCentiKg / 100, weightCentiKg };
  });

  const totalCentiKg = Math.round(Number(totalWeightKg) * 100);
  if (!Number.isFinite(totalCentiKg) || totalCentiKg <= 0 ||
      normalized.reduce((sum, item) => sum + item.weightCentiKg, 0) !== totalCentiKg) {
    throw new Error('Assigned load weights must add up to the order weight');
  }
  return normalized;
}

function validateCompletionChoices(body) {
  const decision = body.addon_decision;
  if (!['add', 'skip'].includes(decision)) {
    throw new Error('Choose add-ons or explicitly skip them before completing this order');
  }
  if (!Array.isArray(body.addons)) throw new Error('addons must be an array');
  if (decision === 'skip' && body.addons.length) {
    throw new Error('Skipped add-ons cannot include selected services');
  }
  if (decision === 'add' && body.addons.length === 0) {
    throw new Error('Select at least one add-on or explicitly skip them');
  }
  const seen = new Set();
  return body.addons.map((addon, index) => {
    if (!addon || typeof addon !== 'object' || Array.isArray(addon)) {
      throw new Error(`addons[${index}] must be an object`);
    }
    const id = Number(addon.id);
    const quantity = Number(addon.quantity ?? 1);
    if (!Number.isInteger(id) || id < 1) throw new Error(`addons[${index}].id must be a positive whole number`);
    if (seen.has(id)) throw new Error('Add-ons cannot be duplicated');
    seen.add(id);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      throw new Error(`addons[${index}].quantity must be a whole number from 1 to 100`);
    }
    return { id, quantity };
  });
}

module.exports = {
  requiredMachineKind,
  validateMachineAssignments,
  validateCompletionChoices,
};
