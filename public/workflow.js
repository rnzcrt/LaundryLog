'use strict';

(function attachWorkflowHelpers(root, factory) {
  const helpers = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = helpers;
  if (root) root.LaundryLogWorkflow = helpers;
}(typeof globalThis === 'undefined' ? this : globalThis, () => {
  const WASHERS = new Set(['wash_fold', 'wash_only']);
  const DRYERS = new Set(['wash_fold', 'dry_only']);
  const COMPLETION_ADDON_NAMES = new Set([
    'Folding',
    'Ariel — Sunrise Fresh',
    'Downy — Antibac',
    'Downy — Sunrise',
    'Surf — Fabcon Sunbloom',
    'Surf — Liquid Detergent Rose Fresh',
    'Tide — Garden Bloom',
    'Champion — Original',
    'Zonrox — Colorsafe',
  ]);

  function requiredMachineKind(loadType, destination) {
    if (destination === 'washing' && WASHERS.has(loadType)) return 'washer';
    if (destination === 'drying' && DRYERS.has(loadType)) return 'dryer';
    return null;
  }

  function machineDetailsLabel(machine) {
    const capacity = Number(machine.capacity_kg);
    const rawType = String(machine.machine_type || '');
    const type = rawType ? rawType[0].toUpperCase() + rawType.slice(1).toLowerCase() : 'Unknown';
    return `Capacity: ${capacity} kg · Type: ${type}`;
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

  function completionTotals(orderTotal, paidAmount, addonCents) {
    const currentTotalCents = Math.round(Number(orderTotal) * 100);
    const paidCents = Math.round(Number(paidAmount || 0) * 100);
    const addonSubtotal = Number(addonCents);
    if (![currentTotalCents, paidCents, addonSubtotal].every(Number.isSafeInteger) ||
        currentTotalCents < 0 || paidCents < 0 || addonSubtotal < 0) return null;
    const updatedTotalCents = currentTotalCents + addonSubtotal;
    return {
      currentTotalCents,
      addonSubtotalCents: addonSubtotal,
      updatedTotalCents,
      remainingBalanceCents: Math.max(0, updatedTotalCents - paidCents),
    };
  }

  function partitionCompletionAddons(addons, existingAddonIds = []) {
    const existing = new Set(existingAddonIds.map(Number));
    const catalog = addons.filter((addon) => COMPLETION_ADDON_NAMES.has(addon.name));
    const alreadyIncluded = catalog.filter((addon) => existing.has(Number(addon.id)));
    const selectable = catalog.filter((addon) => !existing.has(Number(addon.id)));
    return {
      alreadyIncluded,
      folding: selectable.filter((addon) => addon.name === 'Folding'),
      products: selectable.filter((addon) => addon.name !== 'Folding'),
    };
  }

  function buildAddonSelection(decision, selected) {
    if (decision === 'skip') return { addon_decision: 'skip', addons: [] };
    return {
      addon_decision: 'add',
      addons: selected.map((item) => ({
        id: Number(item.id),
        quantity: item.isService ? 1 : Number(item.quantity),
      })),
    };
  }

  return {
    requiredMachineKind,
    machineDetailsLabel,
    planMachineLoads,
    addonSubtotalCents,
    completionTotals,
    partitionCompletionAddons,
    buildAddonSelection,
  };
}));
