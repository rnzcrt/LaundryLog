"use strict";

const LOAD_LABELS = {
  wash_fold: "Wash + Dry + Fold",
  wash_only: "Wash Only",
  dry_only: "Dry Only",
  fold_only: "Fold Only",
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

let activeStatus = "all";
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

async function loadOrders() {
  try {
    const { orders } = await api("/api/orders");

    renderDashboard(orders);
    renderKanban(orders);

    const visibleOrders =
      activeStatus === "all"
        ? orders
        : orders.filter((order) => order.status === activeStatus);

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
    const { order, history } = await api(`/api/orders/${id}`);
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
    if (order.note) rows.push(["Note", order.note]);

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

    detailBody.append(title, tag, rowsEl, timeline);

    const next = NEXT_STATUS[order.status];
    if (next) {
      const advance = document.createElement("button");
      advance.className = "button button--accent";
      advance.style.marginTop = "16px";
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
    const { customer, orders } = await api(`/api/customers/${id}`);
    detailBody.innerHTML = "";

    const title = document.createElement("h2");
    title.className = "panel__title";
    title.textContent = `Customer — ${customer.name}`;

    const phone = document.createElement("p");
    phone.textContent = customer.phone;

    const historyTitle = document.createElement("h3");
    historyTitle.textContent = `Order history (${orders.length})`;

    detailBody.append(title, phone, historyTitle);

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

    detailDialog.showModal();
  } catch (err) {
    setFeedback(err.message, true);
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

    await loadOrders();

    setFeedback(
      `Order #${order.id} logged for ${order.customer_name} — ₱${Number(order.price).toFixed(2)}`,
    );
  } catch (err) {
    formErrors.textContent = err.message;
  }
});

loadOrders();

const customerSearch = document.getElementById("customerSearch");
const customersEl = document.getElementById("customers");

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
    customersEl.innerHTML = "<p>No customers found.</p>";
    return;
  }

  customersEl.innerHTML = customers
    .map(
      (customer) => `
    <article class="customer-card">
      <h3>${escapeHtml(customer.name)}</h3>
      <p>${escapeHtml(customer.phone)}</p>
      <button
        class="button button--secondary customer-history"
        data-customer-id="${customer.id}"
      >
        View history
      </button>
    </article>
  `,
    )
    .join("");
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

const productForm = document.getElementById("productForm");
const productsEl = document.getElementById("products");

async function loadProducts() {
  const data = await api("/api/products");
  return data.products;
}

function renderProducts(products) {
  if (!products.length) {
    productsEl.innerHTML = "<p>No products added yet.</p>";
    return;
  }

  productsEl.innerHTML = products
    .map((product) => {
      const lowStock =
        Number(product.stock_quantity) <= Number(product.low_stock_threshold);

      return `
        <article class="customer-card product-card">
          <h3>${escapeHtml(product.name)}</h3>
          <p>Stock: ${Number(product.stock_quantity)} ${escapeHtml(product.unit)}</p>
          <p>Low-stock threshold: ${Number(product.low_stock_threshold)} ${escapeHtml(product.unit)}</p>
          <p class="${lowStock ? "is-error" : ""}">
            ${lowStock ? "Low stock" : "In stock"}
          </p>

          <form class="product-stock-form" data-product-id="${product.id}">
            <label class="field">
              <span>Adjust stock manually</span>
              <input
                type="number"
                name="stock_quantity"
                min="0"
                step="0.01"
                value="${Number(product.stock_quantity)}"
                required
              />
            </label>
            <button type="submit">Save adjustment</button>
          </form>

          <form class="product-movement-form" data-product-id="${product.id}" data-movement-type="stock_in">
            <h4>Stock in</h4>
            <label class="field">
              <span>Quantity to add (${escapeHtml(product.unit)})</span>
              <input type="number" name="quantity" min="0.01" step="0.01" required />
            </label>
            <label class="field">
              <span>Notes (optional)</span>
              <input type="text" name="notes" maxlength="500" />
            </label>
            <button type="submit">Record stock-in</button>
          </form>

          <form class="product-movement-form" data-product-id="${product.id}" data-movement-type="usage">
            <h4>Record usage</h4>
            <label class="field">
              <span>Quantity used (${escapeHtml(product.unit)})</span>
              <input type="number" name="quantity" min="0.01" step="0.01" required />
            </label>
            <label class="field">
              <span>Notes (optional)</span>
              <input type="text" name="notes" maxlength="500" />
            </label>
            <button type="submit">Record usage</button>
          </form>

          <button type="button" class="product-history-button" data-product-id="${product.id}">
            Show movement history
          </button>
          <div class="product-history" id="product-history-${product.id}" aria-live="polite"></div>
        </article>
      `;
    })
    .join("");
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

      setFeedback(
        movement_type === "stock_in"
          ? "Stock-in recorded successfully."
          : "Usage recorded successfully.",
      );
      await refreshProducts();
    } catch (err) {
      setFeedback(err.message, true);
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

    setFeedback("Stock adjusted successfully.");
    await refreshProducts();
  } catch (err) {
    setFeedback(err.message, true);
  }
});

productsEl.addEventListener("click", async (event) => {
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

    setFeedback("Product added successfully.");
    await refreshProducts();
  } catch (err) {
    setFeedback(err.message, true);
  }
});

refreshProducts();
