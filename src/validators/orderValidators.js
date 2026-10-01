"use strict";

const { HttpError } = require("../middleware/httpError");

const LOAD_TYPES = ["wash_fold", "wash_only", "dry_only", "fold_only"];
const WEIGHT_LOADS = LOAD_TYPES;
const STATUSES = [
  "new",
  "waiting",
  "washing",
  "drying",
  "folding",
  "ready",
  "completed",
];
const PAYMENT_METHODS = ["cash", "gcash", "card"];

/** new -> waiting -> washing -> drying -> folding -> ready -> completed. */
const NEXT_STATUS = {
  new: "waiting",
  waiting: "washing",
  washing: "drying",
  drying: "folding",
  folding: "ready",
  ready: "completed",
  completed: null,
};

function fail(errors) {
  if (errors.length > 0) {
    throw new HttpError(400, "Validation failed", errors);
  }
}

function objectBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Validation failed', [
      { field: 'body', message: 'Request body must be a JSON object' },
    ]);
  }
  return body;
}

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function validateText(errors, value, field, maxLength, required = false) {
  if (isBlank(value)) {
    if (required) errors.push({ field, message: `${field} is required` });
    return;
  }
  if (typeof value !== 'string') {
    errors.push({ field, message: `${field} must be text` });
  } else if (value.trim().length > maxLength) {
    errors.push({ field, message: `${field} must be ${maxLength} characters or fewer` });
  }
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function parseId(raw, fieldName = "id") {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    throw new HttpError(400, "Validation failed", [
      {
        field: fieldName,
        message: `${fieldName} must be a positive whole number`,
      },
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
  body = objectBody(body);
  const errors = [];
  const {
    customer_id: customerId,
    name,
    phone,
    load_type: loadType,
    wash_machine_type: washMachineType,
    dry_machine_type: dryMachineType,
    note,
    addons = [],
    due_date: dueDate,
  } = body;
  const hasCustomerId = !isBlank(customerId);
  if (hasCustomerId) {
    if (!Number.isInteger(Number(customerId)) || Number(customerId) < 1) {
      errors.push({
        field: "customer_id",
        message: "customer_id must be a positive whole number",
      });
    }
  } else {
    validateText(errors, name, 'name', 120, true);
    validateText(errors, phone, 'phone', 40, true);
  }
  validateText(errors, note, 'note', 500);
  if (!isBlank(dueDate) && !isValidDate(dueDate)) {
    errors.push({ field: 'due_date', message: 'due_date must be a valid date in YYYY-MM-DD format' });
  }

  if (!Array.isArray(addons)) {
    errors.push({ field: 'addons', message: 'addons must be an array' });
  } else {
    const seenAddonIds = new Set();
    addons.forEach((addon, index) => {
      if (!addon || typeof addon !== 'object' || Array.isArray(addon)) {
        errors.push({ field: `addons[${index}]`, message: 'Each add-on must be an object' });
        return;
      }
      const id = Number(addon.id);
      const quantity = Number(addon.quantity ?? 1);
      if (!Number.isInteger(id) || id < 1) {
        errors.push({ field: `addons[${index}].id`, message: 'Add-on id must be a positive whole number' });
      } else if (seenAddonIds.has(id)) {
        errors.push({ field: `addons[${index}].id`, message: 'Add-ons cannot be duplicated' });
      } else {
        seenAddonIds.add(id);
      }
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
        errors.push({ field: `addons[${index}].quantity`, message: 'Add-on quantity must be a whole number from 1 to 100' });
      }
    });
  }

  if (!LOAD_TYPES.includes(loadType)) {
    errors.push({
      field: "load_type",
      message: `load_type must be one of: ${LOAD_TYPES.join(", ")}`,
    });
  }

  let weightKg = null;
  let itemCount = null;

  if (WEIGHT_LOADS.includes(loadType)) {
    weightKg = Number(body.weight_kg);
    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      errors.push({
        field: "weight_kg",
        message: "weight_kg must be a number greater than 0 for this load type",
      });
    } else if (weightKg > 100) {
      errors.push({
        field: "weight_kg",
        message: "weight_kg looks wrong: the maximum is 100",
      });
    }
  } else if (LOAD_TYPES.includes(loadType)) {
    itemCount = Number(body.item_count);
    if (!Number.isInteger(itemCount) || itemCount <= 0) {
      errors.push({
        field: "item_count",
        message:
          "item_count must be a whole number greater than 0 for this load type",
      });
    }
  }

  if (["wash_fold", "wash_only"].includes(loadType)) {
    if (!["regular", "titan"].includes(washMachineType)) {
      errors.push({
        field: "wash_machine_type",
        message: "wash_machine_type must be regular or titan",
      });
    }
  }

  if (["wash_fold", "dry_only"].includes(loadType)) {
    if (!["regular", "titan"].includes(dryMachineType)) {
      errors.push({
        field: "dry_machine_type",
        message: "dry_machine_type must be regular or titan",
      });
    }
  }

  fail(errors);

  return {
    customerId: hasCustomerId ? Number(customerId) : null,
    name: hasCustomerId ? null : String(name).trim(),
    phone: hasCustomerId ? null : String(phone).trim(),
    loadType,
    weightKg: weightKg === null ? null : Number(weightKg.toFixed(2)),
    itemCount,
    washMachineType: washMachineType || null,
dryMachineType: dryMachineType || null,
    note: isBlank(note) ? null : String(note).trim(),
    dueDate: isBlank(dueDate) ? null : dueDate,
    addons: addons.map((addon) => ({
      id: Number(addon.id),
      quantity: Number(addon.quantity ?? 1),
    })),
  };
}

function validateStatusChange(currentStatus, body = {}) {
  body = objectBody(body);
  const { status, note } = body;

  const textErrors = [];
  validateText(textErrors, note, 'note', 500);
  fail(textErrors);

  if (!STATUSES.includes(status)) {
    throw new HttpError(400, "Validation failed", [
      {
        field: "status",
        message: `status must be one of: ${STATUSES.join(", ")}`,
      },
    ]);
  }

  if (status === currentStatus) {
    throw new HttpError(
      409,
      `This order is already marked ${status.replace("_", " ")}`,
    );
  }

  if (NEXT_STATUS[currentStatus] !== status) {
    const expected = NEXT_STATUS[currentStatus];
    throw new HttpError(
      409,
      expected
        ? `An order that is ${currentStatus.replace("_", " ")} can only move to ${expected.replace("_", " ")}`
        : "This order is completed and cannot change again",
    );
  }

  return { status, note: isBlank(note) ? null : String(note).trim() };
}

function validatePayment(body = {}) {
  body = objectBody(body);
  const errors = [];
  const amount = Number(body.amount);

  if (!Number.isFinite(amount) || amount < 0) {
    errors.push({
      field: "amount",
      message: "amount must be a number of 0 or more",
    });
  } else if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7) {
    errors.push({
      field: 'amount',
      message: 'amount must have no more than two decimal places',
    });
  }
  if (!PAYMENT_METHODS.includes(body.method)) {
    errors.push({
      field: "method",
      message: `method must be one of: ${PAYMENT_METHODS.join(", ")}`,
    });
  }

  fail(errors);
  return { amount: Number(amount.toFixed(2)), method: body.method };
}

function validateNewCustomer(body = {}) {
  body = objectBody(body);
  const errors = [];
  validateText(errors, body.name, 'name', 120, true);
  validateText(errors, body.phone, 'phone', 40, true);
  validateText(errors, body.notes, 'notes', 500);
  fail(errors);

  return {
    name: String(body.name).trim(),
    phone: String(body.phone).trim(),
    notes: isBlank(body.notes) ? null : String(body.notes).trim(),
  };
}

function validateCustomerUpdate(body = {}) {
  body = objectBody(body);
  const errors = [];
  const fields = ['name', 'phone', 'notes'];
  if (!fields.some((field) => Object.hasOwn(body, field))) {
    throw new HttpError(400, 'Validation failed', [
      { field: 'body', message: 'At least one customer field must be provided' },
    ]);
  }

  if (Object.hasOwn(body, 'name')) validateText(errors, body.name, 'name', 120, true);
  if (Object.hasOwn(body, 'phone')) validateText(errors, body.phone, 'phone', 40, true);
  if (Object.hasOwn(body, 'notes')) validateText(errors, body.notes, 'notes', 500);
  fail(errors);

  return {
    ...(Object.hasOwn(body, 'name') ? { name: body.name.trim() } : {}),
    ...(Object.hasOwn(body, 'phone') ? { phone: body.phone.trim() } : {}),
    ...(Object.hasOwn(body, 'notes') ? { notes: isBlank(body.notes) ? null : body.notes.trim() } : {}),
  };
}

function validateMachineLoad(body = {}) {
  body = objectBody(body);
  const errors = [];

  const machineId = Number(body.machine_id);
  const loadNumber = Number(body.load_number);
  const weightKg = Number(body.weight_kg);

  if (!Number.isInteger(machineId) || machineId < 1) {
    errors.push({
      field: "machine_id",
      message: "machine_id must be a positive whole number",
    });
  }

  if (!Number.isInteger(loadNumber) || loadNumber < 1) {
    errors.push({
      field: "load_number",
      message: "load_number must be a positive whole number",
    });
  }

  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    errors.push({
      field: "weight_kg",
      message: "weight_kg must be a number greater than 0",
    });
  }

  if (weightKg > 10) {
    errors.push({
      field: "weight_kg",
      message: "weight_kg cannot exceed 10 for a single machine load",
    });
  }

  fail(errors);

  return {
    machineId,
    loadNumber,
    weightKg: Number(weightKg.toFixed(2)),
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
  validateCustomerUpdate,
  validateMachineLoad,
};
