'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const initializeMainTabs = require('../public/tabs');

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
