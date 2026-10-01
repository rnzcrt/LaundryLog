"use strict";

const LOAD_LABELS = {
  wash_fold: "Wash + Dry + Fold",
  wash_only: "Wash Only",
  dry_only: "Dry Only",
  fold_only: "Fold Only",
  dry_clean: "Dry Clean",
  press_only: "Press Only",
};

const STATUS_LABELS = {
  new: "New",
  waiting: "Waiting",
  washing: "Washing",
  drying: "Drying",
  folding: "Folding",
  ready: "Ready",
  completed: "Completed",
};

const NEXT_STATUS = {
  new: "waiting",
  waiting: "washing",
  washing: "drying",
  drying: "folding",
  folding: "ready",
  ready: "completed",
  completed: null,
};

const ordersEl = document.getElementById("orders");
const filtersEl = document.getElementById("filters");
const kanbanEl = document.getElementById("kanbanBoard");
const feedbackEl = document.getElementById("feedback");
const newOrderDialog = document.getElementById("newOrderDialog");
const newOrderForm = document.getElementById("newOrderForm");
const formErrors = document.getElementById("formErrors");
const detailDialog = document.getElementById("detailDialog");
const detailBody = document.getElementById("detailBody");
const orderAddonsEl = document.getElementById("orderAddons");

let activeStatus = "all";
let activeOrderQuery = "";
let currentKanbanOrders = [];

/** Fetch wrapper that turns an API error body into a thrown Error. */
async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = Array.isArray(body.details)
      ? body.details.map((d) => `${d.field}: ${d.message}`).join("\n")
      : body.message || "";
    const error = new Error(
      detail ? `${body.error}\n${detail}` : body.error || "Request failed",
    );
    error.status = response.status;
    throw error;
  }

  return body;
}

function setFeedback(message, isError = false) {
  feedbackEl.textContent = message;
  feedbackEl.classList.toggle("is-error", isError);
}

function setInventoryFeedback(message, isError = false) {
  const inventoryFeedbackEl = document.getElementById("inventoryFeedback");
  inventoryFeedbackEl.textContent = message;
  inventoryFeedbackEl.classList.toggle("is-error", isError);
}

function measure(order) {
  return order.weight_kg
    ? `${Number(order.weight_kg)}kg`
    : `${order.item_count} item${Number(order.item_count) === 1 ? "" : "s"}`;
}

function peso(value) {
  return `₱${Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

function formatDate(value) {
  return new Date(value).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatReportDate(value) {
  return new Date(`${value}T00:00:00+08:00`).toLocaleDateString("en-PH", {
    dateStyle: "medium",
    timeZone: "Asia/Manila",
  });
}

async function loadOrders() {
  try {
    const { orders } = await api("/api/orders");
    const query = activeOrderQuery.toLocaleLowerCase();
    const searchedOrders = query
      ? orders.filter((order) =>
          `${order.customer_name} ${order.customer_phone}`
            .toLocaleLowerCase()
            .includes(query),
        )
      : orders;

    renderDashboard(orders);
    renderKanban(searchedOrders);

    const visibleOrders =
      activeStatus === "all"
        ? searchedOrders
        : searchedOrders.filter((order) => order.status === activeStatus);

    renderOrders(visibleOrders);

    setFeedback(
      `${visibleOrders.length} order${visibleOrders.length === 1 ? "" : "s"} shown`,
    );
  } catch (err) {
    ordersEl.innerHTML = "";
    kanbanEl.innerHTML = "";
    setFeedback(err.message, true);
  }
}

const KANBAN_STATUSES = [
  "new",
  "waiting",
  "washing",
  "drying",
  "folding",
  "ready",
  "completed",
];

function renderKanban(orders) {
  kanbanEl.innerHTML = "";
  currentKanbanOrders = orders;

  for (const status of KANBAN_STATUSES) {
    const column = document.createElement("section");
    column.className = "kanban__column";
    column.dataset.status = status;

    const heading = document.createElement("div");
    heading.className = "kanban__heading";

    const title = document.createElement("span");
    title.textContent = STATUS_LABELS[status];

    const count = document.createElement("span");
    count.className = "kanban__count";
    count.textContent = orders.filter(
      (order) => order.status === status,
    ).length;

    heading.append(title, count);

    const cards = document.createElement("div");
    cards.className = "kanban__cards";

    const stageOrders = orders.filter((order) => order.status === status);

    for (const order of stageOrders) {
      const card = document.createElement("button");
      card.className = "card kanban__card";
      card.type = "button";
      card.draggable = status !== "completed";
      card.dataset.orderId = order.id;
      card.dataset.status = order.status;
      card.addEventListener("click", () => openDetail(order.id));

      const name = document.createElement("p");
      name.className = "card__name";
      name.textContent = order.customer_name;

      const meta = document.createElement("p");
      meta.className = "card__meta";
      meta.textContent = `${LOAD_LABELS[order.load_type]}, ${measure(order)}`;

      const price = document.createElement("p");
      price.className = "card__price";
      price.textContent = peso(order.price);

      const tag = document.createElement("span");
      tag.className = `tag tag--${order.status}`;
      tag.textContent = STATUS_LABELS[order.status];

      card.append(name, meta, price, tag);
      cards.append(card);
    }

    if (stageOrders.length === 0) {
      const empty = document.createElement("p");
      empty.className = "kanban__empty";
      empty.textContent = "No orders";
      cards.append(empty);
    }

    column.append(heading, cards);
    kanbanEl.append(column);
  }
}

kanbanEl.addEventListener("dragstart", (event) => {
  const card = event.target.closest(".kanban__card");
  if (!card || !card.draggable) return;

  event.dataTransfer.setData("text/plain", card.dataset.orderId);
  event.dataTransfer.effectAllowed = "move";
});

kanbanEl.addEventListener("dragover", (event) => {
  const column = event.target.closest(".kanban__column");
  if (!column) return;

  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
});

kanbanEl.addEventListener("drop", async (event) => {
  const column = event.target.closest(".kanban__column");
  if (!column) return;

  event.preventDefault();

  const orderId = event.dataTransfer.getData("text/plain");
  const order = currentKanbanOrders.find((item) => String(item.id) === orderId);

  if (!order) return;

  const destination = column.dataset.status;

  if (NEXT_STATUS[order.status] !== destination) {
    setFeedback("Orders can only move one stage forward.", true);
    return;
  }

  await changeStatus(order.id, destination);
});

function renderDashboard(orders) {
  const totalOrders = orders.length;

  const totalRevenue = orders.reduce(
    (sum, order) => sum + Number(order.price || 0),
    0,
  );

  const totalCollections = orders.reduce(
    (sum, order) => sum + Number(order.paid_amount || 0),
    0,
  );

  const outstandingBalance = orders.reduce(
    (sum, order) => sum + Number(order.outstanding_amount || 0),
    0,
  );

  document.getElementById("totalOrders").textContent = totalOrders;
  document.getElementById("totalRevenue").textContent = peso(totalRevenue);
  document.getElementById("totalCollections").textContent =
    peso(totalCollections);
  document.getElementById("outstandingBalance").textContent =
    peso(outstandingBalance);
}

function renderOrders(orders) {
  ordersEl.innerHTML = "";

  if (orders.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent =
      activeStatus === "all"
        ? "No orders yet. Log the first drop-off with “New order”."
        : `Nothing is ${STATUS_LABELS[activeStatus].toLowerCase()} right now.`;
    ordersEl.append(empty);
    return;
  }

  for (const order of orders) {
    const card = document.createElement("button");
    card.className = "card";
    card.type = "button";
    card.addEventListener("click", () => openDetail(order.id));

    const name = document.createElement("p");
    name.className = "card__name";
    name.textContent = order.customer_name;

    const meta = document.createElement("p");
    meta.className = "card__meta";
    meta.textContent = `${LOAD_LABELS[order.load_type]}, ${measure(order)}`;

    const price = document.createElement("p");
    price.className = "card__price";
    price.textContent = peso(order.price);

    const tag = document.createElement("span");
    tag.className = `tag tag--${order.status}`;
    tag.textContent = STATUS_LABELS[order.status];

    card.append(name, meta, price, tag);
    ordersEl.append(card);
  }
}

async function openDetail(id) {
  try {
    const { order, history, payments = [], loads = [], addons = [] } = await api(`/api/orders/${id}`);
    detailBody.innerHTML = "";

    const title = document.createElement("h2");
    title.className = "panel__title";
    title.textContent = `Order #${order.id} — ${order.customer_name}`;

    const tag = document.createElement("span");
    tag.className = `tag tag--${order.status}`;
    tag.textContent = STATUS_LABELS[order.status];

    const rows = [
      ["Phone", order.customer_phone],
      ["Load", `${LOAD_LABELS[order.load_type]}, ${measure(order)}`],
      ["Price", peso(order.price)],
      ["Logged", formatDate(order.created_at)],
      [
        "Payment",
        `${order.payment_status} — Paid: ${peso(order.paid_amount)} — Outstanding: ${peso(order.outstanding_amount)}`,
      ],
    ];
    if (order.due_date) rows.push(["Due date", order.due_date]);
    if (order.note) rows.push(["Note", order.note]);
    if (order.completed_at) {
      rows.push(["Completed", formatDate(order.completed_at)]);
    }

    const rowsEl = document.createElement("div");
    for (const [label, value] of rows) {
      const row = document.createElement("div");
      row.className = "detail__row";
      const left = document.createElement("span");
      left.textContent = label;
      const right = document.createElement("span");
      right.textContent = value;
      row.append(left, right);
      rowsEl.append(row);
    }

    const timeline = document.createElement("ul");
    timeline.className = "timeline";
    for (const entry of history) {
      const item = document.createElement("li");
      item.textContent = `${STATUS_LABELS[entry.status]} — ${formatDate(entry.changed_at)}${entry.note ? ` (${entry.note})` : ""}`;
      timeline.append(item);
    }

    detailBody.append(title, tag, rowsEl);

    const paymentTitle = document.createElement("h3");
    paymentTitle.textContent = "Payment history";
    detailBody.append(paymentTitle);

    const paymentList = document.createElement("ul");
    paymentList.className = "timeline";

    if (payments.length === 0) {
      const emptyPayment = document.createElement("li");
      emptyPayment.textContent = "No payments recorded yet.";
      paymentList.append(emptyPayment);
    } else {
      for (const payment of payments) {
        const item = document.createElement("li");
        const method = String(payment.method || "").toUpperCase();
        item.textContent =
          `${peso(payment.amount)} — ${method} — ${formatDate(payment.paid_at)}`;
        paymentList.append(item);
      }
    }

    detailBody.append(paymentList);

    const addonsTitle = document.createElement("h3");
    addonsTitle.textContent = "Service add-ons";
    detailBody.append(addonsTitle);
    const addonList = document.createElement("ul");
    addonList.className = "timeline";
    if (addons.length === 0) {
      const emptyAddon = document.createElement("li");
      emptyAddon.textContent = "No add-ons on this order.";
      addonList.append(emptyAddon);
    } else {
      for (const addon of addons) {
        const item = document.createElement("li");
        item.textContent = `${addon.name} × ${addon.quantity} — ${peso(addon.line_total)} (${peso(addon.unit_price)} each)`;
        addonList.append(item);
      }
    }
    detailBody.append(addonList);

    const loadsTitle = document.createElement("h3");
    loadsTitle.textContent = "Machine loads";
    detailBody.append(loadsTitle);
    const loadsList = document.createElement("ul");
    loadsList.className = "timeline";
    if (loads.length === 0) {
      const emptyLoad = document.createElement("li");
      emptyLoad.textContent = "No machine loads assigned.";
      loadsList.append(emptyLoad);
    } else {
      for (const load of loads) {
        const item = document.createElement("li");
        item.textContent = `Load ${load.load_number}: ${load.machine_name} — ${Number(load.weight_kg)}kg — ${load.status}${load.notes ? ` (${load.notes})` : ""}`;
        loadsList.append(item);
      }
    }
    detailBody.append(loadsList);

    const balance = Number(order.outstanding_amount || 0);
    if (balance > 0) {
      const paymentForm = document.createElement("form");
      paymentForm.className = "payment-form";

      const amountLabel = document.createElement("label");
      amountLabel.className = "field";
      const amountText = document.createElement("span");
      amountText.textContent = `Payment amount (balance: ${peso(balance)})`;

      const amountInput = document.createElement("input");
      amountInput.type = "number";
      amountInput.name = "amount";
      amountInput.min = "0.01";
      amountInput.max = balance.toFixed(2);
      amountInput.step = "0.01";
      amountInput.required = true;
      amountInput.placeholder = "Enter amount";

      amountLabel.append(amountText, amountInput);

      const methodLabel = document.createElement("label");
      methodLabel.className = "field";
      const methodText = document.createElement("span");
      methodText.textContent = "Payment method";

      const methodSelect = document.createElement("select");
      methodSelect.name = "method";
      methodSelect.required = true;

      for (const [value, label] of [
        ["cash", "Cash"],
        ["gcash", "GCash"],
        ["card", "Card"],
      ]) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        methodSelect.append(option);
      }

      methodLabel.append(methodText, methodSelect);

      const submit = document.createElement("button");
      submit.type = "submit";
      submit.className = "button button--primary";
      submit.textContent = "Record payment";

      paymentForm.append(amountLabel, methodLabel, submit);
      paymentForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        submit.disabled = true;

        try {
          await api(`/api/orders/${id}/payment`, {
            method: "POST",
            body: JSON.stringify({
              amount: Number(amountInput.value),
              method: methodSelect.value,
            }),
          });

          await loadOrders();
          await openDetail(id);
          setFeedback(`Payment recorded for order #${id}.`);
        } catch (err) {
          setFeedback(err.message, true);
          submit.disabled = false;
        }
      });

      detailBody.append(paymentForm);
    }

    detailBody.append(timeline);

    const next = NEXT_STATUS[order.status];
    if (next) {
      const advance = document.createElement("button");
      advance.className = "button button--accent detail__advance";
      advance.textContent = `Mark as ${STATUS_LABELS[next].toLowerCase()}`;
      advance.addEventListener("click", () => changeStatus(order.id, next));
      detailBody.append(advance);
    }

    detailDialog.showModal();
  } catch (err) {
    setFeedback(err.message, true);
  }
}

async function openCustomerHistory(id) {
  try {
    const { customer, orders, summary } = await api(`/api/customers/${id}`);
    detailBody.innerHTML = "";

    const title = document.createElement("h2");
    title.className = "panel__title";
    title.textContent = `Customer — ${customer.name}`;

    const phone = document.createElement("p");
    phone.textContent = customer.phone;

    const historyTitle = document.createElement("h3");
    historyTitle.textContent = `Order history (${orders.length})`;

    detailBody.append(title, phone, historyTitle);

    const spending = document.createElement("p");
    spending.textContent = `Spending: ${peso(summary.spending)} — Paid: ${peso(summary.paid)} — Outstanding: ${peso(summary.outstanding)}`;
    detailBody.append(spending);

    const editForm = document.createElement("form");
    editForm.className = "customer-edit form";
    for (const [name, labelText, value] of [
      ["name", "Customer name", customer.name],
      ["phone", "Phone", customer.phone],
      ["notes", "Notes", customer.notes || ""],
    ]) {
      const label = document.createElement("label");
      label.className = "field";
      const span = document.createElement("span");
      span.textContent = labelText;
      const input = document.createElement("input");
      input.name = name;
      input.value = value;
      input.maxLength = name === "name" ? 120 : name === "phone" ? 40 : 500;
      input.required = name !== "notes";
      label.append(span, input);
      editForm.append(label);
    }
    const save = document.createElement("button");
    save.className = "button button--secondary";
    save.type = "submit";
    save.textContent = "Save customer";
    editForm.append(save);
    editForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      save.disabled = true;
      try {
        const values = Object.fromEntries(new FormData(editForm));
        await api(`/api/customers/${id}`, {
          method: "PATCH",
          body: JSON.stringify(values),
        });
        await openCustomerHistory(id);
        setFeedback("Customer details updated.");
      } catch (err) {
        setCustomerFeedback(err.message, true);
        save.disabled = false;
      }
    });
    detailBody.append(editForm);

    if (orders.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "No orders yet.";
      detailBody.append(empty);
    } else {
      const list = document.createElement("ul");
      list.className = "timeline";

      for (const order of orders) {
        const item = document.createElement("li");
        item.textContent =
          `Order #${order.id} — ${LOAD_LABELS[order.load_type]}, ` +
          `${measure(order)} — ${peso(order.price)} — ` +
          `${STATUS_LABELS[order.status]} — ${formatDate(order.created_at)}`;
        list.append(item);
      }

      detailBody.append(list);
    }

    if (!detailDialog.open) detailDialog.showModal();
  } catch (err) {
    setCustomerFeedback(err.message, true);
  }
}

async function changeStatus(id, status) {
  try {
    await api(`/api/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    detailDialog.close();
    await loadOrders();
    setFeedback(`Order #${id} is now ${STATUS_LABELS[status].toLowerCase()}`);
  } catch (err) {
    setFeedback(err.message, true);
  }
}

/* Events ------------------------------------------------------------- */

filtersEl.addEventListener("click", (event) => {
  const button = event.target.closest(".filter");
  if (!button) return;
  activeStatus = button.dataset.status;
  filtersEl
    .querySelectorAll(".filter")
    .forEach((el) => el.classList.toggle("is-active", el === button));
  loadOrders();
});

const orderSearch = document.getElementById("orderSearch");
let orderSearchTimer;
orderSearch.addEventListener("input", () => {
  activeOrderQuery = orderSearch.value.trim();
  clearTimeout(orderSearchTimer);
  orderSearchTimer = setTimeout(loadOrders, 150);
});

const loadTypeField = document.getElementById("loadType");
const washMachineField = document.getElementById("washMachineField");
const dryMachineField = document.getElementById("dryMachineField");

function updateOrderFormFields() {
  const loadType = loadTypeField.value;

  const needsWeight = [
    "wash_fold",
    "wash_only",
    "dry_only",
    "fold_only",
  ].includes(loadType);
  const needsWashMachine = ["wash_fold", "wash_only"].includes(loadType);
  const needsDryMachine = ["wash_fold", "dry_only"].includes(loadType);

  document
    .getElementById("weightField")
    .classList.toggle("is-hidden", !needsWeight);
  document
    .getElementById("itemsField")
    .classList.toggle("is-hidden", needsWeight);

  washMachineField.classList.toggle("is-hidden", !needsWashMachine);
  dryMachineField.classList.toggle("is-hidden", !needsDryMachine);
}

async function loadOrderAddons() {
  try {
    const { addons } = await api('/api/addons');
    orderAddonsEl.replaceChildren();
    if (addons.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No service add-ons configured.';
      orderAddonsEl.append(empty);
      return;
    }
    for (const addon of addons) {
      const label = document.createElement('label');
      label.className = 'addon-choice';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.name = `addon_${addon.id}`;
      input.value = addon.id;
      input.dataset.price = Number(addon.price);
      const text = document.createElement('span');
      text.textContent = `${addon.name} (+${peso(addon.price)})`;
      label.append(input, text);
      orderAddonsEl.append(label);
      input.addEventListener('change', updateAddonPreview);
    }
    updateAddonPreview();
  } catch (err) {
    orderAddonsEl.textContent = 'Unable to load add-ons.';
  }
}

function updateAddonPreview() {
  const selectedTotal = [...orderAddonsEl.querySelectorAll('input:checked')]
    .reduce((sum, input) => sum + Number(input.dataset.price || 0), 0);
  document.getElementById('pricePreview').textContent =
    `Base price is calculated from the service and machine type. Selected add-ons: ${peso(selectedTotal)}.`;
}

loadTypeField.addEventListener("change", updateOrderFormFields);
updateOrderFormFields();

document.getElementById("openNewOrder").addEventListener("click", () => {
  formErrors.textContent = "";
  newOrderDialog.showModal();
});

document
  .getElementById("cancelNewOrder")
  .addEventListener("click", () => newOrderDialog.close());
document
  .getElementById("closeDetail")
  .addEventListener("click", () => detailDialog.close());

newOrderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  formErrors.textContent = "";

    const data = Object.fromEntries(new FormData(newOrderForm));
    data.addons = [...orderAddonsEl.querySelectorAll('input:checked')]
      .map((input) => ({ id: Number(input.value), quantity: 1 }));
    for (const key of Object.keys(data)) {
      if (key.startsWith('addon_')) delete data[key];
    }

  const byWeight = ["wash_fold", "wash_only", "dry_only", "fold_only"].includes(
    data.load_type,
  );

  if (byWeight) {
    delete data.item_count;
  } else {
    delete data.weight_kg;
  }

  try {
    const { order } = await api("/api/orders", {
      method: "POST",
      body: JSON.stringify(data),
    });

    newOrderDialog.close();
    newOrderForm.reset();
    updateOrderFormFields();
    updateAddonPreview();

    await loadOrders();

    setFeedback(
      `Order #${order.id} logged for ${order.customer_name} — ₱${Number(order.price).toFixed(2)}`,
    );
  } catch (err) {
    formErrors.textContent = err.message;
  }
});

const reportForm = document.getElementById("reportForm");
const reportFrom = document.getElementById("reportFrom");
const reportTo = document.getElementById("reportTo");
const reportSales = document.getElementById("reportSales");
const reportCollections = document.getElementById("reportCollections");
const reportOutstanding = document.getElementById("reportOutstanding");
const reportDaily = document.getElementById("reportDaily");

function manilaDateString() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const part = (type) => parts.find((item) => item.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

async function loadReport() {
  if (!reportFrom.value || !reportTo.value) return;

  if (reportFrom.value > reportTo.value) {
    setFeedback("Report start date must be on or before end date.", true);
    return;
  }

  const params = new URLSearchParams({
    from: reportFrom.value,
    to: reportTo.value,
  });

  try {
    const report = await api(`/api/reports/summary?${params.toString()}`);

    reportSales.textContent = peso(report.sales);
    reportCollections.textContent = peso(report.collections);
    reportOutstanding.textContent = peso(report.outstanding);
    reportDaily.replaceChildren();

    if (!report.daily.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 3;
      cell.className = "report-empty";
      cell.textContent = "No activity in this date range.";
      row.append(cell);
      reportDaily.append(row);
      return;
    }

    for (const day of report.daily) {
      const row = document.createElement("tr");
      const dateCell = document.createElement("td");
      const salesCell = document.createElement("td");
      const collectionsCell = document.createElement("td");

      dateCell.textContent = formatReportDate(day.date);
      salesCell.textContent = peso(day.sales);
      collectionsCell.textContent = peso(day.collections);

      row.append(dateCell, salesCell, collectionsCell);
      reportDaily.append(row);
    }
  } catch (err) {
    setFeedback(err.message, true);
  }
}

reportForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadReport();
});

const todayForReport = manilaDateString();
reportFrom.value = todayForReport;
reportTo.value = todayForReport;
loadReport();

loadOrders();
loadOrderAddons();

const customerSearch = document.getElementById("customerSearch");
const customersEl = document.getElementById("customers");
const customerForm = document.getElementById("customerForm");
const customerFeedback = document.getElementById("customerFeedback");

function setCustomerFeedback(message, isError = false) {
  customerFeedback.textContent = message;
  customerFeedback.classList.toggle("is-error", isError);
}

customerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = customerForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  setCustomerFeedback("");
  try {
    const customer = Object.fromEntries(new FormData(customerForm));
    await api("/api/customers", {
      method: "POST",
      body: JSON.stringify(customer),
    });
    customerForm.reset();
    customerSearch.value = "";
    setCustomerFeedback("Customer added.");
    await refreshCustomers();
  } catch (err) {
    setCustomerFeedback(
      err.status === 409
        ? "A customer with that phone number already exists. Search for the existing customer to edit their details."
        : err.message,
      true,
    );
  } finally {
    submit.disabled = false;
  }
});

async function loadCustomers(query = "") {
  const params = new URLSearchParams();

  if (query.trim()) {
    params.set("q", query.trim());
  }

  const response = await fetch(`/api/customers?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Unable to load customers");
  }

  const data = await response.json();
  return data.customers;
}
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderCustomers(customers) {
  if (!customers.length) {
    customersEl.innerHTML = '<p class="empty">No customers found.</p>';
    return;
  }

  customersEl.innerHTML = `
    <div class="customer-table-wrap">
      <table class="customer-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Phone number</th>
            <th class="customer-actions-heading">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${customers
            .map(
              (customer) => `
                <tr>
                  <td class="customer-name">${escapeHtml(customer.name)}</td>
                  <td>${escapeHtml(customer.phone)}</td>
                  <td class="customer-actions">
                    <button
                      class="button button--secondary customer-history"
                      data-customer-id="${customer.id}"
                    >
                      View history
                    </button>
                  </td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

async function refreshCustomers(query = "") {
  try {
    const customers = await loadCustomers(query);
    renderCustomers(customers);
  } catch (err) {
    customersEl.innerHTML = "<p>Unable to load customers.</p>";
    console.error("Customer load failed:", err);
  }
}

customerSearch.addEventListener("input", () => {
  refreshCustomers(customerSearch.value);
});

refreshCustomers();

customersEl.addEventListener("click", (event) => {
  const button = event.target.closest(".customer-history");
  if (!button) return;

  openCustomerHistory(button.dataset.customerId);
});

const machinesEl = document.getElementById("machines");
const machineForm = document.getElementById("machineForm");
const managedAddonsEl = document.getElementById("managedAddons");
const addonForm = document.getElementById("addonForm");
const managementFeedback = document.getElementById("managementFeedback");

function setManagementFeedback(message, isError = false) {
  managementFeedback.textContent = message;
  managementFeedback.classList.toggle("is-error", isError);
}

async function refreshMachines() {
  try {
    const { machines } = await api("/api/machines");
    machinesEl.innerHTML = machines.length ? `
      <div class="machine-manage-list">
        ${machines.map((machine) => `
          <article class="machine-manage-card">
            <h3>${escapeHtml(machine.name)}</h3>
            <p class="management-status">${escapeHtml(machine.machine_type)} ${escapeHtml(machine.machine_kind)} · ${escapeHtml(machine.capacity_kg)} kg · ${escapeHtml(machine.status)}</p>
            <form class="machine-edit-form" data-machine-id="${Number(machine.id)}">
              <label class="field"><span>Name</span><input name="name" type="text" maxlength="120" value="${escapeHtml(machine.name)}" required /></label>
              <label class="field"><span>Type</span><select name="machine_type"><option value="regular" ${machine.machine_type === "regular" ? "selected" : ""}>Regular</option><option value="titan" ${machine.machine_type === "titan" ? "selected" : ""}>Titan</option></select></label>
              <label class="field"><span>Kind</span><select name="machine_kind"><option value="washer" ${machine.machine_kind === "washer" ? "selected" : ""}>Washer</option><option value="dryer" ${machine.machine_kind === "dryer" ? "selected" : ""}>Dryer</option></select></label>
              <label class="field"><span>Capacity (kg)</span><input name="capacity_kg" type="number" min="0.1" max="100" step="0.01" value="${escapeHtml(machine.capacity_kg)}" required /></label>
              <label class="field"><span>Availability</span><select name="status" ${machine.status === "running" ? "disabled" : ""}><option value="available" ${machine.status === "available" ? "selected" : ""}>Available</option><option value="maintenance" ${machine.status === "maintenance" ? "selected" : ""}>Maintenance</option></select></label>
              <button class="button button--secondary" type="submit">Save machine</button>
            </form>
          </article>
        `).join("")}
      </div>` : '<p class="empty">No machines have been added.</p>';
  } catch (err) {
    machinesEl.innerHTML = '<p class="empty">Unable to load machines.</p>';
    setManagementFeedback(err.message, true);
  }
}

machineForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = machineForm.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const fields = Object.fromEntries(new FormData(machineForm));
    fields.capacity_kg = Number(fields.capacity_kg);
    await api("/api/machines", { method: "POST", body: JSON.stringify(fields) });
    machineForm.reset();
    setManagementFeedback("Machine added.");
    await refreshMachines();
  } catch (err) {
    setManagementFeedback(err.message, true);
  } finally {
    button.disabled = false;
  }
});

machinesEl.addEventListener("submit", async (event) => {
  const form = event.target.closest(".machine-edit-form");
  if (!form) return;
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const fields = Object.fromEntries(new FormData(form));
    fields.capacity_kg = Number(fields.capacity_kg);
    await api(`/api/machines/${form.dataset.machineId}`, {
      method: "PATCH", body: JSON.stringify(fields),
    });
    setManagementFeedback("Machine updated.");
    await refreshMachines();
  } catch (err) {
    setManagementFeedback(err.message, true);
  } finally {
    button.disabled = false;
  }
});

async function refreshManagedAddons() {
  try {
    const { addons } = await api("/api/addons?include_inactive=true");
    managedAddonsEl.innerHTML = addons.length ? `
      <div class="addon-manage-list">
        ${addons.map((addon) => `
          <article class="addon-manage-card">
            <h3>${escapeHtml(addon.name)}</h3>
            <form class="addon-edit-form" data-addon-id="${Number(addon.id)}">
              <label class="field"><span>Name</span><input name="name" type="text" maxlength="120" value="${escapeHtml(addon.name)}" required /></label>
              <label class="field"><span>Price (₱)</span><input name="price" type="number" min="0" step="0.01" value="${escapeHtml(addon.price)}" required /></label>
              <label class="addon-choice"><input name="is_active" type="checkbox" ${addon.is_active ? "checked" : ""} /><span>Active for new orders</span></label>
              <button class="button button--secondary" type="submit">Save add-on</button>
            </form>
          </article>
        `).join("")}
      </div>` : '<p class="empty">No add-ons configured.</p>';
  } catch (err) {
    managedAddonsEl.innerHTML = '<p class="empty">Unable to load add-ons.</p>';
    setManagementFeedback(err.message, true);
  }
}

addonForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = addonForm.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const fields = Object.fromEntries(new FormData(addonForm));
    fields.price = Number(fields.price);
    await api("/api/addons", { method: "POST", body: JSON.stringify(fields) });
    addonForm.reset();
    setManagementFeedback("Add-on added.");
    await refreshManagedAddons();
  } catch (err) {
    setManagementFeedback(err.message, true);
  } finally {
    button.disabled = false;
  }
});

managedAddonsEl.addEventListener("submit", async (event) => {
  const form = event.target.closest(".addon-edit-form");
  if (!form) return;
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const fields = Object.fromEntries(new FormData(form));
    fields.price = Number(fields.price);
    fields.is_active = form.elements.is_active.checked;
    await api(`/api/addons/${form.dataset.addonId}`, {
      method: "PATCH", body: JSON.stringify(fields),
    });
    setManagementFeedback("Add-on updated. Existing order prices are unchanged.");
    await refreshManagedAddons();
  } catch (err) {
    setManagementFeedback(err.message, true);
  } finally {
    button.disabled = false;
  }
});

refreshMachines();
refreshManagedAddons();

const productForm = document.getElementById("productForm");
const productsEl = document.getElementById("products");
const productSearch = document.getElementById("productSearch");
const lowStockOnly = document.getElementById("lowStockOnly");

async function loadProducts() {
  const params = new URLSearchParams();
  if (productSearch.value.trim()) params.set("q", productSearch.value.trim());
  if (lowStockOnly.checked) params.set("low_stock", "true");
  const data = await api(`/api/products?${params.toString()}`);
  return data.products;
}

productSearch.addEventListener("input", () => refreshProducts());
lowStockOnly.addEventListener("change", () => refreshProducts());

function renderProducts(products) {
  if (!products.length) {
    productsEl.innerHTML = '<p class="empty">No products added yet.</p>';
    return;
  }

  productsEl.innerHTML = `
    <div class="inventory-table-wrap">
      <table class="inventory-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Stock</th>
            <th>Status</th>
            <th>Threshold</th>
            <th class="inventory-actions-heading">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${products
            .map((product) => {
              const stock = Number(product.stock_quantity);
              const threshold = Number(product.low_stock_threshold);
              const lowStock = stock <= threshold;
              const id = product.id;
              const unit = escapeHtml(product.unit);

              return `
              <tr>
                <td class="inventory-product-name">
                  ${escapeHtml(product.name)}
                </td>
                <td class="inventory-stock">
                  ${stock} <span>${unit}</span>
                </td>
                <td>
                  <span class="inventory-badge ${lowStock ? "inventory-badge--low" : "inventory-badge--good"}">
                    ${lowStock ? "Low stock" : "In stock"}
                  </span>
                </td>
                <td>${threshold} ${unit}</td>
                <td class="inventory-actions">
                  <details class="inventory-manage">
                    <summary>Manage</summary>
                    <div class="inventory-manage-panel">
                    <button
                      type="button"
                      class="inventory-close-button"
                      aria-label="Close manage menu"
                      >×</button>
                      <form class="product-stock-form" data-product-id="${id}">
                        <h4>Manual adjustment</h4>
                        <label class="field">
                          <span>New stock quantity (${unit})</span>
                          <input
                            type="number"
                            name="stock_quantity"
                            min="0"
                            step="0.01"
                            value="${stock}"
                            required
                          />
                        </label>
                        <button class="button button--primary" type="submit">
                          Save adjustment
                        </button>
                      </form>

                      <form class="product-movement-form" data-product-id="${id}" data-movement-type="stock_in">
                        <h4>Stock in</h4>
                        <label class="field">
                          <span>Quantity to add (${unit})</span>
                          <input type="number" name="quantity" min="0.01" step="0.01" required />
                        </label>
                        <label class="field">
                          <span>Notes (optional)</span>
                          <input type="text" name="notes" maxlength="500" />
                        </label>
                        <button class="button button--secondary" type="submit">
                          Record stock-in
                        </button>
                      </form>

                      <form class="product-movement-form" data-product-id="${id}" data-movement-type="usage">
                        <h4>Record usage</h4>
                        <label class="field">
                          <span>Quantity used (${unit})</span>
                          <input type="number" name="quantity" min="0.01" step="0.01" required />
                        </label>
                        <label class="field">
                          <span>Notes (optional)</span>
                          <input type="text" name="notes" maxlength="500" />
                        </label>
                        <button class="button button--secondary" type="submit">
                          Record usage
                        </button>
                      </form>

                      <button
                        type="button"
                        class="button button--secondary product-history-button"
                        data-product-id="${id}"
                      >
                        Show movement history
                      </button>
                      <div
                        class="product-history"
                        id="product-history-${id}"
                        aria-live="polite"
                      ></div>
                    </div>
                  </details>
                </td>
              </tr>
            `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

productsEl.addEventListener("submit", async (event) => {
  const movementForm = event.target.closest(".product-movement-form");
  const stockForm = event.target.closest(".product-stock-form");

  if (!movementForm && !stockForm) return;

  event.preventDefault();

  if (movementForm) {
    const id = movementForm.dataset.productId;
    const movement_type = movementForm.dataset.movementType;
    const quantity = Number(movementForm.elements.quantity.value);
    const notes = movementForm.elements.notes.value.trim();

    try {
      await api(`/api/products/${id}/movements`, {
        method: "POST",
        body: JSON.stringify({ movement_type, quantity, notes }),
      });

      setInventoryFeedback(
        movement_type === "stock_in"
          ? "Stock-in recorded successfully."
          : "Usage recorded successfully.",
      );
      await refreshProducts();
    } catch (err) {
      setInventoryFeedback(err.message, true);
    }

    return;
  }

  const id = stockForm.dataset.productId;
  const stock = Number(stockForm.elements.stock_quantity.value);

  try {
    await api(`/api/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ stock_quantity: stock }),
    });

    setInventoryFeedback("Stock adjusted successfully.");
    await refreshProducts();
  } catch (err) {
    setInventoryFeedback(err.message, true);
  }
});

productsEl.addEventListener("click", async (event) => {
  const closeButton = event.target.closest(".inventory-close-button");

  if (closeButton) {
    closeButton.closest(".inventory-manage").open = false;
    return;
  }

  const summary = event.target.closest(".inventory-manage summary");

  if (summary) {
    const details = summary.closest(".inventory-manage");

    // Close other open Manage popups
    productsEl.querySelectorAll(".inventory-manage[open]").forEach((item) => {
      if (item !== details) item.open = false;
    });

    requestAnimationFrame(() => {
      if (!details.open) return;

      const panel = details.querySelector(".inventory-manage-panel");
      const rect = summary.getBoundingClientRect();
      const width = panel.offsetWidth;
      const margin = 16;

      const left = Math.max(
        margin,
        Math.min(rect.right - width, window.innerWidth - width - margin),
      );

      const top = Math.max(
        margin,
        Math.min(
          rect.bottom + 8,
          window.innerHeight - panel.offsetHeight - margin,
        ),
      );

      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
    });

    return;
  }

  const button = event.target.closest(".product-history-button");
  if (!button) return;

  const id = button.dataset.productId;
  const historyEl = document.getElementById(`product-history-${id}`);

  if (historyEl.dataset.loaded === "true") {
    historyEl.innerHTML = "";
    historyEl.dataset.loaded = "false";
    button.textContent = "Show movement history";
    return;
  }

  button.disabled = true;
  historyEl.textContent = "Loading history...";

  try {
    const data = await api(`/api/products/${id}/movements`);

    if (!data.movements.length) {
      historyEl.innerHTML = "<p>No movement history yet.</p>";
    } else {
      historyEl.innerHTML = `
        <h4>Movement history</h4>
        <ul>
          ${data.movements
            .map((movement) => {
              const date = new Date(movement.created_at).toLocaleString();
              const type =
                movement.movement_type === "stock_in"
                  ? "Stock in"
                  : movement.movement_type === "usage"
                    ? "Usage"
                    : "Adjustment";

              return `
                <li>
                  <strong>${escapeHtml(type)}</strong>:
                  ${Number(movement.quantity)}
                  <br />
                  <small>${escapeHtml(date)}</small>
                  ${movement.notes ? `<p>${escapeHtml(movement.notes)}</p>` : ""}
                </li>
              `;
            })
            .join("")}
        </ul>
      `;
    }

    historyEl.dataset.loaded = "true";
    button.textContent = "Hide movement history";
  } catch (err) {
    historyEl.textContent = err.message || "Unable to load history.";
  } finally {
    button.disabled = false;
  }
});

// Close Manage popup when clicking outside
document.addEventListener("click", (event) => {
  if (event.target.closest(".inventory-manage")) return;

  productsEl.querySelectorAll(".inventory-manage[open]").forEach((item) => {
    item.open = false;
  });
});

// Close Manage popup with Escape
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    productsEl.querySelectorAll(".inventory-manage[open]").forEach((item) => {
      item.open = false;
    });
  }
});

async function refreshProducts() {
  try {
    const products = await loadProducts();
    renderProducts(products);
  } catch (err) {
    productsEl.innerHTML = "<p>Unable to load products.</p>";
    console.error("Product load failed:", err);
  }
}

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const product = {
    name: document.getElementById("productName").value.trim(),
    unit: document.getElementById("productUnit").value.trim(),
    stock_quantity: Number(document.getElementById("productStock").value),
    low_stock_threshold: Number(
      document.getElementById("productThreshold").value,
    ),
  };

  try {
    await api("/api/products", {
      method: "POST",
      body: JSON.stringify(product),
    });

    productForm.reset();
    document.getElementById("productStock").value = "0";
    document.getElementById("productThreshold").value = "5";

    setInventoryFeedback("Product added successfully.");
    await refreshProducts();
  } catch (err) {
    setInventoryFeedback(err.message, true);
  }
});

refreshProducts();
