'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const initializeMainTabs = require('../public/tabs');
const workflow = require('../public/workflow');

class FakeElement {
  constructor(dataset = {}) {
    this.dataset = dataset;
    this.hidden = false;
    this.tabIndex = 0;
    this.listeners = {};
    this.attributes = {};
    this.classList = {
      values: new Set(),
      toggle(name, enabled) {
        if (enabled) this.values.add(name);
        else this.values.delete(name);
      },
    };
  }

  addEventListener(type, listener) { this.listeners[type] = listener; }
  setAttribute(name, value) { this.attributes[name] = value; }
  getAttribute(name) { return this.attributes[name] ?? null; }
  focus() { this.focused = true; }
}

function makeTabDocument() {
  const names = ['orders', 'kanban', 'inventory', 'customers', 'reports', 'management'];
  const tabs = names.map((name) => new FakeElement({ tab: name }));
  tabs[0].setAttribute('aria-selected', 'true');
  const panels = names.map((name) => new FakeElement({ panel: name }));
  const newOrderButton = new FakeElement();
  const formState = { productBrand: 'Ariel', product: 'Sunrise Fresh', search: 'softener', lowStockOnly: true };

  return {
    tabs,
    panels,
    newOrderButton,
    formState,
    document: {
      querySelectorAll(selector) {
        if (selector === '.main-tab') return tabs;
        if (selector === '.tab-panel') return panels;
        return [];
      },
      getElementById(id) {
        return id === 'openNewOrder' ? newOrderButton : null;
      },
    },
  };
}

function press(tab, key) {
  const event = { key, prevented: false, preventDefault() { this.prevented = true; } };
  tab.listeners.keydown(event);
  return event;
}

test('main tabs switch panels, update accessibility state, and preserve inventory form state', () => {
  const ui = makeTabDocument();
  initializeMainTabs(ui.document);

  assert.equal(ui.panels.filter((panel) => !panel.hidden).length, 1);
  assert.equal(ui.panels[0].hidden, false);
  assert.equal(ui.tabs[0].tabIndex, 0);

  ui.tabs[2].listeners.click();
  assert.equal(ui.panels[2].hidden, false);
  assert.equal(ui.panels.filter((panel) => !panel.hidden).length, 1);
  assert.equal(ui.tabs[2].getAttribute('aria-selected'), 'true');
  assert.equal(ui.tabs[0].getAttribute('aria-selected'), 'false');
  assert.equal(ui.tabs[2].tabIndex, 0);
  assert.equal(ui.newOrderButton.hidden, true);
  assert.deepEqual(ui.formState, {
    productBrand: 'Ariel',
    product: 'Sunrise Fresh',
    search: 'softener',
    lowStockOnly: true,
  });
});

test('workflow helpers request machines on the stage that starts each service', () => {
  assert.equal(workflow.requiredMachineKind('wash_fold', 'waiting'), null);
  assert.equal(workflow.requiredMachineKind('wash_only', 'waiting'), null);
  assert.equal(workflow.requiredMachineKind('wash_fold', 'washing'), 'washer');
  assert.equal(workflow.requiredMachineKind('wash_only', 'washing'), 'washer');
  assert.equal(workflow.requiredMachineKind('wash_fold', 'drying'), 'dryer');
  assert.equal(workflow.requiredMachineKind('dry_only', 'drying'), 'dryer');
  assert.equal(workflow.requiredMachineKind('dry_only', 'washing'), null);
  assert.equal(workflow.requiredMachineKind('wash_only', 'drying'), null);
  assert.equal(workflow.requiredMachineKind('fold_only', 'waiting'), null);
  assert.equal(workflow.requiredMachineKind('fold_only', 'drying'), null);
});

test('washer and dryer options format their capacity and machine type consistently', () => {
  assert.equal(workflow.machineDetailsLabel({ capacity_kg: 8, machine_type: 'regular' }),
    'Capacity: 8 kg · Type: Regular');
  assert.equal(workflow.machineDetailsLabel({ capacity_kg: 10, machine_type: 'titan' }),
    'Capacity: 10 kg · Type: Titan');
});

test('workflow load plan uses capacity splits and exact hundredth-kg totals', () => {
  const plan = workflow.planMachineLoads(18, [
    { id: 1, capacity_kg: 8 },
    { id: 2, capacity_kg: 10 },
    { id: 3, capacity_kg: 8 },
  ]);
  assert.deepEqual(plan, [
    { machine_id: 2, weight_kg: 10 },
    { machine_id: 1, weight_kg: 8 },
  ]);
  assert.equal(workflow.planMachineLoads(18.01, [
    { id: 1, capacity_kg: 8 }, { id: 2, capacity_kg: 10 },
  ]), null);
  assert.equal(workflow.planMachineLoads(0, [{ id: 1, capacity_kg: 10 }]), null);
});

test('workflow add-on subtotal uses integer cents and rejects invalid quantities', () => {
  assert.equal(workflow.addonSubtotalCents([
    { price: 15.5, quantity: 2 }, { price: 0.1, quantity: 3 },
  ]), 3130);
  assert.equal(workflow.addonSubtotalCents([{ price: 1, quantity: 0 }]), null);
  assert.equal(workflow.addonSubtotalCents([
    { price: 1, quantity: 0 }, { price: 1, quantity: 1 },
  ]), null);
});

test('completion preview recalculates updated total and remaining balance in cents', () => {
  assert.deepEqual(workflow.completionTotals(180, 50, 2500), {
    currentTotalCents: 18000,
    addonSubtotalCents: 2500,
    updatedTotalCents: 20500,
    remainingBalanceCents: 15500,
  });
  assert.equal(workflow.completionTotals(25, 30, 0).remainingBalanceCents, 0);
  assert.equal(workflow.completionTotals('invalid', 0, 100), null);
});

test('completion catalog includes Folding and separates products for every service type', () => {
  const expected = [
    ['Folding', 20],
    ['Ariel — Sunrise Fresh', 10],
    ['Downy — Antibac', 10],
    ['Downy — Sunrise', 10],
    ['Surf — Fabcon Sunbloom', 10],
    ['Surf — Liquid Detergent Rose Fresh', 10],
    ['Tide — Garden Bloom', 10],
    ['Champion — Original', 10],
    ['Zonrox — Colorsafe', 5],
  ];
  const addons = expected.map(([name, price], index) => ({ id: index + 1, name, price }));
  addons.push(
    { id: 100, name: 'Completion add-on 1790844211705', price: 12.34 },
    { id: 101, name: 'Completion add-on 1790846241322', price: 12.34 },
  );
  for (const loadType of ['wash_fold', 'wash_only', 'dry_only', 'fold_only']) {
    const catalog = workflow.partitionCompletionAddons(addons);
    assert.deepEqual(catalog.folding.map((addon) => addon.name), ['Folding'], loadType);
    assert.deepEqual(catalog.products.map((addon) => addon.name), expected.slice(1).map(([name]) => name), loadType);
    assert.deepEqual([...catalog.folding, ...catalog.products].map(({ name, price }) => [name, price]), expected, loadType);
  }
  const previouslySelected = workflow.partitionCompletionAddons(addons, [1]);
  assert.equal(previouslySelected.folding.length, 0);
  assert.equal(previouslySelected.alreadyIncluded[0].name, 'Folding');
  assert.ok(![...previouslySelected.folding, ...previouslySelected.products]
    .some((addon) => addon.name.startsWith('Completion add-on ')));
});

test('completion selection confirms only checked add-ons or explicitly skips all', () => {
  assert.deepEqual(workflow.buildAddonSelection('add', [
    { id: 1, quantity: 9, isService: true },
    { id: 2, quantity: '3', isService: false },
  ]), {
    addon_decision: 'add',
    addons: [{ id: 1, quantity: 1 }, { id: 2, quantity: 3 }],
  });
  assert.deepEqual(workflow.buildAddonSelection('skip', [
    { id: 1, quantity: 1, isService: true },
  ]), { addon_decision: 'skip', addons: [] });
});

test('main tabs support arrow, Home and End keyboard navigation', () => {
  const ui = makeTabDocument();
  initializeMainTabs(ui.document);

  assert.equal(press(ui.tabs[0], 'ArrowRight').prevented, true);
  assert.equal(ui.tabs[1].getAttribute('aria-selected'), 'true');
  assert.equal(ui.tabs[1].focused, true);
  assert.equal(ui.newOrderButton.hidden, false);

  press(ui.tabs[1], 'End');
  assert.equal(ui.tabs[5].getAttribute('aria-selected'), 'true');
  assert.equal(ui.tabs[5].focused, true);

  press(ui.tabs[5], 'Home');
  assert.equal(ui.tabs[0].getAttribute('aria-selected'), 'true');
  assert.equal(ui.tabs[0].focused, true);
});
