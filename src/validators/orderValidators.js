'use strict';

const { HttpError } = require('../middleware/httpError');

const LOAD_TYPES = ['wash_fold', 'wash_only', 'dry_clean', 'press_only'];
const WEIGHT_LOADS = ['wash_fold', 'wash_only'];
const STATUSES = ['received', 'washing', 'ready', 'picked_up'];
const PAYMENT_METHODS = ['cash', 'gcash', 'card'];

/** received -> washing -> ready -> picked_up, one step at a time. */
const NEXT_STATUS = {
  received: 'washing',
  washing: 'ready',
  ready: 'picked_up',
  picked_up: null,
};

function fail(errors) {
  if (errors.length > 0) {
    throw new HttpError(400, 'Validation failed', errors);
  }
}

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function parseId(raw, fieldName = 'id') {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    throw new HttpError(400, 'Validation failed', [
      { field: fieldName, message: `${fieldName} must be a positive whole number` },
    ]);
  }
  return id;
}

/**
 * A new order either names an existing customer_id or carries a new customer's
 * name and phone. Weight-based and piece-based loads are measured differently,
 * which is where most of these rules come from.
 */
function validateNewOrder(body = {}) {
  const errors = [];
  const { customer_id: customerId, name, phone, load_type: loadType, price, note } = body;

  const hasCustomerId = !isBlank(customerId);
  if (hasCustomerId) {
    if (!Number.isInteger(Number(customerId)) || Number(customerId) < 1) {
      errors.push({ field: 'customer_id', message: 'customer_id must be a positive whole number' });
    }
  } else {
    if (isBlank(name)) errors.push({ field: 'name', message: 'Customer name is required' });
    if (isBlank(phone)) errors.push({ field: 'phone', message: 'Customer phone is required' });
  }

  if (!LOAD_TYPES.includes(loadType)) {
    errors.push({ field: 'load_type', message: `load_type must be one of: ${LOAD_TYPES.join(', ')}` });
  }

  let weightKg = null;
  let itemCount = null;

  if (WEIGHT_LOADS.includes(loadType)) {
    weightKg = Number(body.weight_kg);
    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      errors.push({ field: 'weight_kg', message: 'weight_kg must be a number greater than 0 for this load type' });
    } else if (weightKg > 100) {
      errors.push({ field: 'weight_kg', message: 'weight_kg looks wrong: the maximum is 100' });
    }
  } else if (LOAD_TYPES.includes(loadType)) {
    itemCount = Number(body.item_count);
    if (!Number.isInteger(itemCount) || itemCount <= 0) {
      errors.push({ field: 'item_count', message: 'item_count must be a whole number greater than 0 for this load type' });
    }
  }

  const priceValue = Number(price);
  if (!Number.isFinite(priceValue) || priceValue < 0) {
    errors.push({ field: 'price', message: 'price must be a number of 0 or more' });
  }

  fail(errors);

  return {
    customerId: hasCustomerId ? Number(customerId) : null,
    name: hasCustomerId ? null : String(name).trim(),
    phone: hasCustomerId ? null : String(phone).trim(),
    loadType,
    weightKg: weightKg === null ? null : Number(weightKg.toFixed(2)),
    itemCount,
    price: Number(priceValue.toFixed(2)),
    note: isBlank(note) ? null : String(note).trim(),
  };
}

function validateStatusChange(currentStatus, body = {}) {
  const { status, note } = body;

  if (!STATUSES.includes(status)) {
    throw new HttpError(400, 'Validation failed', [
      { field: 'status', message: `status must be one of: ${STATUSES.join(', ')}` },
    ]);
  }

  if (status === currentStatus) {
    throw new HttpError(409, `This order is already marked ${status.replace('_', ' ')}`);
  }

  if (NEXT_STATUS[currentStatus] !== status) {
    const expected = NEXT_STATUS[currentStatus];
    throw new HttpError(
      409,
      expected
        ? `An order that is ${currentStatus.replace('_', ' ')} can only move to ${expected.replace('_', ' ')}`
        : 'This order is already picked up and cannot change again',
    );
  }

  return { status, note: isBlank(note) ? null : String(note).trim() };
}

function validatePayment(body = {}) {
  const errors = [];
  const amount = Number(body.amount);

  if (!Number.isFinite(amount) || amount < 0) {
    errors.push({ field: 'amount', message: 'amount must be a number of 0 or more' });
  }
  if (!PAYMENT_METHODS.includes(body.method)) {
    errors.push({ field: 'method', message: `method must be one of: ${PAYMENT_METHODS.join(', ')}` });
  }

  fail(errors);
  return { amount: Number(amount.toFixed(2)), method: body.method };
}

function validateNewCustomer(body = {}) {
  const errors = [];
  if (isBlank(body.name)) errors.push({ field: 'name', message: 'name is required' });
  if (isBlank(body.phone)) errors.push({ field: 'phone', message: 'phone is required' });
  fail(errors);

  return {
    name: String(body.name).trim(),
    phone: String(body.phone).trim(),
    notes: isBlank(body.notes) ? null : String(body.notes).trim(),
  };
}

module.exports = {
  LOAD_TYPES,
  STATUSES,
  PAYMENT_METHODS,
  NEXT_STATUS,
  parseId,
  validateNewOrder,
  validateStatusChange,
  validatePayment,
  validateNewCustomer,
};
