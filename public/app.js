'use strict';

const LOAD_LABELS = {
  wash_fold: 'Wash & fold',
  wash_only: 'Wash only',
  dry_clean: 'Dry clean',
  press_only: 'Press only',
};

const STATUS_LABELS = {
  received: 'Received',
  washing: 'Washing',
  ready: 'Ready',
  picked_up: 'Picked up',
};

const NEXT_STATUS = {
  received: 'washing',
  washing: 'ready',
  ready: 'picked_up',
  picked_up: null,
};

const ordersEl = document.getElementById('orders');
const filtersEl = document.getElementById('filters');
const feedbackEl = document.getElementById('feedback');
const newOrderDialog = document.getElementById('newOrderDialog');
const newOrderForm = document.getElementById('newOrderForm');
const formErrors = document.getElementById('formErrors');
const detailDialog = document.getElementById('detailDialog');
const detailBody = document.getElementById('detailBody');

let activeStatus = 'all';

/** Fetch wrapper that turns an API error body into a thrown Error. */
async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = Array.isArray(body.details)
      ? body.details.map((d) => `${d.field}: ${d.message}`).join('\n')
      : body.message || '';
    const error = new Error(detail ? `${body.error}\n${detail}` : body.error || 'Request failed');
    error.status = response.status;
    throw error;
  }

  return body;
}

function setFeedback(message, isError = false) {
  feedbackEl.textContent = message;
  feedbackEl.classList.toggle('is-error', isError);
}

function measure(order) {
  return order.weight_kg ? `${Number(order.weight_kg)}kg` : `${order.item_count} items`;
}

function peso(value) {
  return `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

function formatDate(value) {
  return new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}

async function loadOrders() {
  try {
    const query = activeStatus === 'all' ? '' : `?status=${activeStatus}`;
    const { orders } = await api(`/api/orders${query}`);
    renderOrders(orders);
    setFeedback(`${orders.length} order${orders.length === 1 ? '' : 's'} shown`);
  } catch (err) {
    ordersEl.innerHTML = '';
    setFeedback(err.message, true);
  }
}

function renderOrders(orders) {
  ordersEl.innerHTML = '';

  if (orders.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent =
      activeStatus === 'all'
        ? 'No orders yet. Log the first drop-off with “New order”.'
        : `Nothing is ${STATUS_LABELS[activeStatus].toLowerCase()} right now.`;
    ordersEl.append(empty);
    return;
  }

  for (const order of orders) {
    const card = document.createElement('button');
    card.className = 'card';
    card.type = 'button';
    card.addEventListener('click', () => openDetail(order.id));

    const name = document.createElement('p');
    name.className = 'card__name';
    name.textContent = order.customer_name;

    const meta = document.createElement('p');
    meta.className = 'card__meta';
    meta.textContent = `${LOAD_LABELS[order.load_type]}, ${measure(order)}`;

    const price = document.createElement('p');
    price.className = 'card__price';
    price.textContent = peso(order.price);

    const tag = document.createElement('span');
    tag.className = `tag tag--${order.status}`;
    tag.textContent = STATUS_LABELS[order.status];

    card.append(name, meta, price, tag);
    ordersEl.append(card);
  }
}

async function openDetail(id) {
  try {
    const { order, history } = await api(`/api/orders/${id}`);
    detailBody.innerHTML = '';

    const title = document.createElement('h2');
    title.className = 'panel__title';
    title.textContent = `Order #${order.id} — ${order.customer_name}`;

    const tag = document.createElement('span');
    tag.className = `tag tag--${order.status}`;
    tag.textContent = STATUS_LABELS[order.status];

    const rows = [
      ['Phone', order.customer_phone],
      ['Load', `${LOAD_LABELS[order.load_type]}, ${measure(order)}`],
      ['Price', peso(order.price)],
      ['Logged', formatDate(order.created_at)],
      ['Payment', order.paid_at ? `${peso(order.paid_amount)} (${order.paid_method})` : 'Not paid yet'],
    ];
    if (order.note) rows.push(['Note', order.note]);

    const rowsEl = document.createElement('div');
    for (const [label, value] of rows) {
      const row = document.createElement('div');
      row.className = 'detail__row';
      const left = document.createElement('span');
      left.textContent = label;
      const right = document.createElement('span');
      right.textContent = value;
      row.append(left, right);
      rowsEl.append(row);
    }

    const timeline = document.createElement('ul');
    timeline.className = 'timeline';
    for (const entry of history) {
      const item = document.createElement('li');
      item.textContent = `${STATUS_LABELS[entry.status]} — ${formatDate(entry.changed_at)}${entry.note ? ` (${entry.note})` : ''}`;
      timeline.append(item);
    }

    detailBody.append(title, tag, rowsEl, timeline);

    const next = NEXT_STATUS[order.status];
    if (next) {
      const advance = document.createElement('button');
      advance.className = 'button button--accent';
      advance.style.marginTop = '16px';
      advance.textContent = `Mark as ${STATUS_LABELS[next].toLowerCase()}`;
      advance.addEventListener('click', () => changeStatus(order.id, next));
      detailBody.append(advance);
    }

    detailDialog.showModal();
  } catch (err) {
    setFeedback(err.message, true);
  }
}

async function changeStatus(id, status) {
  try {
    await api(`/api/orders/${id}/status`, {
      method: 'PATCH',
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

filtersEl.addEventListener('click', (event) => {
  const button = event.target.closest('.filter');
  if (!button) return;
  activeStatus = button.dataset.status;
  filtersEl.querySelectorAll('.filter').forEach((el) => el.classList.toggle('is-active', el === button));
  loadOrders();
});

document.getElementById('loadType').addEventListener('change', (event) => {
  const byWeight = ['wash_fold', 'wash_only'].includes(event.target.value);
  document.getElementById('weightField').classList.toggle('is-hidden', !byWeight);
  document.getElementById('itemsField').classList.toggle('is-hidden', byWeight);
});

document.getElementById('openNewOrder').addEventListener('click', () => {
  formErrors.textContent = '';
  newOrderDialog.showModal();
});

document.getElementById('cancelNewOrder').addEventListener('click', () => newOrderDialog.close());
document.getElementById('closeDetail').addEventListener('click', () => detailDialog.close());

newOrderForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  formErrors.textContent = '';

  const data = Object.fromEntries(new FormData(newOrderForm));
  const byWeight = ['wash_fold', 'wash_only'].includes(data.load_type);
  if (byWeight) delete data.item_count;
  else delete data.weight_kg;

  try {
    const { order } = await api('/api/orders', { method: 'POST', body: JSON.stringify(data) });
    newOrderDialog.close();
    newOrderForm.reset();
    await loadOrders();
    setFeedback(`Order #${order.id} logged for ${order.customer_name}`);
  } catch (err) {
    formErrors.textContent = err.message;
  }
});

loadOrders();
