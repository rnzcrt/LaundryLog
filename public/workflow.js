'use strict';

(function attachWorkflowHelpers(root, factory) {
  const helpers = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = helpers;
  if (root) root.LaundryLogWorkflow = helpers;
}(typeof globalThis === 'undefined' ? this : globalThis, () => {
  const WASHERS = new Set(['wash_fold', 'wash_only']);
  const DRYERS = new Set(['wash_fold', 'dry_only']);

  function requiredMachineKind(loadType, destination) {
    if (destination === 'waiting' && WASHERS.has(loadType)) return 'washer';
    if (destination === 'drying' && DRYERS.has(loadType)) return 'dryer';
    return null;
  }

  function planMachineLoads(totalWeightKg, selectedMachines) {
    const total = Number(totalWeightKg);
    const totalCentiKg = Math.round(total * 100);
    if (!Number.isFinite(total) || totalCentiKg <= 0 ||
        Math.abs(total * 100 - totalCentiKg) > 1e-7) return null;
    const candidates = selectedMachines.map((machine) => ({
      machine,
      capacityCentiKg: Math.round(Number(machine.capacity_kg) * 100),
    }));
    if (candidates.some(({ capacityCentiKg }) => capacityCentiKg <= 0) ||
        candidates.reduce((sum, item) => sum + item.capacityCentiKg, 0) < totalCentiKg) return null;

    let remaining = totalCentiKg;
    const assignments = [];
    candidates.sort((a, b) => b.capacityCentiKg - a.capacityCentiKg ||
      Number(a.machine.id) - Number(b.machine.id));
    for (const candidate of candidates) {
      if (remaining <= 0) break;
      const weightCentiKg = Math.min(remaining, candidate.capacityCentiKg);
      assignments.push({ machine_id: Number(candidate.machine.id), weight_kg: weightCentiKg / 100 });
      remaining -= weightCentiKg;
    }
    return remaining === 0 ? assignments : null;
  }

  function addonSubtotalCents(selected) {
    let total = 0;
    for (const item of selected) {
      const priceCents = Math.round(Number(item.price) * 100);
      const quantity = Number(item.quantity);
      if (!Number.isInteger(priceCents) || priceCents < 0 ||
          !Number.isInteger(quantity) || quantity < 1 || quantity > 100) return null;
      total += priceCents * quantity;
    }
    return total;
  }

  return { requiredMachineKind, planMachineLoads, addonSubtotalCents };
}));
