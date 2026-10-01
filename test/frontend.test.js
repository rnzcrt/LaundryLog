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
  const formState = { productName: 'unsaved detergent', search: 'softener', lowStockOnly: true };

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
    productName: 'unsaved detergent',
    search: 'softener',
    lowStockOnly: true,
  });
});

test('workflow helpers request only the machines required by the service stage', () => {
  assert.equal(workflow.requiredMachineKind('wash_fold', 'waiting'), 'washer');
  assert.equal(workflow.requiredMachineKind('wash_only', 'waiting'), 'washer');
  assert.equal(workflow.requiredMachineKind('wash_fold', 'drying'), 'dryer');
  assert.equal(workflow.requiredMachineKind('dry_only', 'drying'), 'dryer');
  assert.equal(workflow.requiredMachineKind('dry_only', 'waiting'), null);
  assert.equal(workflow.requiredMachineKind('wash_only', 'drying'), null);
  assert.equal(workflow.requiredMachineKind('fold_only', 'waiting'), null);
  assert.equal(workflow.requiredMachineKind('fold_only', 'drying'), null);
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
