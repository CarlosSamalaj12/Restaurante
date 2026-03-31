const state = {
  selectedTableId: null,
  selectedTableCode: null,
  selectedAccountId: null,
  tableAccounts: [],
  categories: [],
  products: [],
  selectedCategoryId: null,
  selectedProductId: null,
  productBuilder: null,
  accountDetail: null,
  paymentMethods: [],
  settings: null,
  cashAccountId: null,
  centers: [],
  selectedCenterId: null,
  terminalIp: "",
  lastSeatSelectionByAccount: {},
  payTableModal: {
    lines: [],
  },
  splitAccounts: {
    accounts: [],
    sourceAccountId: null,
  },
  editingProductId: null,
  activeModule: null,
  wizardData: {
    categoryId: null,
    productTypeId: "plato_fuerte",
    productName: "",
    basePrice: 0,
    allowDiscount: true,
    selectedModifierGroups: {}, // { groupType: true/false }
    modifierTemplates: {},
    optionPoolByGroup: {}, // { groupType: [{ name, priceDelta }] }
    modifierOptions: {}, // { groupType: [{ name, priceDelta }] }
    groupRules: {}, // { groupType: { minSelect, maxSelect, isMandatory } }
  },
};

const WIZARD_PRODUCT_TYPES = {
  plato_fuerte: {
    label: "Plato Fuerte",
    groups: {
      garnish: { minSelect: 2, maxSelect: 2, isMandatory: true },
      sauce: { minSelect: 0, maxSelect: 2, isMandatory: false },
      preparation: { minSelect: 1, maxSelect: 1, isMandatory: false },
    },
  },
  plato_carne: {
    label: "Plato de Carne",
    groups: {
      garnish: { minSelect: 2, maxSelect: 2, isMandatory: true },
      sauce: { minSelect: 0, maxSelect: 2, isMandatory: false },
      preparation: { minSelect: 1, maxSelect: 1, isMandatory: false },
      meat_term: { minSelect: 1, maxSelect: 1, isMandatory: true },
    },
  },
  bebida_caliente: {
    label: "Bebida Caliente",
    groups: {
      beverage_temp: { minSelect: 1, maxSelect: 1, isMandatory: true },
      milk_type: { minSelect: 0, maxSelect: 1, isMandatory: false },
    },
  },
  bebida_fria: {
    label: "Bebida Fria",
    groups: {
      beverage_temp: { minSelect: 1, maxSelect: 1, isMandatory: true },
      ice: { minSelect: 0, maxSelect: 1, isMandatory: false },
      milk_type: { minSelect: 0, maxSelect: 1, isMandatory: false },
    },
  },
};

const MODIFIER_TEMPLATE_PRESETS = {
  garnish: { minSelect: 2, maxSelect: 2, suggestedName: "Guarniciones" },
  preparation: { minSelect: 1, maxSelect: 1, suggestedName: "Metodo de Preparacion" },
  sauce: { minSelect: 0, maxSelect: 2, suggestedName: "Salsas" },
  meat_term: { minSelect: 1, maxSelect: 1, suggestedName: "Termino de Carne" },
  milk_type: { minSelect: 0, maxSelect: 1, suggestedName: "Tipo de Leche" },
  beverage_temp: { minSelect: 1, maxSelect: 1, suggestedName: "Temperatura de Bebida" },
  ice: { minSelect: 0, maxSelect: 1, suggestedName: "Hielo" },
  other: { minSelect: 0, maxSelect: 1, suggestedName: "" },
};

async function api(url, options = {}) {
  const r = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({ error: "Error de red" }));
    throw new Error(e.error || "Error");
  }
  return r.json();
}

function money(n) {
  return `Q ${Number(n || 0).toFixed(2)}`;
}

function parseSqlDateTime(value) {
  if (!value) return null;
  const normalized = String(value).replace(" ", "T");
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

function tableElapsedLabel(value) {
  const d = parseSqlDateTime(value);
  if (!d) return "Sin comandas";
  const ms = Date.now() - d.getTime();
  if (ms <= 60000) return "Justo ahora";
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `Hace ${totalMin} min`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours < 24) return mins ? `Hace ${hours}h ${mins}m` : `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours ? `Hace ${days}d ${remHours}h` : `Hace ${days}d`;
}

function refreshTablesElapsedTimes() {
  document.querySelectorAll("#tablesGrid .table-time[data-activity]").forEach((el) => {
    el.textContent = tableElapsedLabel(el.dataset.activity);
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toast(message, type = "info", timeout = 2600) {
  const host = document.getElementById("toastHost");
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, timeout);
}

const AMBIENCE_OPTIONS = ["default", "warm", "cool"];

function applyAmbience(mode = "default") {
  const nextMode = AMBIENCE_OPTIONS.includes(mode) ? mode : "default";
  document.body.classList.remove("ambience-default", "ambience-warm", "ambience-cool");
  document.body.classList.add(`ambience-${nextMode}`);
  localStorage.setItem("restaurantAmbience", nextMode);
}

const modalState = { resolve: null };
const countPickerState = { resolve: null, min: 1, max: 12 };
const CHANGE_DENOMINATIONS = [
  { label: "Q200", value: 20000 },
  { label: "Q100", value: 10000 },
  { label: "Q50", value: 5000 },
  { label: "Q20", value: 2000 },
  { label: "Q10", value: 1000 },
  { label: "Q5", value: 500 },
  { label: "Q1", value: 100 },
  { label: "Q0.50", value: 50 },
  { label: "Q0.25", value: 25 },
  { label: "Q0.10", value: 10 },
  { label: "Q0.05", value: 5 },
];

function closeModal(result) {
  const modal = document.getElementById("uiModal");
  const input = document.getElementById("modalInput");
  modal.classList.add("hidden");
  input.classList.add("hidden");
  input.value = "";
  if (modalState.resolve) {
    modalState.resolve(result);
    modalState.resolve = null;
  }
}

function showModal({
  title,
  message,
  input = false,
  defaultValue = "",
  placeholder = "",
  okText = "Aceptar",
  cancelText = "Cancelar",
}) {
  const modal = document.getElementById("uiModal");
  const titleEl = document.getElementById("modalTitle");
  const messageEl = document.getElementById("modalMessage");
  const inputEl = document.getElementById("modalInput");
  const okBtn = document.getElementById("modalOkBtn");
  const cancelBtn = document.getElementById("modalCancelBtn");

  titleEl.textContent = title || "Mensaje";
  messageEl.textContent = message || "";
  okBtn.textContent = okText;
  cancelBtn.textContent = cancelText;
  inputEl.placeholder = placeholder;

  if (input) {
    inputEl.classList.remove("hidden");
    inputEl.value = defaultValue || "";
    setTimeout(() => inputEl.focus(), 0);
  } else {
    inputEl.classList.add("hidden");
    inputEl.value = "";
  }

  modal.classList.remove("hidden");

  return new Promise((resolve) => {
    modalState.resolve = resolve;
  });
}

function closeCountPicker(result) {
  const modal = document.getElementById("countPickerModal");
  const input = document.getElementById("countPickerInput");
  const quick = document.getElementById("countPickerQuickButtons");
  modal.classList.add("hidden");
  input.value = "";
  quick.innerHTML = "";
  if (countPickerState.resolve) {
    countPickerState.resolve(result);
    countPickerState.resolve = null;
  }
}

function renderCountPickerQuickButtons(min, max) {
  const host = document.getElementById("countPickerQuickButtons");
  host.innerHTML = "";
  const quickMax = Math.min(max, 12);
  for (let n = min; n <= quickMax; n += 1) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "count-quick-btn";
    btn.textContent = String(n);
    btn.addEventListener("click", () => {
      document.getElementById("countPickerInput").value = String(n);
    });
    host.appendChild(btn);
  }
}

function showCountPicker({
  title = "Cantidad",
  message = "",
  defaultValue = 1,
  min = 1,
  max = 12,
  okText = "Aceptar",
  cancelText = "Cancelar",
}) {
  const modal = document.getElementById("countPickerModal");
  const titleEl = document.getElementById("countPickerTitle");
  const messageEl = document.getElementById("countPickerMessage");
  const inputEl = document.getElementById("countPickerInput");
  const okBtn = document.getElementById("countPickerOkBtn");
  const cancelBtn = document.getElementById("countPickerCancelBtn");

  countPickerState.min = Math.max(1, Number(min || 1));
  countPickerState.max = Math.max(countPickerState.min, Number(max || countPickerState.min));

  titleEl.textContent = title;
  messageEl.textContent = message;
  okBtn.textContent = okText;
  cancelBtn.textContent = cancelText;
  inputEl.min = String(countPickerState.min);
  inputEl.max = String(countPickerState.max);
  inputEl.value = String(Math.min(countPickerState.max, Math.max(countPickerState.min, Number(defaultValue || countPickerState.min))));
  renderCountPickerQuickButtons(countPickerState.min, countPickerState.max);
  modal.classList.remove("hidden");
  setTimeout(() => inputEl.focus(), 0);

  return new Promise((resolve) => {
    countPickerState.resolve = resolve;
  });
}

function createPayTableLine(seed = {}) {
  const methods = availablePaymentMethods();
  const fallbackMethod = String(seed.method || methods[0]?.code || "cash");
  const amount = Number(seed.amount || 0);
  const safeAmount = Number.isNaN(amount) ? 0 : amount;
  const cashReceived = Number(seed.cashReceived || safeAmount || 0);
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    method: fallbackMethod,
    amount: safeAmount,
    referenceNo: String(seed.referenceNo || ""),
    cashReceived: Number.isNaN(cashReceived) ? safeAmount : cashReceived,
  };
}

function getPayTablePending() {
  return Number(state.accountDetail?.totals?.pending || 0);
}

function computePayTablePreview() {
  const pending = getPayTablePending();
  const methodsByCode = Object.fromEntries(availablePaymentMethods().map((m) => [String(m.code), m]));
  const lines = Array.isArray(state.payTableModal?.lines) ? state.payTableModal.lines : [];
  const applyTotal = lines.reduce((sum, line) => sum + Math.max(0, Number(line.amount || 0)), 0);
  const receivedTotal = lines.reduce((sum, line) => {
    const amount = Math.max(0, Number(line.amount || 0));
    const methodMeta = methodsByCode[String(line.method || "")] || {};
    if (isCashPaymentMethod(line.method, methodMeta.label)) {
      return sum + Math.max(0, Number(line.cashReceived || 0));
    }
    return sum + amount;
  }, 0);
  const change = Math.max(0, Number((receivedTotal - applyTotal).toFixed(2)));
  return {
    pending,
    applyTotal: Number(applyTotal.toFixed(2)),
    receivedTotal: Number(receivedTotal.toFixed(2)),
    change,
  };
}

function buildChangeBreakdown(changeAmount) {
  let remaining = Math.round(Number(changeAmount || 0) * 100);
  if (remaining <= 0) return [];
  const rows = [];
  for (const denom of CHANGE_DENOMINATIONS) {
    if (!denom.value) continue;
    const qty = Math.floor(remaining / denom.value);
    if (qty > 0) {
      rows.push({ label: denom.label, qty });
      remaining -= qty * denom.value;
    }
  }
  if (remaining > 0) {
    rows.push({ label: "Ajuste", qty: Number((remaining / 100).toFixed(2)) });
  }
  return rows;
}

function renderChangeBreakdown(changeAmount) {
  const host = document.getElementById("payTableChangeBreakdown");
  if (!host) return;
  const rows = buildChangeBreakdown(changeAmount);
  if (!rows.length) {
    host.classList.add("hidden");
    host.innerHTML = "";
    return;
  }
  host.classList.remove("hidden");
  host.innerHTML = rows
    .map((x) => `<div><span>${escapeHtml(String(x.label))}</span><strong>${escapeHtml(String(x.qty))}</strong></div>`)
    .join("");
}

function renderTenderedBreakdown(changeAmount) {
  const host = document.getElementById("payTableTenderedBreakdown");
  if (!host) return;
  const rows = buildChangeBreakdown(changeAmount);
  if (!rows.length) {
    host.classList.add("hidden");
    host.innerHTML = "";
    return;
  }
  host.classList.remove("hidden");
  host.innerHTML = `
    <div class="pay-table-breakdown-head">
      <span>Denominacion</span>
      <span>Cantidad</span>
    </div>
    ${rows
      .map(
        (x) => `
      <div class="pay-table-breakdown-row">
        <span>${escapeHtml(String(x.label))}</span>
        <strong>${escapeHtml(String(x.qty))}</strong>
      </div>
    `
      )
      .join("")}
  `;
}

function renderTenderedPreview() {
  const input = document.getElementById("payTableTenderedInput");
  const changeText = document.getElementById("payTableTenderedChangeText");
  if (!input || !changeText) return;
  const tendered = Math.max(0, Number(input.value || "0"));
  const pending = getPayTablePending();
  const change = Math.max(0, Number((tendered - pending).toFixed(2)));
  changeText.textContent = money(change);
  renderTenderedBreakdown(change);
}

function renderPayTablePreview() {
  const preview = computePayTablePreview();
  const applyText = document.getElementById("payTableApplyTotalText");
  const receivedText = document.getElementById("payTableReceivedTotalText");
  const changeText = document.getElementById("payTableChangeText");
  if (applyText) applyText.textContent = money(preview.applyTotal);
  if (receivedText) receivedText.textContent = money(preview.receivedTotal);
  if (changeText) changeText.textContent = money(preview.change);
  renderChangeBreakdown(preview.change);
}

function removePayTableLine(lineId) {
  const lines = Array.isArray(state.payTableModal?.lines) ? state.payTableModal.lines : [];
  if (lines.length <= 1) {
    toast("Debe existir al menos una forma de pago", "error");
    return;
  }
  state.payTableModal.lines = lines.filter((line) => line.id !== lineId);
  renderPayTableLines();
}

function renderPayTableLines() {
  const host = document.getElementById("payTableLines");
  if (!host) return;
  const methods = availablePaymentMethods();
  if (!state.payTableModal.lines.length) {
    state.payTableModal.lines = [createPayTableLine({ method: methods[0]?.code || "cash" })];
  }
  host.innerHTML = "";
  for (const line of state.payTableModal.lines) {
    const methodMeta = methods.find((m) => String(m.code) === String(line.method));
    const isCash = isCashPaymentMethod(line.method, methodMeta?.label);
    const row = document.createElement("div");
    row.className = "pay-table-row";
    row.innerHTML = `
      <select data-pay-line="method" data-line-id="${line.id}">
        ${methods
          .map(
            (m) =>
              `<option value="${escapeHtml(m.code)}" ${String(m.code) === String(line.method) ? "selected" : ""}>${escapeHtml(m.label)}</option>`
          )
          .join("")}
      </select>
      <input data-pay-line="amount" data-line-id="${line.id}" type="number" min="0" step="0.01" placeholder="Monto" value="${escapeHtml(
        String(line.amount || "")
      )}" />
      <input data-pay-line="reference" data-line-id="${line.id}" type="text" placeholder="Referencia (opcional)" value="${escapeHtml(
        String(line.referenceNo || "")
      )}" />
      <input data-pay-line="cash-received" data-line-id="${line.id}" type="number" min="0" step="0.01" placeholder="Recibido" value="${escapeHtml(
        String(isCash ? line.cashReceived || "" : line.amount || "")
      )}" ${isCash ? "" : "disabled"} />
      <button type="button" data-pay-line="remove" data-line-id="${line.id}">Quitar</button>
    `;
    host.appendChild(row);
  }

  host.querySelectorAll('[data-pay-line="method"]').forEach((el) => {
    el.addEventListener("change", (e) => {
      const lineId = e.currentTarget.getAttribute("data-line-id");
      const line = state.payTableModal.lines.find((x) => x.id === lineId);
      if (!line) return;
      line.method = String(e.currentTarget.value || "");
      const selected = methods.find((m) => String(m.code) === String(line.method));
      if (!isCashPaymentMethod(line.method, selected?.label)) {
        line.cashReceived = Number(line.amount || 0);
      }
      renderPayTableLines();
    });
  });

  host.querySelectorAll('[data-pay-line="amount"]').forEach((el) => {
    el.addEventListener("input", (e) => {
      const lineId = e.currentTarget.getAttribute("data-line-id");
      const line = state.payTableModal.lines.find((x) => x.id === lineId);
      if (!line) return;
      const amount = Number(e.currentTarget.value || "0");
      line.amount = Number.isNaN(amount) ? 0 : amount;
      const selected = methods.find((m) => String(m.code) === String(line.method));
      if (!isCashPaymentMethod(line.method, selected?.label)) {
        line.cashReceived = line.amount;
      }
      renderPayTablePreview();
    });
  });

  host.querySelectorAll('[data-pay-line="reference"]').forEach((el) => {
    el.addEventListener("input", (e) => {
      const lineId = e.currentTarget.getAttribute("data-line-id");
      const line = state.payTableModal.lines.find((x) => x.id === lineId);
      if (!line) return;
      line.referenceNo = String(e.currentTarget.value || "");
    });
  });

  host.querySelectorAll('[data-pay-line="cash-received"]').forEach((el) => {
    el.addEventListener("input", (e) => {
      const lineId = e.currentTarget.getAttribute("data-line-id");
      const line = state.payTableModal.lines.find((x) => x.id === lineId);
      if (!line) return;
      const amount = Number(e.currentTarget.value || "0");
      line.cashReceived = Number.isNaN(amount) ? 0 : amount;
      renderPayTablePreview();
    });
  });

  host.querySelectorAll('[data-pay-line="remove"]').forEach((el) => {
    el.addEventListener("click", (e) => {
      const lineId = e.currentTarget.getAttribute("data-line-id");
      removePayTableLine(lineId);
    });
  });

  renderPayTablePreview();
}

function openPayTableModal() {
  if (!state.selectedAccountId || !state.accountDetail) {
    toast("Selecciona una cuenta para cobrar", "error");
    return;
  }
  const methods = availablePaymentMethods();
  if (!methods.length) {
    toast("No hay formas de pago activas", "error");
    return;
  }
  state.payTableModal.lines = [createPayTableLine({ method: methods[0].code, amount: getPayTablePending() })];
  const summaryEl = document.getElementById("payTableSummaryText");
  const totalEl = document.getElementById("payTableTotalText");
  const paidEl = document.getElementById("payTablePaidText");
  const pendingEl = document.getElementById("payTablePendingText");
  if (summaryEl) {
    summaryEl.textContent = `Mesa ${state.selectedTableCode || "-"} | ${state.accountDetail.account?.check_number || "Cuenta"}`;
  }
  if (totalEl) totalEl.textContent = money(state.accountDetail?.totals?.total || 0);
  if (paidEl) paidEl.textContent = money(state.accountDetail?.totals?.paid || 0);
  if (pendingEl) pendingEl.textContent = money(state.accountDetail?.totals?.pending || 0);
  const removeTipBtn = document.getElementById("payTableRemoveTipBtn");
  if (removeTipBtn) {
    const tipAmount = Number(state.accountDetail?.totals?.tipAmount || 0);
    const tipIsOverridden = Boolean(state.accountDetail?.totals?.tipIsOverridden);
    if (tipIsOverridden) {
      removeTipBtn.disabled = false;
      removeTipBtn.textContent = "Restaurar Propina";
    } else {
      removeTipBtn.disabled = tipAmount <= 0;
      removeTipBtn.textContent = tipAmount > 0 ? "Quitar Propina" : "Propina en 0";
    }
  }
  const tenderedInput = document.getElementById("payTableTenderedInput");
  if (tenderedInput) {
    tenderedInput.value = "";
  }
  const tenderedBreakdown = document.getElementById("payTableTenderedBreakdown");
  if (tenderedBreakdown) {
    tenderedBreakdown.classList.add("hidden");
    tenderedBreakdown.innerHTML = "";
  }
  const tenderedChangeText = document.getElementById("payTableTenderedChangeText");
  if (tenderedChangeText) tenderedChangeText.textContent = money(0);
  renderPayTableLines();
  renderTenderedPreview();
  document.getElementById("payTableModal")?.classList.remove("hidden");
}

function closePayTableModal() {
  document.getElementById("payTableModal")?.classList.add("hidden");
}

function openFunctionsModal() {
  if (!state.selectedAccountId || !state.accountDetail) {
    toast("Selecciona una cuenta para usar Funciones", "error");
    return;
  }
  state.splitAccounts.sourceAccountId = Number(state.selectedAccountId);
  const summary = document.getElementById("functionsSummaryText");
  if (summary) {
    summary.textContent = `Mesa ${state.selectedTableCode || "-"} | ${state.accountDetail.account?.check_number || "Cuenta"}`;
  }
  showFunctionsMenu();
  document.getElementById("functionsModal")?.classList.remove("hidden");
}

function closeFunctionsModal() {
  document.getElementById("functionsModal")?.classList.add("hidden");
}

function showFunctionsMenu() {
  document.getElementById("functionsMenuSection")?.classList.remove("hidden");
  document.getElementById("functionsMoveSeatSection")?.classList.add("hidden");
  document.getElementById("functionsSeatSummarySection")?.classList.add("hidden");
  document.getElementById("functionsSplitAccountsSection")?.classList.add("hidden");
}

function showFunctionsMoveSeat() {
  const detail = state.accountDetail;
  const items = Array.isArray(detail?.items) ? detail.items : [];
  if (!items.length) {
    toast("No hay platillos para mover de silla", "error");
    return;
  }
  const select = document.getElementById("functionsMoveSeatItemSelect");
  if (select) {
    select.innerHTML = items
      .map(
        (i) =>
          `<option value="${Number(i.id)}">Silla ${Number(i.seat_no || 1)} | ${escapeHtml(i.product_name)} x${Number(i.qty || 0)}</option>`
      )
      .join("");
  }
  const moveInput = document.getElementById("functionsMoveSeatInput");
  const guestCount = Math.max(1, Number(detail?.account?.guest_count || 1));
  if (moveInput) {
    moveInput.min = "1";
    moveInput.max = String(guestCount);
    const initialSeat = Number(items[0]?.seat_no || 1);
    moveInput.value = String(Math.min(Math.max(1, initialSeat), guestCount));
  }
  document.getElementById("functionsMenuSection")?.classList.add("hidden");
  document.getElementById("functionsMoveSeatSection")?.classList.remove("hidden");
  document.getElementById("functionsSeatSummarySection")?.classList.add("hidden");
  document.getElementById("functionsSplitAccountsSection")?.classList.add("hidden");
}

async function applyMoveSeatFromFunctions() {
  const detail = state.accountDetail;
  if (!detail?.account?.id) return;
  const itemSelect = document.getElementById("functionsMoveSeatItemSelect");
  const selectedItemIds = itemSelect
    ? [...itemSelect.selectedOptions].map((x) => Number(x.value || "0")).filter((x) => x > 0)
    : [];
  const guestCount = Math.max(1, Number(detail?.account?.guest_count || 1));
  const newSeatNo = Number(document.getElementById("functionsMoveSeatInput")?.value || "0");
  if (!selectedItemIds.length) {
    toast("Selecciona al menos un platillo", "error");
    return;
  }
  if (!newSeatNo || newSeatNo < 1 || newSeatNo > guestCount) {
    toast(`Silla invalida. Debe estar entre 1 y ${guestCount}`, "error");
    return;
  }
  for (const itemId of selectedItemIds) {
    await api(`/api/items/${itemId}/move-seat`, {
      method: "POST",
      body: JSON.stringify({ newSeatNo }),
    });
  }
  await loadAccountDetail();
  showFunctionsMoveSeat();
  toast(`${selectedItemIds.length} platillo(s) movido(s) a silla ${newSeatNo}`, "success");
}

function showFunctionsSeatSummary() {
  const detail = state.accountDetail;
  const items = Array.isArray(detail?.items) ? detail.items : [];
  if (!items.length) {
    toast("No hay platillos en la cuenta", "error");
    return;
  }
  const rows = buildSeatSummaryRows(detail);

  const list = document.getElementById("functionsSeatSummaryList");
  if (list) {
    list.innerHTML = rows
      .map(
        (r) => `
      <div class="functions-seat-row">
        <span>Silla ${r.seat}</span>
        <strong>${money(r.subtotal)}</strong>
        <button type="button" data-seat-print="${r.seat}">Imprimir 80mm</button>
      </div>
    `
      )
      .join("");
    list.querySelectorAll("[data-seat-print]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const seatNo = Number(btn.getAttribute("data-seat-print") || "0");
        openSeatPrecheckPrint(seatNo);
      });
    });
  }
  const totalText = document.getElementById("functionsSeatSummaryTotal");
  if (totalText) totalText.textContent = money(detail?.totals?.total || 0);
  document.getElementById("functionsMenuSection")?.classList.add("hidden");
  document.getElementById("functionsMoveSeatSection")?.classList.add("hidden");
  document.getElementById("functionsSeatSummarySection")?.classList.remove("hidden");
  document.getElementById("functionsSplitAccountsSection")?.classList.add("hidden");
}

async function loadSplitAccountsData() {
  if (!state.selectedTableId) return;
  const accounts = await api(`/api/tables/${state.selectedTableId}/accounts`);
  state.splitAccounts.accounts = accounts || [];
  if (!state.splitAccounts.sourceAccountId && state.selectedAccountId) {
    state.splitAccounts.sourceAccountId = Number(state.selectedAccountId);
  }
  const sourceExists = state.splitAccounts.accounts.some((a) => Number(a.id) === Number(state.splitAccounts.sourceAccountId));
  if (!sourceExists) {
    state.splitAccounts.sourceAccountId = Number(state.splitAccounts.accounts[0]?.id || 0);
  }
}

function renderSplitAccountsSection() {
  const accounts = state.splitAccounts.accounts || [];
  const sourceSelect = document.getElementById("functionsSplitSourceAccountSelect");
  const seatSelect = document.getElementById("functionsSplitSeatSelect");
  const seatTargetSelect = document.getElementById("functionsSplitSeatTargetSelect");
  const itemSelect = document.getElementById("functionsSplitItemSelect");
  const itemTargetSelect = document.getElementById("functionsSplitItemTargetSelect");
  const board = document.getElementById("functionsSplitAccountsBoard");
  const sourceAccountId = Number(state.splitAccounts.sourceAccountId || 0);

  if (sourceSelect) {
    sourceSelect.innerHTML = accounts
      .map((a) => `<option value="${a.id}" ${Number(a.id) === sourceAccountId ? "selected" : ""}>${escapeHtml(a.check_number)}</option>`)
      .join("");
  }
  const currentItems = (state.accountDetail?.items || []).filter((i) => Number(i.account_id || sourceAccountId) === sourceAccountId);
  const sourceItems = state.selectedAccountId === sourceAccountId ? state.accountDetail?.items || [] : [];
  const effectiveItems = sourceItems.length
    ? sourceItems
    : (state.splitAccounts.cachedItemsByAccount?.[sourceAccountId] || []);
  const seats = [...new Set(effectiveItems.map((i) => Number(i.seat_no || 1)))].sort((a, b) => a - b);
  if (seatSelect) {
    seatSelect.innerHTML = seats.map((s) => `<option value="${s}">Silla ${s}</option>`).join("");
  }
  const targetOptions = accounts
    .filter((a) => Number(a.id) !== sourceAccountId)
    .map((a) => `<option value="${a.id}">${escapeHtml(a.check_number)}</option>`)
    .join("");
  if (seatTargetSelect) seatTargetSelect.innerHTML = targetOptions;
  if (itemTargetSelect) itemTargetSelect.innerHTML = targetOptions;
  if (itemSelect) {
    itemSelect.innerHTML = effectiveItems
      .map(
        (i) =>
          `<option value="${i.id}" data-max-qty="${Number(i.qty || 0)}">Silla ${Number(i.seat_no || 1)} | ${escapeHtml(i.product_name)} x${Number(
            i.qty || 0
          )}</option>`
      )
      .join("");
  }
  if (board) {
    board.innerHTML = accounts
      .map((a) => {
        const isSource = Number(a.id) === sourceAccountId;
        const label = `${escapeHtml(a.check_number)}${isSource ? " (Origen)" : ""}`;
        const pending = money(Number(a.totals?.pending || 0));
        const guest = Number(a.guest_count || 1);
        return `
          <div class="functions-split-account">
            <strong>${label}</strong>
            <span>Personas: ${guest}</span>
            <span>Pendiente: ${pending}</span>
          </div>
        `;
      })
      .join("");
  }
}

async function showFunctionsSplitAccounts() {
  if (!state.selectedTableId) return;
  await loadSplitAccountsData();
  document.getElementById("functionsMenuSection")?.classList.add("hidden");
  document.getElementById("functionsMoveSeatSection")?.classList.add("hidden");
  document.getElementById("functionsSeatSummarySection")?.classList.add("hidden");
  document.getElementById("functionsSplitAccountsSection")?.classList.remove("hidden");
  await refreshSplitSourceAccountDetail();
  renderSplitAccountsSection();
}

async function refreshSplitSourceAccountDetail() {
  const sourceAccountId = Number(state.splitAccounts.sourceAccountId || 0);
  if (!sourceAccountId) return;
  const data = await api(`/api/accounts/${sourceAccountId}`);
  state.splitAccounts.cachedItemsByAccount = state.splitAccounts.cachedItemsByAccount || {};
  state.splitAccounts.cachedItemsByAccount[sourceAccountId] = data.items || [];
}

async function addEmptyAccountFromFunctions() {
  if (!state.selectedTableId) return;
  await api(`/api/tables/${state.selectedTableId}/accounts`, {
    method: "POST",
    body: JSON.stringify({ waiterId: selectedWaiterId(), guestCount: 1, centerId: selectedCenterId() }),
  });
  await loadSplitAccountsData();
  renderSplitAccountsSection();
  await loadTables();
  toast("Cuenta vacia creada", "success");
}

async function moveSeatBetweenAccountsFromFunctions() {
  const sourceAccountId = Number(state.splitAccounts.sourceAccountId || 0);
  const seatNo = Number(document.getElementById("functionsSplitSeatSelect")?.value || "0");
  const toAccountId = Number(document.getElementById("functionsSplitSeatTargetSelect")?.value || "0");
  if (!sourceAccountId || !seatNo || !toAccountId) {
    toast("Selecciona cuenta origen, silla y cuenta destino", "error");
    return;
  }
  await api(`/api/accounts/${sourceAccountId}/transfer-seat`, {
    method: "POST",
    body: JSON.stringify({ seatNo, toAccountId }),
  });
  if (Number(state.selectedAccountId) === sourceAccountId) await loadAccountDetail();
  await loadSplitAccountsData();
  await refreshSplitSourceAccountDetail();
  renderSplitAccountsSection();
  toast(`Silla ${seatNo} movida`, "success");
}

async function moveItemBetweenAccountsFromFunctions() {
  const sourceAccountId = Number(state.splitAccounts.sourceAccountId || 0);
  const itemId = Number(document.getElementById("functionsSplitItemSelect")?.value || "0");
  const qty = Number(document.getElementById("functionsSplitItemQtyInput")?.value || "0");
  const toAccountId = Number(document.getElementById("functionsSplitItemTargetSelect")?.value || "0");
  if (!sourceAccountId || !itemId || !toAccountId || !qty || qty <= 0) {
    toast("Selecciona platillo, cantidad y cuenta destino", "error");
    return;
  }
  await api(`/api/accounts/${sourceAccountId}/move-item`, {
    method: "POST",
    body: JSON.stringify({ itemId, toAccountId, qty }),
  });
  if (Number(state.selectedAccountId) === sourceAccountId) await loadAccountDetail();
  await loadSplitAccountsData();
  await refreshSplitSourceAccountDetail();
  renderSplitAccountsSection();
  toast("Platillo movido a otra cuenta", "success");
}

async function splitEqualAcrossAccountsFromFunctions() {
  const sourceAccountId = Number(state.splitAccounts.sourceAccountId || 0);
  const targetAccountIds = (state.splitAccounts.accounts || []).map((a) => Number(a.id));
  if (!sourceAccountId || targetAccountIds.length < 2) {
    toast("Necesitas al menos 2 cuentas abiertas para compartir", "error");
    return;
  }
  const confirmed = await askConfirm({
    title: "Compartir 1/N",
    message: `Se repartira cada platillo de la cuenta origen entre ${targetAccountIds.length} cuentas. Deseas continuar?`,
    okText: "Si, compartir",
  });
  if (!confirmed) return;
  await api(`/api/accounts/${sourceAccountId}/split-equal`, {
    method: "POST",
    body: JSON.stringify({ targetAccountIds }),
  });
  if (Number(state.selectedAccountId) === sourceAccountId) await loadAccountDetail();
  await loadSplitAccountsData();
  await refreshSplitSourceAccountDetail();
  renderSplitAccountsSection();
  toast("Cuenta compartida entre cuentas de la mesa", "success");
}

function buildSeatSummaryRows(detail) {
  const items = Array.isArray(detail?.items) ? detail.items : [];
  const bySeat = items.reduce((acc, i) => {
    const seat = Number(i.seat_no || 1);
    acc[seat] = Number(acc[seat] || 0) + Number(i.line_total || 0);
    return acc;
  }, {});
  return Object.entries(bySeat)
    .map(([seat, subtotal]) => ({ seat: Number(seat), subtotal: Number(subtotal || 0) }))
    .sort((a, b) => a.seat - b.seat);
}

function buildSeatPrecheckBlock(detail, seatNo, withPageBreak = false) {
  const seatItems = (detail.items || []).filter((i) => Number(i.seat_no || 1) === Number(seatNo));
  const seatSubtotal = seatItems.reduce((sum, i) => sum + Number(i.line_total || 0), 0);
  const itemsHtml = seatItems
    .map((i) => {
      const mods = (i.modifiers || [])
        .map((m) => `&nbsp;&nbsp;+ ${escapeHtml(m.name)}${Number(m.priceDelta || 0) ? ` (${money(m.priceDelta)})` : ""}`)
        .join("<br/>");
      return `
        <div class="line-item">
          <div>${escapeHtml(i.product_name)} x${Number(i.qty || 0)}</div>
          ${mods ? `<div>${mods}</div>` : ""}
          ${i.notes ? `<div>Nota: ${escapeHtml(i.notes)}</div>` : ""}
          <div class="amount">${money(i.line_total)}</div>
        </div>
      `;
    })
    .join("");
  return `
    <div class="seat-block ${withPageBreak ? "page-break" : ""}">
      <div class="center">
        <h1>CUENTA POR SILLA</h1>
        <p>POS Restaurante</p>
      </div>
      <div class="sp">Mesa: ${escapeHtml(state.selectedTableCode || "-")}</div>
      <div>Check: ${escapeHtml(detail.account?.check_number || "-")}</div>
      <div>Silla: ${Number(seatNo)}</div>
      <div>Mesero: ${escapeHtml(detail.account?.waiter_name || "-")}</div>
      <div>Fecha: ${escapeHtml(new Date().toLocaleString())}</div>
      <div class="sep"></div>
      ${itemsHtml || "<div>Sin productos</div>"}
      <div class="sep"></div>
      <div class="row"><span>Pendiente de pago silla ${Number(seatNo)}</span><strong>${money(seatSubtotal)}</strong></div>
      <div class="row"><strong>Total silla ${Number(seatNo)}</strong><strong>${money(seatSubtotal)}</strong></div>
      <div class="row"><span>Total cuenta completa</span><span>${money(detail?.totals?.total || 0)}</span></div>
      <div class="sep"></div>
    </div>
  `;
}

function openSeatPrecheckPrint(seatNo) {
  const detail = state.accountDetail;
  if (!detail || !Array.isArray(detail.items)) return;
  const blockHtml = buildSeatPrecheckBlock(detail, seatNo, false);
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Cuenta por Silla</title>
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          body { font-family: "Courier New", monospace; width: 72mm; margin: 0 auto; color: #111; font-size: 12px; }
          h1, h2, p { margin: 0; }
          .center { text-align: center; }
          .sp { margin-top: 6px; }
          .sep { border-top: 1px dashed #333; margin: 6px 0; }
          .line-item { margin-bottom: 6px; }
          .amount { text-align: right; font-weight: bold; }
          .row { display: flex; justify-content: space-between; gap: 8px; }
          .page-break { page-break-after: always; }
        </style>
      </head>
      <body>${blockHtml}</body>
    </html>
  `;
  const printWindow = window.open("", "_blank", "width=420,height=760");
  if (!printWindow) {
    toast("Habilita popups para imprimir la cuenta por silla", "error");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

function printAllSeatPrechecks() {
  const detail = state.accountDetail;
  const rows = buildSeatSummaryRows(detail);
  if (!rows.length) {
    toast("No hay sillas para imprimir", "error");
    return;
  }
  const blocks = rows.map((r, idx) => buildSeatPrecheckBlock(detail, r.seat, idx < rows.length - 1)).join("");
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Cuentas por Silla</title>
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          body { font-family: "Courier New", monospace; width: 72mm; margin: 0 auto; color: #111; font-size: 12px; }
          h1, h2, p { margin: 0; }
          .center { text-align: center; }
          .sp { margin-top: 6px; }
          .sep { border-top: 1px dashed #333; margin: 6px 0; }
          .line-item { margin-bottom: 6px; }
          .amount { text-align: right; font-weight: bold; }
          .row { display: flex; justify-content: space-between; gap: 8px; }
          .page-break { page-break-after: always; }
        </style>
      </head>
      <body>${blocks}</body>
    </html>
  `;
  const printWindow = window.open("", "_blank", "width=420,height=760");
  if (!printWindow) {
    toast("Habilita popups para imprimir cuentas por silla", "error");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

async function askInput(config) {
  const result = await showModal({ ...config, input: true });
  return result ? String(result).trim() : null;
}

async function askConfirm(config) {
  const result = await showModal({ ...config, input: false });
  return Boolean(result);
}

function selectedWaiterId() {
  return Number(document.getElementById("waiterSelect").value);
}

function selectedWaiterName() {
  const select = document.getElementById("waiterSelect");
  return select?.selectedOptions?.[0]?.textContent || "-";
}

function setOrderWaiterText(name) {
  const el = document.getElementById("orderWaiterText");
  if (!el) return;
  const safeName = String(name || "").trim() || selectedWaiterName();
  el.textContent = `Mesero: ${safeName}`;
}

function updateMenuQuickActionsState() {
  const sendBtn = document.getElementById("menuSendOrderBtn");
  const payBtn = document.getElementById("menuPayTableBtn");
  const precheckBtn = document.getElementById("menuPrecheckBtn");
  const disabled = !state.selectedAccountId;
  if (sendBtn) sendBtn.disabled = disabled;
  if (payBtn) payBtn.disabled = disabled;
  if (precheckBtn) precheckBtn.disabled = disabled;
}

function selectedCashierId() {
  return Number(document.getElementById("cashierSelect").value);
}

function selectedCenterId() {
  return Number(state.selectedCenterId || 0);
}

function normalizePaymentMethodCode(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function availablePaymentMethods() {
  if (Array.isArray(state.paymentMethods) && state.paymentMethods.length) return state.paymentMethods;
  return [
    { code: "cash", label: "Efectivo" },
    { code: "card", label: "Tarjeta" },
    { code: "transfer", label: "Transferencia" },
    { code: "credit_folio", label: "Folio (CxC)" },
    { code: "other", label: "Otro" },
  ];
}

function isCashPaymentMethod(methodCode, methodLabel = "") {
  const code = String(methodCode || "").toLowerCase();
  const label = String(methodLabel || "").toLowerCase();
  return code === "cash" || code.includes("cash") || label.includes("efectivo");
}

function currentGuestCount() {
  const fromAccount = Number(state.accountDetail?.account?.guest_count || 0);
  return Math.max(1, fromAccount || 1);
}

function normalizeSeatNo(seatNo, guests = currentGuestCount()) {
  const guestCount = Math.max(1, Number(guests || 1));
  const parsed = Number(seatNo || 1);
  if (Number.isNaN(parsed)) return 1;
  return Math.min(Math.max(1, parsed), guestCount);
}

function currentAccountSeatKey() {
  return Number(state.selectedAccountId || 0);
}

function getRememberedSeatNo(guests = currentGuestCount()) {
  const key = currentAccountSeatKey();
  if (!key) return 1;
  const remembered = Number(state.lastSeatSelectionByAccount[key] || 1);
  return normalizeSeatNo(remembered, guests);
}

function setRememberedSeatNo(seatNo, guests = currentGuestCount()) {
  const key = currentAccountSeatKey();
  if (!key) return;
  state.lastSeatSelectionByAccount[key] = normalizeSeatNo(seatNo, guests);
}

async function askGuestCount(defaultValue = 1) {
  const result = await showCountPicker({
    title: "Nueva Cuenta",
    message: "Cantidad de personas para esta cuenta",
    defaultValue,
    min: 1,
    max: 20,
    okText: "Iniciar cuenta",
  });
  return result === null ? null : Number(result);
}

async function pickSeatForCurrentAccount() {
  const guests = currentGuestCount();
  if (guests <= 1) {
    setRememberedSeatNo(1, guests);
    return 1;
  }
  const defaultSeat = getRememberedSeatNo(guests);
  const selectedSeat = await showCountPicker({
    title: "Asignar Silla",
    message: `A que silla/persona ira este platillo? (1 a ${guests})`,
    defaultValue: defaultSeat,
    min: 1,
    max: guests,
    okText: "Asignar",
  });
  if (selectedSeat === null) return null;
  const normalized = normalizeSeatNo(selectedSeat, guests);
  setRememberedSeatNo(normalized, guests);
  return normalized;
}

async function loadBootstrap() {
  const data = await api("/api/bootstrap");
  state.categories = data.categories;
  state.paymentMethods = data.paymentMethods || [];
  state.centers = data.centers || [];
  state.terminalIp = data.terminalIp || "";
  state.selectedCenterId = Number(data.autoCenterId || data.defaultCenterId || 0);

  const waiter = document.getElementById("waiterSelect");
  waiter.innerHTML = data.waiters.map((w) => `<option value="${w.id}">${w.full_name}</option>`).join("");

  const cashier = document.getElementById("cashierSelect");
  cashier.innerHTML = data.cashiers.map((c) => `<option value="${c.id}">${c.full_name}</option>`).join("");

  const center = document.getElementById("centerSelect");
  center.innerHTML = state.centers.map((x) => `<option value="${x.id}">${escapeHtml(x.name)}</option>`).join("");
  if (state.selectedCenterId) center.value = String(state.selectedCenterId);
  center.disabled = Boolean(data.autoCenterId);
  const terminalIpText = document.getElementById("terminalIpText");
  if (terminalIpText) {
    terminalIpText.textContent = state.terminalIp ? `PC: ${state.terminalIp}${data.autoCenterId ? " | Centro fijo por IP" : ""}` : "";
  }

  renderPaymentMethodSelect();
  renderCategories();
  await loadTables();
}

function renderPaymentMethodSelect() {
  const methods = state.paymentMethods.length
    ? state.paymentMethods
    : [
        { code: "cash", label: "Efectivo" },
        { code: "card", label: "Tarjeta" },
        { code: "transfer", label: "Transferencia" },
        { code: "credit_folio", label: "Folio (CxC)" },
      ];
  ["paymentMethod", "cashPaymentMethod"].forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = methods.map((m) => `<option value="${m.code}">${escapeHtml(m.label)}</option>`).join("");
  });
}

async function loadTables() {
  const tables = await api(`/api/tables?centerId=${selectedCenterId() || 0}`);
  const grid = document.getElementById("tablesGrid");
  grid.innerHTML = "";
  for (const t of tables) {
    const isBusy = Number(t.open_accounts) > 0;
    const activityText = tableElapsedLabel(t.last_activity_at);
    const btn = document.createElement("button");
    btn.className = `table-btn ${isBusy ? "table-busy" : "table-free"}`;
    btn.innerHTML = `
      <div class="table-visual-wrap">
        <div class="table-visual-top"></div>
        <div class="table-visual-leg table-leg-1"></div>
        <div class="table-visual-leg table-leg-2"></div>
        <div class="table-visual-leg table-leg-3"></div>
        <div class="table-visual-leg table-leg-4"></div>
      </div>
      <div class="table-headline">
        <div class="table-code">${escapeHtml(t.code)}</div>
        <div class="table-status ${isBusy ? "status-busy" : "status-free"}">${isBusy ? "Ocupada" : "Libre"}</div>
      </div>
      <div class="table-area">${escapeHtml(t.area_name)}</div>
      <div class="table-footer">
        <div class="table-accounts">${Number(t.open_accounts || 0)} cuenta(s)</div>
        <div class="table-time" ${t.last_activity_at ? `data-activity="${escapeHtml(t.last_activity_at)}"` : ""}>${activityText}</div>
      </div>
    `;
    btn.onclick = () => openTable(t.id, t.code).catch((e) => toast(e.message, "error"));
    grid.appendChild(btn);
  }
  refreshTablesElapsedTimes();
}

function showTablesView() {
  hideRestaurantViews();
  document.getElementById("tablesView").classList.remove("hidden");
  document.getElementById("restaurantHeader")?.classList.add("hidden");
  updateMenuQuickActionsState();
}

function hideRestaurantViews() {
  document.getElementById("restaurantHomeView")?.classList.add("hidden");
  document.getElementById("tablesView").classList.add("hidden");
  document.getElementById("accountPickerView").classList.add("hidden");
  document.getElementById("serviceView").classList.add("hidden");
  document.getElementById("settingsView").classList.add("hidden");
  document.getElementById("cashierView").classList.add("hidden");
  document.getElementById("opsView").classList.add("hidden");
}

function showRestaurantHomeView() {
  hideRestaurantViews();
  document.getElementById("restaurantHomeView")?.classList.remove("hidden");
  document.getElementById("restaurantHeader")?.classList.remove("hidden");
  document.getElementById("restaurantHeader")?.classList.remove("header-hide-pickers");
  updateMenuQuickActionsState();
}

function showModuleLauncher() {
  state.activeModule = null;
  backToTables();
  document.getElementById("moduleLauncher")?.classList.remove("hidden");
  document.getElementById("restaurantHeader")?.classList.add("hidden");
  document.getElementById("restaurantMain")?.classList.add("hidden");
}

function enterRestaurantModule() {
  state.activeModule = "restaurant";
  document.getElementById("moduleLauncher")?.classList.add("hidden");
  document.getElementById("restaurantHeader")?.classList.remove("hidden");
  document.getElementById("restaurantMain")?.classList.remove("hidden");
  showRestaurantHomeView();
}

function showAccountPickerView() {
  hideRestaurantViews();
  document.getElementById("accountPickerView").classList.remove("hidden");
  document.getElementById("restaurantHeader")?.classList.remove("hidden");
  document.getElementById("restaurantHeader")?.classList.add("header-hide-pickers");
  updateMenuQuickActionsState();
}

function showServiceView() {
  hideRestaurantViews();
  document.getElementById("serviceView").classList.remove("hidden");
  document.getElementById("restaurantHeader")?.classList.remove("hidden");
  document.getElementById("restaurantHeader")?.classList.add("header-hide-pickers");
  updateMenuQuickActionsState();
}

function showSettingsView() {
  hideRestaurantViews();
  document.getElementById("settingsView").classList.remove("hidden");
  document.getElementById("restaurantHeader")?.classList.remove("hidden");
  document.getElementById("restaurantHeader")?.classList.remove("header-hide-pickers");
  updateMenuQuickActionsState();
}

function showCashierView() {
  hideRestaurantViews();
  document.getElementById("cashierView").classList.remove("hidden");
  document.getElementById("restaurantHeader")?.classList.remove("hidden");
  document.getElementById("restaurantHeader")?.classList.remove("header-hide-pickers");
  updateMenuQuickActionsState();
}

function showOpsView() {
  hideRestaurantViews();
  document.getElementById("opsView").classList.remove("hidden");
  document.getElementById("restaurantHeader")?.classList.remove("hidden");
  document.getElementById("restaurantHeader")?.classList.remove("header-hide-pickers");
  updateMenuQuickActionsState();
}

async function openTable(tableId, tableCode) {
  state.selectedTableId = tableId;
  state.selectedTableCode = tableCode;
  document.getElementById("orderTitle").textContent = `Mesa ${tableCode}`;
  const accounts = await api(`/api/tables/${tableId}/accounts`);
  state.tableAccounts = accounts;
  if (!accounts.length) {
    await createAccount({ guestCount: 1, withPrompt: true });
    return;
  }
  if (accounts.length === 1) {
    state.selectedAccountId = accounts[0].id;
    showServiceView();
    document.getElementById("orderTitle").textContent = `Mesa ${state.selectedTableCode} | ${accounts[0].check_number}`;
    await loadAccountDetail();
    return;
  }

  state.selectedAccountId = null;
  renderAccountPickerCards();
  showAccountPickerView();
}

function accountCardHtml(acc) {
  const openedAt = acc.opened_at ? new Date(acc.opened_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
  const openAge = acc.opened_at ? tableElapsedLabel(acc.opened_at) : "Sin hora";
  const pending = Number(acc.totals?.pending || 0);
  const total = Number(acc.totals?.total || 0);
  return `
    <div class="account-card-header">
      <div class="account-card-check">${escapeHtml(acc.check_number)}</div>
      <div class="account-chip ${pending > 0 ? "account-chip-open" : "account-chip-paid"}">${pending > 0 ? "Abierta" : "Pagada"}</div>
    </div>
    <div class="account-card-meta">Mesa ${escapeHtml(state.selectedTableCode || "")}</div>
    <div class="account-card-meta">Mesero: ${escapeHtml(acc.waiter_name || "-")} | Personas: ${Number(acc.guest_count || 0)}</div>
    <div class="account-card-meta">Inicio: ${escapeHtml(openedAt)} | ${escapeHtml(openAge)}</div>
    <div class="account-card-divider"></div>
    <div class="account-card-money-row">
      <div>
        <span class="account-card-money-label">Total</span>
        <strong class="account-card-money-value">${money(total)}</strong>
      </div>
      <div>
        <span class="account-card-money-label">Pendiente</span>
        <strong class="account-card-money-value">${money(pending)}</strong>
      </div>
    </div>
  `;
}

function renderAccountPickerCards() {
  const count = state.tableAccounts.length;
  document.getElementById("accountPickerTitle").textContent = `Mesa ${state.selectedTableCode} | ${count} cuenta(s)`;
  const wrap = document.getElementById("accountPickerCards");
  wrap.innerHTML = "";
  for (const acc of state.tableAccounts) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "account-card";
    card.innerHTML = accountCardHtml(acc);
    card.onclick = async () => {
      state.selectedAccountId = acc.id;
      showServiceView();
      document.getElementById("orderTitle").textContent = `Mesa ${state.selectedTableCode} | ${acc.check_number}`;
      await loadAccountDetail();
    };
    wrap.appendChild(card);
  }
}

async function createAccount({ guestCount = 1, withPrompt = true } = {}) {
  if (!state.selectedTableId) return false;
  let finalGuestCount = guestCount;
  if (withPrompt) {
    const people = await askGuestCount(guestCount || 1);
    if (people === null) return false;
    finalGuestCount = Number(people || 1);
  }
  const payload = {
    waiterId: selectedWaiterId(),
    guestCount: Number.isNaN(finalGuestCount) ? 1 : finalGuestCount,
    centerId: selectedCenterId(),
  };
  await api(`/api/tables/${state.selectedTableId}/accounts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  state.tableAccounts = await api(`/api/tables/${state.selectedTableId}/accounts`);
  state.selectedAccountId = state.tableAccounts[0].id;
  showServiceView();
  await loadAccountDetail();
  await loadTables();
  toast("Cuenta creada", "success");
  return true;
}

function renderCategories() {
  const row = document.getElementById("categoriesRow");
  row.innerHTML = "";
  for (const c of state.categories) {
    const b = document.createElement("button");
    b.textContent = c.name;
    if (Number(state.selectedCategoryId) === Number(c.id)) b.classList.add("tab-active");
    b.onclick = () => {
      state.selectedCategoryId = Number(c.id);
      state.selectedProductId = null;
      renderCategories();
      loadProducts(c.id).catch((e) => toast(e.message, "error"));
    };
    row.appendChild(b);
  }
}

async function loadProducts(categoryId) {
  state.products = await api(`/api/catalog/products?categoryId=${categoryId}&centerId=${selectedCenterId() || 0}`);
  const row = document.getElementById("productsRow");
  clearProductBuilder();
  row.innerHTML = "";
  for (const p of state.products) {
    const b = document.createElement("button");
    b.textContent = `${p.name} ${money(p.base_price)}`;
    if (Number(state.selectedProductId) === Number(p.id)) b.classList.add("tab-active");
    b.onclick = () => {
      state.selectedProductId = Number(p.id);
      row.querySelectorAll("button").forEach((btn) => btn.classList.remove("tab-active"));
      b.classList.add("tab-active");
      startProductFlow(p).catch((e) => toast(e.message, "error"));
    };
    row.appendChild(b);
  }
}

function clearProductBuilder() {
  state.productBuilder = null;
  const host = document.getElementById("productBuilder");
  host.classList.add("hidden");
  host.innerHTML = "";
  renderOrderWithLiveBuilder();
}

function selectedCount(selectionByOption) {
  return Object.values(selectionByOption || {}).reduce((acc, qty) => acc + Number(qty || 0), 0);
}

function isGroupSelectionValid(group, selectionByOption) {
  const count = selectedCount(selectionByOption);
  const min = Math.max(0, Number(group.minSelect || 0));
  const max = Number(group.maxSelect || 0);
  if (count < min) return false;
  if (max > 0 && count > max) return false;
  return true;
}

function selectionRuleLabel(group) {
  const min = Math.max(0, Number(group.minSelect || 0));
  const max = Number(group.maxSelect || 0);
  if (max <= 0) return min > 0 ? `Minimo ${min}` : "Opcional";
  if (min === max) return `Selecciona ${max}`;
  if (min > 0) return `${min} a ${max}`;
  return `Hasta ${max}`;
}

function canInteractWithGroup(group) {
  return Number(group.maxSelect || 0) > 0 && Array.isArray(group.options) && group.options.length > 0;
}

function findInteractiveGroupIndex(product, startIndex, step) {
  let index = startIndex;
  while (index >= 0 && index < product.modifiers.length) {
    if (canInteractWithGroup(product.modifiers[index])) return index;
    index += step;
  }
  return -1;
}

function expandSelectionToIds(selectionByOption) {
  const ids = [];
  for (const [optionId, qty] of Object.entries(selectionByOption || {})) {
    for (let i = 0; i < Number(qty || 0); i += 1) ids.push(Number(optionId));
  }
  return ids;
}

function collectBuilderModifiers(builder) {
  if (!builder?.product?.modifiers) return [];
  const selected = [];
  for (const group of builder.product.modifiers) {
    const selectedByOption = builder.selections[group.groupId] || {};
    for (const option of group.options || []) {
      const qty = Number(selectedByOption[option.id] || 0);
      for (let i = 0; i < qty; i += 1) {
        selected.push({
          name: option.name,
          priceDelta: Number(option.price_delta || 0),
        });
      }
    }
  }
  return selected;
}

function buildPendingBuilderItem() {
  const builder = state.productBuilder;
  if (!builder) return null;
  const modifiers = collectBuilderModifiers(builder);
  const lineTotal = Number(builder.product.base_price || 0) + modifiers.reduce((sum, m) => sum + Number(m.priceDelta || 0), 0);
  return {
    isDraft: true,
    seat_no: Number(builder.seatNo || 1),
    product_name: builder.product.name,
    qty: 1,
    notes: "Seleccionando guarniciones...",
    modifiers,
    line_total: lineTotal,
  };
}

function renderOrderList(items, pendingBuilderItem = null) {
  const list = document.getElementById("orderList");
  if (!list) return;
  list.innerHTML = "";
  const rows = [...(items || [])];
  if (pendingBuilderItem) rows.push(pendingBuilderItem);

  for (const i of rows) {
    const div = document.createElement("div");
    const isDraft = Boolean(i.isDraft);
    div.className = `item-row ${isDraft ? "item-row-draft" : ""}`;
    const isSent = Boolean(i.sent_at);
    const qtyNum = Number(i.qty || 0);
    const mods = i.modifiers?.length
      ? `<div>${i.modifiers.map((m) => `${m.name}${m.priceDelta ? ` (+${money(m.priceDelta)})` : ""}`).join(", ")}</div>`
      : "";
    if (isDraft) {
      div.innerHTML = `
        <div><strong>Silla ${i.seat_no}</strong> - ${i.product_name} x${i.qty}</div>
        ${mods}
        <div>${i.notes || ""}</div>
        <div class="item-draft-badge">En armado (tiempo real)</div>
        <div>${money(i.line_total)}</div>
      `;
      list.appendChild(div);
      continue;
    }

    div.innerHTML = `
      <div><strong>Silla ${i.seat_no}</strong> - ${i.product_name} x${i.qty}</div>
      ${mods}
      <div>${i.notes || ""}</div>
      <div class="item-actions">
        <button type="button" data-item-action="dec" data-item-id="${i.id}" data-item-qty="${qtyNum}" ${isSent ? "disabled" : ""}>-</button>
        <button type="button" data-item-action="inc" data-item-id="${i.id}" data-item-qty="${qtyNum}" ${isSent ? "disabled" : ""}>+</button>
        <button type="button" data-item-action="remove" data-item-id="${i.id}" data-item-sent="${isSent ? 1 : 0}">${
          isSent ? "Revertir" : "Quitar"
        }</button>
      </div>
      ${isSent ? '<div class="item-sent-badge">Enviado</div>' : ""}
      <div>${money(i.line_total)}</div>
    `;
    div.querySelector('[data-item-action="dec"]')?.addEventListener("click", () => {
      changeItemQty(i.id, qtyNum - 1).catch((e) => toast(e.message, "error"));
    });
    div.querySelector('[data-item-action="inc"]')?.addEventListener("click", () => {
      changeItemQty(i.id, qtyNum + 1).catch((e) => toast(e.message, "error"));
    });
    div.querySelector('[data-item-action="remove"]')?.addEventListener("click", () => {
      removeItem(i.id, isSent).catch((e) => toast(e.message, "error"));
    });
    list.appendChild(div);
  }
}

function renderOrderWithLiveBuilder() {
  if (!state.accountDetail) return;
  const pendingBuilderItem = buildPendingBuilderItem();
  renderOrderList(state.accountDetail.items, pendingBuilderItem);
  renderAccountTotals(state.accountDetail.totals, pendingBuilderItem);
}

function renderAccountTotals(totals, pendingBuilderItem = null) {
  const baseSubtotal = Number(totals?.subtotal || 0);
  const baseDiscount = Number(totals?.discountTotal || 0);
  const baseTip = Number(totals?.tipAmount || 0);
  const baseTotal = Number(totals?.total || 0);
  const basePaid = Number(totals?.paid || 0);
  const basePending = Number(totals?.pending || 0);
  const draftAmount = Number(pendingBuilderItem?.line_total || 0);

  const subtotalText =
    draftAmount > 0 ? `${money(baseSubtotal)} (est. ${money(baseSubtotal + draftAmount)})` : money(baseSubtotal);

  document.getElementById("subtotalText").textContent = subtotalText;
  document.getElementById("discountText").textContent = money(baseDiscount);
  document.getElementById("tipText").textContent = money(baseTip);
  document.getElementById("totalText").textContent = money(baseTotal);
  document.getElementById("paidText").textContent = money(basePaid);
  document.getElementById("pendingText").textContent = money(basePending);
}

function shortLabel(text, maxChars = 18) {
  const raw = String(text || "").trim();
  if (raw.length <= maxChars) return raw;
  return `${raw.slice(0, maxChars - 1)}...`;
}

function builderThemeClass(groupIndex) {
  const themes = ["builder-theme-1", "builder-theme-2", "builder-theme-3", "builder-theme-4"];
  return themes[groupIndex % themes.length];
}

function interactiveModifierIndexes(product) {
  if (!product || !Array.isArray(product.modifiers)) return [];
  return product.modifiers
    .map((group, index) => ({ group, index }))
    .filter(({ group }) => canInteractWithGroup(group))
    .map(({ index }) => index);
}

function renderProductBuilder() {
  const host = document.getElementById("productBuilder");
  const builder = state.productBuilder;
  if (!builder) {
    host.classList.add("hidden");
    host.innerHTML = "";
    return;
  }

  const group = builder.product.modifiers[builder.groupIndex];
  const selectedByOption = builder.selections[group.groupId] || {};
  const themeClass = builderThemeClass(builder.groupIndex);
  const count = selectedCount(selectedByOption);
  const isLast = findInteractiveGroupIndex(builder.product, builder.groupIndex + 1, 1) === -1;
  const rule = selectionRuleLabel(group);
  const steps = interactiveModifierIndexes(builder.product);
  const stepNumber = Math.max(1, steps.indexOf(builder.groupIndex) + 1);
  const stepTotal = Math.max(1, steps.length);
  const optionsHtml = group.options
    .map((o) => {
      const qty = Number(selectedByOption[o.id] || 0);
      const delta = Number(o.price_delta) ? ` (+${money(o.price_delta)})` : "";
      const name = shortLabel(o.name, 18);
      return `
        <div class="builder-choice-btn ${qty > 0 ? "builder-option-selected" : ""}" title="${escapeHtml(o.name)}">
          <span class="builder-choice-name">${escapeHtml(name)}</span>
          <span class="builder-choice-delta">${escapeHtml(delta || " ")}</span>
          <div class="builder-choice-controls">
            <button type="button" class="builder-qty-btn" data-option-action="dec" data-option-id="${o.id}">-</button>
            <span class="builder-choice-qty">x${qty}</span>
            <button type="button" class="builder-qty-btn" data-option-action="inc" data-option-id="${o.id}">+</button>
          </div>
        </div>
      `;
    })
    .join("");

  host.className = `product-builder ${themeClass}`;
  host.innerHTML = `
    <div class="builder-product-head">
      <div class="builder-product-title">${escapeHtml(builder.product.name)}</div>
      <div class="builder-product-price">${money(builder.product.base_price || 0)}</div>
    </div>
    <div class="builder-only-title">${escapeHtml(group.name)}</div>
    <div class="builder-step-rule">Paso ${stepNumber}/${stepTotal} | ${escapeHtml(rule)} | Seleccionadas: ${count}</div>
    <div class="builder-options">${optionsHtml}</div>
    <div class="builder-actions">
      ${builder.groupIndex > 0 ? '<button type="button" data-builder-action="prev">Atras</button>' : ""}
      ${!isLast ? '<button type="button" data-builder-action="next" class="btn-primary">Siguiente</button>' : ""}
    </div>
  `;
  host.classList.remove("hidden");
  renderOrderWithLiveBuilder();

  host.querySelectorAll("[data-option-action][data-option-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const optionId = Number(btn.getAttribute("data-option-id"));
      const action = btn.getAttribute("data-option-action");
      changeBuilderOptionQty(optionId, action === "inc" ? 1 : -1);
    });
  });
  host.querySelectorAll("[data-builder-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-builder-action");
      if (action === "prev") {
        goPrevBuilderStep();
        return;
      }
      if (action === "next") {
        goNextBuilderStep().catch((e) => toast(e.message, "error"));
        return;
      }
    });
  });
}

function changeBuilderOptionQty(optionId, delta) {
  const builder = state.productBuilder;
  if (!builder) return;

  const group = builder.product.modifiers[builder.groupIndex];
  const selectedByOption = { ...(builder.selections[group.groupId] || {}) };
  const currentQty = Number(selectedByOption[optionId] || 0);
  const totalCount = selectedCount(selectedByOption);
  if (delta > 0 && Number(group.maxSelect) > 0 && totalCount >= Number(group.maxSelect)) {
    toast(`Maximo ${group.maxSelect} opcion(es) para ${group.name}`, "error");
    return;
  }
  if (delta < 0 && currentQty <= 0) return;

  const nextQty = Math.max(0, currentQty + delta);
  if (nextQty === 0) delete selectedByOption[optionId];
  else selectedByOption[optionId] = nextQty;

  builder.selections[group.groupId] = selectedByOption;
  const isLastGroup = findInteractiveGroupIndex(builder.product, builder.groupIndex + 1, 1) === -1;
  const selectedNow = selectedCount(selectedByOption);
  const maxAllowed = Number(group.maxSelect || 0);
  const shouldAutoSubmit =
    delta > 0 && isLastGroup && maxAllowed > 0 && selectedNow >= maxAllowed && isGroupSelectionValid(group, selectedByOption);
  renderProductBuilder();
  if (shouldAutoSubmit) {
    submitBuilderOrder().catch((e) => toast(e.message, "error"));
  }
}

async function goNextBuilderStep() {
  const builder = state.productBuilder;
  if (!builder) return;

  const group = builder.product.modifiers[builder.groupIndex];
  const selected = builder.selections[group.groupId] || {};
  if (!isGroupSelectionValid(group, selected)) {
    toast(`Seleccion invalida para ${group.name}. Regla: ${selectionRuleLabel(group)}`, "error");
    return;
  }

  const nextIndex = findInteractiveGroupIndex(builder.product, builder.groupIndex + 1, 1);
  if (nextIndex >= 0) {
    builder.groupIndex = nextIndex;
    renderProductBuilder();
    return;
  }

  const modifierOptionIds = builder.product.modifiers.flatMap((g) => expandSelectionToIds(builder.selections[g.groupId] || {}));
  await submitProduct(builder.product, modifierOptionIds, "", builder.seatNo);
  clearProductBuilder();
}

function goPrevBuilderStep() {
  const builder = state.productBuilder;
  if (!builder) return;
  const prevIndex = findInteractiveGroupIndex(builder.product, builder.groupIndex - 1, -1);
  if (prevIndex < 0) return;
  builder.groupIndex = prevIndex;
  renderProductBuilder();
}

async function submitBuilderOrder() {
  const builder = state.productBuilder;
  if (!builder) return;

  const steps = interactiveModifierIndexes(builder.product);
  for (const index of steps) {
    const group = builder.product.modifiers[index];
    const selected = builder.selections[group.groupId] || {};
    if (!isGroupSelectionValid(group, selected)) {
      builder.groupIndex = index;
      renderProductBuilder();
      toast(`Completa el paso: ${group.name} (${selectionRuleLabel(group)})`, "error");
      return;
    }
  }

  const modifierOptionIds = builder.product.modifiers.flatMap((g) => expandSelectionToIds(builder.selections[g.groupId] || {}));
  await submitProduct(builder.product, modifierOptionIds, "", builder.seatNo);
  clearProductBuilder();
}

async function startProductFlow(product) {
  if (!state.selectedAccountId) {
    toast("Selecciona una mesa/cuenta", "error");
    return;
  }
  const seatNo = await pickSeatForCurrentAccount();
  if (seatNo === null) return;

  if (product.modifiers && product.modifiers.length) {
    const firstIndex = findInteractiveGroupIndex(product, 0, 1);
    if (firstIndex < 0) {
      await submitProduct(product, [], "", seatNo);
      return;
    }
    state.productBuilder = {
      product,
      groupIndex: firstIndex,
      selections: {},
      seatNo,
    };
    renderProductBuilder();
    return;
  }

  const notesInput = await askInput({
    title: "Comentario",
    message: `Comentario para ${product.name} (opcional)`,
    defaultValue: "",
    placeholder: "Sin cebolla, bien cocido, etc.",
    okText: "Agregar",
  });
  if (notesInput === null) return;
  const notes = notesInput || "";
  await submitProduct(product, [], notes, seatNo);
}

async function submitProduct(product, modifierOptionIds, notes, seatNoOverride = null) {
  if (!state.selectedAccountId) return;
  const guests = currentGuestCount();
  const seatNo = normalizeSeatNo(seatNoOverride || getRememberedSeatNo(guests), guests);
  setRememberedSeatNo(seatNo, guests);

  await api(`/api/accounts/${state.selectedAccountId}/items`, {
    method: "POST",
    body: JSON.stringify({ productId: product.id, seatNo, qty: 1, notes, modifierOptionIds }),
  });
  await loadAccountDetail();
  toast(`${product.name} agregado`, "success");
}

async function loadAccountDetail() {
  if (!state.selectedAccountId) return;
  const data = await api(`/api/accounts/${state.selectedAccountId}`);
  state.accountDetail = data;
  setOrderWaiterText(data?.account?.waiter_name || "");
  const guestCount = Math.max(1, Number(data?.account?.guest_count || 1));
  const accountId = Number(data?.account?.id || state.selectedAccountId || 0);
  if (accountId) {
    const hasRemembered = Object.prototype.hasOwnProperty.call(state.lastSeatSelectionByAccount, accountId);
    if (!hasRemembered) {
      const items = Array.isArray(data?.items) ? data.items : [];
      const lastSeatFromItems = Number(items.length ? items[items.length - 1]?.seat_no : 1);
      state.lastSeatSelectionByAccount[accountId] = normalizeSeatNo(lastSeatFromItems, guestCount);
    } else {
      state.lastSeatSelectionByAccount[accountId] = normalizeSeatNo(state.lastSeatSelectionByAccount[accountId], guestCount);
    }
  }
  updateMenuQuickActionsState();
  renderOrderWithLiveBuilder();
}

function resetCashierSummary() {
  state.cashAccountId = null;
  document.getElementById("cashierAccountTitle").textContent = "Cuenta no cargada";
  document.getElementById("cashierOrderList").innerHTML = "";
  document.getElementById("cashSubtotalText").textContent = money(0);
  document.getElementById("cashDiscountText").textContent = money(0);
  document.getElementById("cashTipText").textContent = money(0);
  document.getElementById("cashTotalText").textContent = money(0);
  document.getElementById("cashPaidText").textContent = money(0);
  document.getElementById("cashPendingText").textContent = money(0);
}

function renderCashierSummary(data) {
  const list = document.getElementById("cashierOrderList");
  list.innerHTML = "";
  for (const i of data.items) {
    const div = document.createElement("div");
    div.className = "item-row";
    const mods = i.modifiers.length
      ? `<div>${i.modifiers.map((m) => `${m.name}${m.priceDelta ? ` (+${money(m.priceDelta)})` : ""}`).join(", ")}</div>`
      : "";
    div.innerHTML = `
      <div><strong>Silla ${i.seat_no}</strong> - ${i.product_name} x${i.qty}</div>
      ${mods}
      <div>${i.notes || ""}</div>
      <div>${money(i.line_total)}</div>
    `;
    list.appendChild(div);
  }

  document.getElementById("cashierAccountTitle").textContent = `Check ${data.account.check_number} | Estado: ${data.account.status}`;
  document.getElementById("cashSubtotalText").textContent = money(data.totals.subtotal);
  document.getElementById("cashDiscountText").textContent = money(data.totals.discountTotal);
  document.getElementById("cashTipText").textContent = money(data.totals.tipAmount || 0);
  document.getElementById("cashTotalText").textContent = money(data.totals.total);
  document.getElementById("cashPaidText").textContent = money(data.totals.paid);
  document.getElementById("cashPendingText").textContent = money(data.totals.pending);
}

async function loadCashierAccountDetail(accountId) {
  const data = await api(`/api/accounts/${accountId}`);
  state.cashAccountId = accountId;
  renderCashierSummary(data);
}

async function findCashierByCheck() {
  const checkNo = String(document.getElementById("cashierCheckInput").value || "").trim();
  if (!checkNo) {
    toast("Ingresa numero de check", "error");
    return;
  }
  const found = await api(`/api/accounts/by-check/${encodeURIComponent(checkNo)}`);
  document.getElementById("cashierAccountIdInput").value = String(found.id);
  await loadCashierAccountDetail(found.id);
}

async function findCashierByAccountId() {
  const accountId = Number(document.getElementById("cashierAccountIdInput").value || "0");
  if (!accountId) {
    toast("Ingresa un ID de cuenta valido", "error");
    return;
  }
  await loadCashierAccountDetail(accountId);
}

async function applyCashierDiscount() {
  if (!state.cashAccountId) {
    toast("Carga una cuenta en Caja", "error");
    return;
  }
  const type = document.getElementById("cashDiscountType").value;
  const value = Number(document.getElementById("cashDiscountValue").value || "0");
  await api(`/api/accounts/${state.cashAccountId}/discounts`, {
    method: "POST",
    body: JSON.stringify({ type, value, reason: "Caja", createdBy: selectedCashierId() || selectedWaiterId() }),
  });
  await loadCashierAccountDetail(state.cashAccountId);
  toast("Descuento aplicado", "success");
}

async function addCashierPayment() {
  if (!state.cashAccountId) {
    toast("Carga una cuenta en Caja", "error");
    return;
  }
  const method = document.getElementById("cashPaymentMethod").value;
  const amount = Number(document.getElementById("cashPaymentAmount").value || "0");
  await api(`/api/accounts/${state.cashAccountId}/payments`, {
    method: "POST",
    body: JSON.stringify({ method, amount }),
  });
  await loadCashierAccountDetail(state.cashAccountId);
  toast("Pago agregado", "success");
}

async function closeCashierAccount() {
  if (!state.cashAccountId) {
    toast("Carga una cuenta en Caja", "error");
    return;
  }
  const confirmed = await askConfirm({
    title: "Cerrar Cuenta",
    message: "Esta accion cerrara la cuenta actual. ¿Deseas continuar?",
    okText: "Si, cerrar",
  });
  if (!confirmed) return;
  await api(`/api/accounts/${state.cashAccountId}/close`, { method: "POST" });
  toast("Cuenta cerrada", "success");
  await loadTables();
  await loadCashierAccountDetail(state.cashAccountId);
}

async function changeItemQty(itemId, nextQty) {
  if (nextQty <= 0) {
    await removeItem(itemId, false);
    return;
  }
  await api(`/api/items/${itemId}/qty`, {
    method: "POST",
    body: JSON.stringify({ qty: nextQty }),
  });
  await loadAccountDetail();
  toast("Cantidad actualizada", "success");
}

async function removeItem(itemId, isSent = false) {
  let pin = "";
  let reason = isSent ? "Reversion de platillo enviado" : "Eliminado desde POS";
  if (isSent) {
    const authPin = await askInput({
      title: "Revertir Platillo Enviado",
      message: "Ingresa PIN de manager/admin para autorizar",
      placeholder: "PIN autorizacion",
      okText: "Autorizar",
    });
    if (authPin === null) return;
    pin = String(authPin || "").trim();
    if (!pin) {
      toast("PIN requerido para revertir", "error");
      return;
    }
    const customReason = await askInput({
      title: "Motivo",
      message: "Motivo de la reversion (opcional)",
      defaultValue: reason,
      okText: "Continuar",
    });
    if (customReason === null) return;
    reason = String(customReason || reason).trim() || reason;
  }

  const confirmed = await askConfirm({
    title: isSent ? "Revertir Platillo" : "Quitar Platillo",
    message: isSent ? "Se revertira un platillo ya enviado. Deseas continuar?" : "Deseas quitar este platillo de la cuenta?",
    okText: isSent ? "Si, revertir" : "Si, quitar",
  });
  if (!confirmed) return;
  const result = await api(`/api/items/${itemId}/void`, {
    method: "POST",
    body: JSON.stringify({
      reason,
      authorizedBy: selectedWaiterId(),
      authPin: pin,
    }),
  });
  await loadAccountDetail();
  if (result?.reversalTicket) {
    const t = result.reversalTicket;
    toast(
      `Comanda de REVERSIÓN enviada a ${t.centerName} (${t.printerName}) | Autorizó: ${t.authorizedBy.fullName}`,
      "info",
      5200
    );
  }
  toast(isSent ? "Platillo revertido" : "Platillo eliminado", "success");
}

async function applyDiscount() {
  if (!state.selectedAccountId) return;
  const type = document.getElementById("discountType").value;
  const value = Number(document.getElementById("discountValue").value || "0");
  await api(`/api/accounts/${state.selectedAccountId}/discounts`, {
    method: "POST",
    body: JSON.stringify({ type, value, reason: "Manual", createdBy: selectedWaiterId() }),
  });
  await loadAccountDetail();
  toast("Descuento aplicado", "success");
}

async function addPayment() {
  if (!state.selectedAccountId) return;
  const method = document.getElementById("paymentMethod").value;
  const amount = Number(document.getElementById("paymentAmount").value || "0");
  await api(`/api/accounts/${state.selectedAccountId}/payments`, {
    method: "POST",
    body: JSON.stringify({ method, amount }),
  });
  await loadAccountDetail();
  toast("Pago agregado", "success");
}

async function applyPayTableModalPayments({ closeAfter = false } = {}) {
  if (!state.selectedAccountId) return;
  const lines = (state.payTableModal.lines || [])
    .map((line) => ({
      method: normalizePaymentMethodCode(line.method),
      amount: Number(line.amount || 0),
      referenceNo: String(line.referenceNo || "").trim(),
      cashReceived: Number(line.cashReceived || 0),
    }))
    .filter((line) => line.amount > 0);

  if (!lines.length) {
    toast("Agrega al menos un pago con monto mayor a 0", "error");
    return;
  }

  const methodsByCode = Object.fromEntries(availablePaymentMethods().map((m) => [String(m.code), m]));
  const pending = getPayTablePending();
  const totalToApply = lines.reduce((sum, line) => sum + line.amount, 0);
  if (totalToApply > pending + 0.0001) {
    toast(`No puedes aplicar mas del pendiente (${money(pending)})`, "error");
    return;
  }

  for (const line of lines) {
    if (!line.method) {
      toast("Hay una forma de pago sin codigo valido", "error");
      return;
    }
    const methodMeta = methodsByCode[line.method];
    if (!methodMeta) {
      toast(`Forma de pago no disponible: ${line.method}`, "error");
      return;
    }
    if (isCashPaymentMethod(line.method, methodMeta.label) && line.cashReceived + 0.0001 < line.amount) {
      toast(`En efectivo, el recibido debe ser mayor o igual al monto aplicado (${methodMeta.label})`, "error");
      return;
    }
  }

  for (const line of lines) {
    await api(`/api/accounts/${state.selectedAccountId}/payments`, {
      method: "POST",
      body: JSON.stringify({
        method: line.method,
        amount: Number(line.amount.toFixed(2)),
        referenceNo: line.referenceNo,
      }),
    });
  }

  await loadAccountDetail();
  await loadTables();
  toast("Pagos aplicados", "success");

  if (!closeAfter) {
    closePayTableModal();
    backToTables();
    return;
  }

  if (Number(state.accountDetail?.totals?.pending || 0) > 0) {
    toast("La cuenta sigue con saldo pendiente. Completa el pago para cerrar.", "info");
    return;
  }

  await api(`/api/accounts/${state.selectedAccountId}/close`, { method: "POST" });
  toast("Cuenta cerrada", "success");
  closePayTableModal();
  await handleAfterAccountClosed();
  backToTables();
}

async function removeTipForCurrentAccount() {
  if (!state.selectedAccountId) {
    toast("Selecciona una cuenta", "error");
    return;
  }
  const tipIsOverridden = Boolean(state.accountDetail?.totals?.tipIsOverridden);
  if (tipIsOverridden) {
    const confirmedRestore = await askConfirm({
      title: "Restaurar Propina",
      message: "Se restaurara la propina configurada globalmente para esta cuenta. Deseas continuar?",
      okText: "Si, restaurar",
    });
    if (!confirmedRestore) return;
    await api(`/api/accounts/${state.selectedAccountId}/restore-tip`, { method: "POST" });
    await loadAccountDetail();
    openPayTableModal();
    toast("Propina restaurada en esta cuenta", "success");
    return;
  }
  const currentTip = Number(state.accountDetail?.totals?.tipAmount || 0);
  if (currentTip <= 0) {
    toast("Esta cuenta ya tiene propina en 0", "info");
    return;
  }
  const confirmed = await askConfirm({
    title: "Quitar Propina",
    message: "Se quitara la propina de esta cuenta. Deseas continuar?",
    okText: "Si, quitar",
  });
  if (!confirmed) return;
  await api(`/api/accounts/${state.selectedAccountId}/remove-tip`, { method: "POST" });
  await loadAccountDetail();
  openPayTableModal();
  toast("Propina removida para esta cuenta", "success");
}

function renderSettings() {
  const cfg = state.settings;
  if (!cfg) return;

  const activeAreas = (cfg.areas || []).filter((a) => Number(a.is_active) === 1);
  const areasForSelects = activeAreas.length ? activeAreas : cfg.areas || [];
  const areaSelect = document.getElementById("cfgAreaSelect");
  areaSelect.innerHTML = areasForSelects.map((a) => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join("");
  const activeCenters = (cfg.operationCenters || []).filter((c) => Number(c.is_active) === 1);
  const centersForSelects = activeCenters.length ? activeCenters : cfg.operationCenters || [];
  const centerOptions = centersForSelects
    .map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
    .join("");
  document.getElementById("cfgTableCenterSelect").innerHTML = centerOptions;
  document.getElementById("cfgTerminalCenterSelect").innerHTML = centerOptions;
  document.getElementById("cfgCenterProductCenterSelect").innerHTML = centerOptions;
  document.getElementById("cfgCenterAreaSelect").innerHTML = areaSelect.innerHTML;
  const categoriesList = document.getElementById("cfgCategoriesList");
  categoriesList.innerHTML = (cfg.categories || [])
    .map(
      (cat) => `
      <div class="item-row cfg-entity-row">
        <div class="cfg-entity-main">
          <strong>${escapeHtml(cat.name)}</strong>
          <div class="cfg-entity-meta">
            <span>Orden: ${Number(cat.sort_order || 0)}</span>
            <span class="cfg-chip ${Number(cat.is_active) ? "cfg-chip-on" : "cfg-chip-off"}">${Number(cat.is_active) ? "Activa" : "Inactiva"}</span>
          </div>
        </div>
        <div class="cfg-entity-actions">
          <button type="button" class="cfg-icon-btn cfg-icon-edit" title="Editar" aria-label="Editar" data-category-action="edit" data-category-id="${cat.id}">✎</button>
          <button type="button" class="cfg-icon-btn ${Number(cat.is_active) ? "cfg-icon-disable" : "cfg-icon-enable"}" title="${
            Number(cat.is_active) ? "Inhabilitar" : "Habilitar"
          }" aria-label="${Number(cat.is_active) ? "Inhabilitar" : "Habilitar"}" data-category-action="toggle" data-category-id="${
            cat.id
          }" data-next-active="${Number(cat.is_active) ? 0 : 1}">${Number(cat.is_active) ? "✕" : "✓"}</button>
        </div>
      </div>
    `
    )
    .join("");
  const areasList = document.getElementById("cfgAreasList");
  areasList.innerHTML = (cfg.areas || [])
    .map(
      (a) => `
      <div class="item-row cfg-entity-row">
        <div class="cfg-entity-main">
          <strong>${escapeHtml(a.name)}</strong>
          <div class="cfg-entity-meta">
            <span>Orden: ${Number(a.sort_order || 0)}</span>
            <span class="cfg-chip ${Number(a.is_active) ? "cfg-chip-on" : "cfg-chip-off"}">${Number(a.is_active) ? "Activa" : "Inactiva"}</span>
          </div>
        </div>
        <div class="cfg-entity-actions">
          <button type="button" class="cfg-icon-btn cfg-icon-edit" title="Editar" aria-label="Editar" data-area-action="edit" data-area-id="${a.id}">✎</button>
          <button type="button" class="cfg-icon-btn ${Number(a.is_active) ? "cfg-icon-disable" : "cfg-icon-enable"}" title="${
            Number(a.is_active) ? "Inhabilitar" : "Habilitar"
          }" aria-label="${Number(a.is_active) ? "Inhabilitar" : "Habilitar"}" data-area-action="toggle" data-area-id="${
            a.id
          }" data-next-active="${Number(a.is_active) ? 0 : 1}">${Number(a.is_active) ? "✕" : "✓"}</button>
        </div>
      </div>
    `
    )
    .join("");
  document.getElementById("cfgCenterProductSelect").innerHTML = (cfg.products || [])
    .map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
    .join("");

  const centersList = document.getElementById("cfgCentersList");
  centersList.innerHTML = (cfg.operationCenters || [])
    .map(
      (c) => `
      <div class="item-row cfg-entity-row">
        <div class="cfg-entity-main">
          <strong>${escapeHtml(c.name)}</strong>
          <div class="cfg-entity-meta">
            <span class="cfg-chip ${Number(c.is_active) ? "cfg-chip-on" : "cfg-chip-off"}">${Number(c.is_active) ? "Activo" : "Inactivo"}</span>
          </div>
        </div>
        <div class="cfg-entity-actions">
          <button type="button" class="cfg-icon-btn cfg-icon-edit" title="Editar" aria-label="Editar" data-center-action="edit" data-center-id="${c.id}">✎</button>
          <button type="button" class="cfg-icon-btn ${Number(c.is_active) ? "cfg-icon-disable" : "cfg-icon-enable"}" title="${
            Number(c.is_active) ? "Inhabilitar" : "Habilitar"
          }" aria-label="${Number(c.is_active) ? "Inhabilitar" : "Habilitar"}" data-center-action="toggle" data-center-id="${
            c.id
          }" data-next-active="${Number(c.is_active) ? 0 : 1}">${Number(c.is_active) ? "✕" : "✓"}</button>
        </div>
      </div>
    `
    )
    .join("");

  const tablesList = document.getElementById("cfgTablesList");
  tablesList.innerHTML = cfg.tables
    .map((t) => {
      const center = (cfg.operationCenters || []).find((c) => Number(c.id) === Number(t.operation_center_id));
      return `
        <div class="item-row cfg-entity-row">
          <div class="cfg-entity-main">
            <strong>${escapeHtml(t.code)}</strong>
            <div class="cfg-entity-meta">
              <span>${escapeHtml(center?.name || "-")}</span>
              <span>${escapeHtml(t.area_name)}</span>
              <span>Sillas: ${Number(t.seats || 0)}</span>
              <span class="cfg-chip ${Number(t.is_active) ? "cfg-chip-on" : "cfg-chip-off"}">${Number(t.is_active) ? "Activa" : "Inactiva"}</span>
            </div>
          </div>
          <div class="cfg-entity-actions">
            <button type="button" class="cfg-icon-btn cfg-icon-edit" title="Editar" aria-label="Editar" data-table-action="edit" data-table-id="${t.id}">✎</button>
            <button type="button" class="cfg-icon-btn ${Number(t.is_active) ? "cfg-icon-disable" : "cfg-icon-enable"}" title="${
              Number(t.is_active) ? "Inhabilitar" : "Habilitar"
            }" aria-label="${Number(t.is_active) ? "Inhabilitar" : "Habilitar"}" data-table-action="toggle" data-table-id="${
              t.id
            }" data-next-active="${Number(t.is_active) ? 0 : 1}">${Number(t.is_active) ? "✕" : "✓"}</button>
          </div>
        </div>
      `;
    })
    .join("");

  const productCategory = document.getElementById("cfgProductCategorySelect");
  if (productCategory) {
    const categoriesForSelects = (cfg.categories || []).filter((c) => Number(c.is_active) === 1);
    const finalCategories = categoriesForSelects.length ? categoriesForSelects : cfg.categories || [];
    productCategory.innerHTML = finalCategories
      .map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
      .join("");
  }
  const wizardCategory = document.getElementById("wizardCategorySelect");
  if (wizardCategory) {
    const lastCategory = Number(state.wizardData.categoryId || wizardCategory.value || "0");
    const categoriesForSelects = (cfg.categories || []).filter((c) => Number(c.is_active) === 1);
    const finalCategories = categoriesForSelects.length ? categoriesForSelects : cfg.categories || [];
    wizardCategory.innerHTML = finalCategories
      .map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
      .join("");
    if (lastCategory) wizardCategory.value = String(lastCategory);
  }
  initializeWizardProductTypeSelect();

  renderProductsManager();

  const paymentCodeInput = document.getElementById("cfgPaymentCodeInput");
  if (paymentCodeInput && !String(paymentCodeInput.value || "").trim()) {
    paymentCodeInput.value = "cash";
  }
  const tipPercentInput = document.getElementById("cfgTipPercentInput");
  if (tipPercentInput) {
    tipPercentInput.value = String(Number(cfg.tipPercent || 0));
  }

  const paymentsList = document.getElementById("cfgPaymentsList");
  paymentsList.innerHTML = cfg.paymentMethods
    .map(
      (p) => `
        <div class="item-row cfg-entity-row">
          <div class="cfg-entity-main">
            <strong>${escapeHtml(p.label)}</strong>
            <div class="cfg-entity-meta">
              <span>Codigo: ${escapeHtml(p.code)}</span>
              <span>Orden: ${Number(p.sort_order || 0)}</span>
              <span class="cfg-chip ${Number(p.is_active) ? "cfg-chip-on" : "cfg-chip-off"}">${Number(p.is_active) ? "Activo" : "Inactivo"}</span>
            </div>
          </div>
          <div class="cfg-entity-actions">
            <button type="button" class="cfg-icon-btn cfg-icon-edit" title="Editar" aria-label="Editar" data-payment-action="edit" data-payment-code="${escapeHtml(
              p.code
            )}">✎</button>
            <button type="button" class="cfg-icon-btn ${Number(p.is_active) ? "cfg-icon-disable" : "cfg-icon-enable"}" title="${
              Number(p.is_active) ? "Inhabilitar" : "Habilitar"
            }" aria-label="${Number(p.is_active) ? "Inhabilitar" : "Habilitar"}" data-payment-action="toggle" data-payment-code="${escapeHtml(
              p.code
            )}" data-next-active="${Number(p.is_active) ? 0 : 1}">${Number(p.is_active) ? "✕" : "✓"}</button>
          </div>
        </div>
      `
    )
    .join("");

  const activeGroups = (cfg.groups || []).filter((g) => Number(g.is_active) === 1);
  const groupsForSelects = activeGroups.length ? activeGroups : cfg.groups || [];
  const groupOptions = groupsForSelects.map((g) => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join("");
  document.getElementById("cfgOptionGroupSelect").innerHTML = groupOptions;
  document.getElementById("cfgStepGroupSelect").innerHTML = groupOptions;
  document.getElementById("cfgStepProductSelect").innerHTML = cfg.products
    .filter((p) => Number(p.is_active) === 1)
    .map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
    .join("");

  const optionsByGroup = cfg.options.reduce((acc, o) => {
    acc[o.group_id] = acc[o.group_id] || [];
    acc[o.group_id].push(o);
    return acc;
  }, {});
  const stepByProduct = cfg.productSteps.reduce((acc, s) => {
    acc[s.product_id] = acc[s.product_id] || [];
    acc[s.product_id].push(s);
    return acc;
  }, {});

  const groupsList = document.getElementById("cfgGroupsList");
  groupsList.innerHTML = cfg.groups
    .map((g) => {
      const opts = optionsByGroup[g.id] || [];
      const used = Object.entries(stepByProduct)
        .filter(([, steps]) => steps.some((x) => x.group_id === g.id))
        .map(([productId, steps]) => {
          const prod = cfg.products.find((p) => p.id === Number(productId));
          const step = steps.find((x) => x.group_id === g.id);
          return prod ? `${prod.name} (Paso ${step.sort_order})` : null;
        })
        .filter(Boolean)
        .join(" | ");
      const optionRows = opts.length
        ? opts
            .map(
              (o) => `
                <div class="item-row cfg-entity-row cfg-sub-entity">
                  <div class="cfg-entity-main">
                    <strong>${escapeHtml(o.name)}</strong>
                    <div class="cfg-entity-meta">
                      <span>Extra: ${money(Number(o.price_delta || 0))}</span>
                      <span>Orden: ${Number(o.sort_order || 0)}</span>
                      <span class="cfg-chip ${Number(o.is_active) ? "cfg-chip-on" : "cfg-chip-off"}">${
                        Number(o.is_active) ? "Activa" : "Inactiva"
                      }</span>
                    </div>
                  </div>
                  <div class="cfg-entity-actions">
                    <button type="button" class="cfg-icon-btn cfg-icon-edit" title="Editar" aria-label="Editar" data-option-action="edit" data-option-id="${o.id}">✎</button>
                    <button type="button" class="cfg-icon-btn ${Number(o.is_active) ? "cfg-icon-disable" : "cfg-icon-enable"}" title="${
                      Number(o.is_active) ? "Inhabilitar" : "Habilitar"
                    }" aria-label="${Number(o.is_active) ? "Inhabilitar" : "Habilitar"}" data-option-action="toggle" data-option-id="${
                      o.id
                    }" data-next-active="${Number(o.is_active) ? 0 : 1}">${Number(o.is_active) ? "✕" : "✓"}</button>
                  </div>
                </div>
              `
            )
            .join("")
        : `<div class="item-row cfg-sub-empty">Sin opciones</div>`;
      return `
        <div class="item-row cfg-entity-row">
          <div class="cfg-entity-main">
            <strong>${escapeHtml(g.name)}</strong>
            <div class="cfg-entity-meta">
              <span>Tipo: ${escapeHtml(String(g.group_type || "other"))}</span>
              <span>Min: ${Number(g.min_select || 0)}</span>
              <span>Max: ${Number(g.max_select || 0)}</span>
              <span>Orden: ${Number(g.sort_order || 0)}</span>
              <span class="cfg-chip ${Number(g.is_active) ? "cfg-chip-on" : "cfg-chip-off"}">${
                Number(g.is_active) ? "Activo" : "Inactivo"
              }</span>
            </div>
            <div class="cfg-entity-meta"><span>Asignado: ${escapeHtml(used || "No asignado")}</span></div>
          </div>
          <div class="cfg-entity-actions">
            <button type="button" class="cfg-icon-btn cfg-icon-edit" title="Editar" aria-label="Editar" data-group-action="edit" data-group-id="${g.id}">✎</button>
            <button type="button" class="cfg-icon-btn ${Number(g.is_active) ? "cfg-icon-disable" : "cfg-icon-enable"}" title="${
              Number(g.is_active) ? "Inhabilitar" : "Habilitar"
            }" aria-label="${Number(g.is_active) ? "Inhabilitar" : "Habilitar"}" data-group-action="toggle" data-group-id="${
              g.id
            }" data-next-active="${Number(g.is_active) ? 0 : 1}">${Number(g.is_active) ? "✕" : "✓"}</button>
          </div>
        </div>
        <div class="cfg-sublist">${optionRows}</div>
      `;
    })
    .join("");

  const discountPresetsList = document.getElementById("cfgDiscountPresetsList");
  discountPresetsList.innerHTML = (cfg.discountPresets || [])
    .map((d) => {
      const typeText = d.type === "percent" ? "Porcentaje" : "Monto";
      return `
        <div class="item-row cfg-entity-row">
          <div class="cfg-entity-main">
            <strong>${escapeHtml(d.name)}</strong>
            <div class="cfg-entity-meta">
              <span>Tipo: ${typeText}</span>
              <span>Valor: ${d.type === "percent" ? `${Number(d.value)}%` : money(Number(d.value || 0))}</span>
              <span>Orden: ${Number(d.sort_order || 0)}</span>
              <span class="cfg-chip ${Number(d.is_active) ? "cfg-chip-on" : "cfg-chip-off"}">${
                Number(d.is_active) ? "Activo" : "Inactivo"
              }</span>
            </div>
          </div>
          <div class="cfg-entity-actions">
            <button type="button" class="cfg-icon-btn cfg-icon-edit" title="Editar" aria-label="Editar" data-discount-action="edit" data-discount-id="${d.id}">✎</button>
            <button type="button" class="cfg-icon-btn ${Number(d.is_active) ? "cfg-icon-disable" : "cfg-icon-enable"}" title="${
              Number(d.is_active) ? "Inhabilitar" : "Habilitar"
            }" aria-label="${Number(d.is_active) ? "Inhabilitar" : "Habilitar"}" data-discount-action="toggle" data-discount-id="${
              d.id
            }" data-next-active="${Number(d.is_active) ? 0 : 1}">${Number(d.is_active) ? "✕" : "✓"}</button>
          </div>
        </div>
      `;
    })
    .join("");

  const terminalBindingsList = document.getElementById("cfgTerminalBindingsList");
  terminalBindingsList.innerHTML = (cfg.terminalBindings || [])
    .map((b) => {
      const center = (cfg.operationCenters || []).find((c) => Number(c.id) === Number(b.center_id));
      return `<div class="item-row">${escapeHtml(b.ip_address)} | ${escapeHtml(center?.name || "-")} | ${escapeHtml(
        b.label || ""
      )}</div>`;
    })
    .join("");

  const centerProductsList = document.getElementById("cfgCenterProductsList");
  centerProductsList.innerHTML = (cfg.centerProducts || [])
    .map((cp) => {
      const center = (cfg.operationCenters || []).find((c) => Number(c.id) === Number(cp.center_id));
      const product = (cfg.products || []).find((p) => Number(p.id) === Number(cp.product_id));
      return `<div class="item-row">${escapeHtml(center?.name || "-")} | ${escapeHtml(product?.name || "-")} | ${
        Number(cp.is_enabled) ? "Habilitado" : "Deshabilitado"
      }</div>`;
    })
    .join("");

  centersList.querySelectorAll("[data-center-action][data-center-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-center-action");
      const centerId = Number(btn.getAttribute("data-center-id"));
      if (action === "edit") {
        editOperationCenter(centerId).catch((e) => toast(e.message, "error"));
        return;
      }
      const nextActive = Number(btn.getAttribute("data-next-active") || "0");
      toggleOperationCenterActive(centerId, nextActive).catch((e) => toast(e.message, "error"));
    });
  });

  tablesList.querySelectorAll("[data-table-action][data-table-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-table-action");
      const tableId = Number(btn.getAttribute("data-table-id"));
      if (action === "edit") {
        editTableConfig(tableId).catch((e) => toast(e.message, "error"));
        return;
      }
      const nextActive = Number(btn.getAttribute("data-next-active") || "0");
      toggleTableActive(tableId, nextActive).catch((e) => toast(e.message, "error"));
    });
  });

  paymentsList.querySelectorAll("[data-payment-action][data-payment-code]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-payment-action");
      const code = String(btn.getAttribute("data-payment-code") || "").trim();
      if (!code) return;
      if (action === "edit") {
        editPaymentMethod(code).catch((e) => toast(e.message, "error"));
        return;
      }
      const nextActive = Number(btn.getAttribute("data-next-active") || "0");
      togglePaymentMethodActive(code, nextActive).catch((e) => toast(e.message, "error"));
    });
  });

  categoriesList.querySelectorAll("[data-category-action][data-category-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-category-action");
      const categoryId = Number(btn.getAttribute("data-category-id"));
      if (action === "edit") {
        editCategory(categoryId).catch((e) => toast(e.message, "error"));
        return;
      }
      const nextActive = Number(btn.getAttribute("data-next-active") || "0");
      toggleCategoryActive(categoryId, nextActive).catch((e) => toast(e.message, "error"));
    });
  });

  areasList.querySelectorAll("[data-area-action][data-area-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-area-action");
      const areaId = Number(btn.getAttribute("data-area-id"));
      if (action === "edit") {
        editArea(areaId).catch((e) => toast(e.message, "error"));
        return;
      }
      const nextActive = Number(btn.getAttribute("data-next-active") || "0");
      toggleAreaActive(areaId, nextActive).catch((e) => toast(e.message, "error"));
    });
  });

  groupsList.querySelectorAll("[data-group-action][data-group-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-group-action");
      const groupId = Number(btn.getAttribute("data-group-id"));
      if (action === "edit") {
        editModifierGroup(groupId).catch((e) => toast(e.message, "error"));
        return;
      }
      const nextActive = Number(btn.getAttribute("data-next-active") || "0");
      toggleModifierGroupActive(groupId, nextActive).catch((e) => toast(e.message, "error"));
    });
  });

  groupsList.querySelectorAll("[data-option-action][data-option-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-option-action");
      const optionId = Number(btn.getAttribute("data-option-id"));
      if (action === "edit") {
        editModifierOption(optionId).catch((e) => toast(e.message, "error"));
        return;
      }
      const nextActive = Number(btn.getAttribute("data-next-active") || "0");
      toggleModifierOptionActive(optionId, nextActive).catch((e) => toast(e.message, "error"));
    });
  });

  discountPresetsList.querySelectorAll("[data-discount-action][data-discount-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-discount-action");
      const presetId = Number(btn.getAttribute("data-discount-id"));
      if (action === "edit") {
        editDiscountPreset(presetId).catch((e) => toast(e.message, "error"));
        return;
      }
      const nextActive = Number(btn.getAttribute("data-next-active") || "0");
      toggleDiscountPresetActive(presetId, nextActive).catch((e) => toast(e.message, "error"));
    });
  });
}

async function editOperationCenter(centerId) {
  const center = (state.settings?.operationCenters || []).find((c) => Number(c.id) === Number(centerId));
  if (!center) return;
  const name = await askInput({
    title: "Editar Centro",
    message: "Nuevo nombre del centro",
    defaultValue: String(center.name || ""),
    placeholder: "Nombre del centro",
    okText: "Guardar",
  });
  if (name === null) return;
  if (!String(name).trim()) {
    toast("El nombre del centro es requerido", "error");
    return;
  }
  await api(`/api/settings/operation-centers/${centerId}`, {
    method: "POST",
    body: JSON.stringify({ name: String(name).trim(), isActive: Number(center.is_active) ? 1 : 0 }),
  });
  await loadSettings();
  await loadBootstrap();
  await loadTables();
  toast("Centro actualizado", "success");
}

async function toggleOperationCenterActive(centerId, nextActive) {
  const center = (state.settings?.operationCenters || []).find((c) => Number(c.id) === Number(centerId));
  if (!center) return;
  if (!nextActive) {
    const confirmed = await askConfirm({
      title: "Inhabilitar Centro",
      message: `Deseas inhabilitar "${center.name}"?`,
      okText: "Inhabilitar",
    });
    if (!confirmed) return;
  }
  await api(`/api/settings/operation-centers/${centerId}`, {
    method: "POST",
    body: JSON.stringify({ name: center.name, isActive: nextActive ? 1 : 0 }),
  });
  await loadSettings();
  await loadBootstrap();
  await loadTables();
  toast(nextActive ? "Centro habilitado" : "Centro inhabilitado", "success");
}

async function editTableConfig(tableId) {
  const table = (state.settings?.tables || []).find((t) => Number(t.id) === Number(tableId));
  if (!table) return;
  const code = await askInput({
    title: "Editar Mesa",
    message: "Codigo de mesa",
    defaultValue: String(table.code || ""),
    placeholder: "Ej: M12",
    okText: "Siguiente",
  });
  if (code === null) return;
  const seatsInput = await askInput({
    title: "Editar Mesa",
    message: "Cantidad de sillas",
    defaultValue: String(table.seats || 4),
    placeholder: "Ej: 4",
    okText: "Guardar",
  });
  if (seatsInput === null) return;
  const seats = Number(seatsInput || "0");
  if (!String(code).trim() || !seats || Number.isNaN(seats)) {
    toast("Codigo y sillas validas son requeridos", "error");
    return;
  }
  await api(`/api/settings/tables/${tableId}`, {
    method: "POST",
    body: JSON.stringify({
      areaId: Number(table.area_id),
      centerId: Number(table.operation_center_id),
      code: String(code).trim(),
      seats,
      isActive: Number(table.is_active) ? 1 : 0,
    }),
  });
  await loadSettings();
  await loadTables();
  toast("Mesa actualizada", "success");
}

async function toggleTableActive(tableId, nextActive) {
  const table = (state.settings?.tables || []).find((t) => Number(t.id) === Number(tableId));
  if (!table) return;
  if (!nextActive) {
    const confirmed = await askConfirm({
      title: "Inhabilitar Mesa",
      message: `Deseas inhabilitar la mesa ${table.code}?`,
      okText: "Inhabilitar",
    });
    if (!confirmed) return;
  }
  await api(`/api/settings/tables/${tableId}`, {
    method: "POST",
    body: JSON.stringify({
      areaId: Number(table.area_id),
      centerId: Number(table.operation_center_id),
      code: table.code,
      seats: Number(table.seats || 4),
      isActive: nextActive ? 1 : 0,
    }),
  });
  await loadSettings();
  await loadTables();
  toast(nextActive ? "Mesa habilitada" : "Mesa inhabilitada", "success");
}

async function editPaymentMethod(code) {
  const payment = (state.settings?.paymentMethods || []).find((p) => String(p.code) === String(code));
  if (!payment) return;
  const label = await askInput({
    title: "Editar Forma de Pago",
    message: "Nombre visible",
    defaultValue: String(payment.label || ""),
    placeholder: "Ej: Efectivo",
    okText: "Siguiente",
  });
  if (label === null) return;
  const sortInput = await askInput({
    title: "Editar Forma de Pago",
    message: "Orden de visualizacion",
    defaultValue: String(payment.sort_order || 0),
    placeholder: "Ej: 1",
    okText: "Guardar",
  });
  if (sortInput === null) return;
  const sortOrder = Number(sortInput || "0");
  if (!String(label).trim()) {
    toast("Nombre de forma de pago requerido", "error");
    return;
  }
  await api("/api/settings/payment-methods", {
    method: "POST",
    body: JSON.stringify({
      code: payment.code,
      label: String(label).trim(),
      isActive: Number(payment.is_active) ? 1 : 0,
      sortOrder: Number.isNaN(sortOrder) ? Number(payment.sort_order || 0) : sortOrder,
    }),
  });
  await loadSettings();
  await loadBootstrap();
  toast("Forma de pago actualizada", "success");
}

async function togglePaymentMethodActive(code, nextActive) {
  const payment = (state.settings?.paymentMethods || []).find((p) => String(p.code) === String(code));
  if (!payment) return;
  await api("/api/settings/payment-methods", {
    method: "POST",
    body: JSON.stringify({
      code: payment.code,
      label: payment.label,
      isActive: nextActive ? 1 : 0,
      sortOrder: Number(payment.sort_order || 0),
    }),
  });
  await loadSettings();
  await loadBootstrap();
  toast(nextActive ? "Forma de pago habilitada" : "Forma de pago inhabilitada", "success");
}

async function editCategory(categoryId) {
  const category = (state.settings?.categories || []).find((c) => Number(c.id) === Number(categoryId));
  if (!category) return;
  const name = await askInput({
    title: "Editar Categoria",
    message: "Nombre de la categoria",
    defaultValue: String(category.name || ""),
    placeholder: "Ej: Platos Fuertes",
    okText: "Siguiente",
  });
  if (name === null) return;
  const sortInput = await askInput({
    title: "Editar Categoria",
    message: "Orden de visualizacion",
    defaultValue: String(category.sort_order || 0),
    placeholder: "Ej: 1",
    okText: "Guardar",
  });
  if (sortInput === null) return;
  const sortOrder = Number(sortInput || "0");
  if (!String(name).trim()) {
    toast("Nombre de categoria requerido", "error");
    return;
  }
  await api(`/api/settings/categories/${categoryId}`, {
    method: "POST",
    body: JSON.stringify({
      name: String(name).trim(),
      isActive: Number(category.is_active) ? 1 : 0,
      sortOrder: Number.isNaN(sortOrder) ? Number(category.sort_order || 0) : sortOrder,
    }),
  });
  await loadSettings();
  await loadBootstrap();
  toast("Categoria actualizada", "success");
}

async function toggleCategoryActive(categoryId, nextActive) {
  const category = (state.settings?.categories || []).find((c) => Number(c.id) === Number(categoryId));
  if (!category) return;
  if (!nextActive) {
    const confirmed = await askConfirm({
      title: "Inhabilitar Categoria",
      message: `Deseas inhabilitar "${category.name}"?`,
      okText: "Inhabilitar",
    });
    if (!confirmed) return;
  }
  await api(`/api/settings/categories/${categoryId}`, {
    method: "POST",
    body: JSON.stringify({
      name: category.name,
      isActive: nextActive ? 1 : 0,
      sortOrder: Number(category.sort_order || 0),
    }),
  });
  await loadSettings();
  await loadBootstrap();
  toast(nextActive ? "Categoria habilitada" : "Categoria inhabilitada", "success");
}

async function editArea(areaId) {
  const area = (state.settings?.areas || []).find((a) => Number(a.id) === Number(areaId));
  if (!area) return;
  const name = await askInput({
    title: "Editar Area",
    message: "Nombre del area",
    defaultValue: String(area.name || ""),
    placeholder: "Ej: Salon Principal",
    okText: "Siguiente",
  });
  if (name === null) return;
  const sortInput = await askInput({
    title: "Editar Area",
    message: "Orden de visualizacion",
    defaultValue: String(area.sort_order || 0),
    placeholder: "Ej: 1",
    okText: "Guardar",
  });
  if (sortInput === null) return;
  const sortOrder = Number(sortInput || "0");
  if (!String(name).trim()) {
    toast("Nombre de area requerido", "error");
    return;
  }
  await api(`/api/settings/areas/${areaId}`, {
    method: "POST",
    body: JSON.stringify({
      name: String(name).trim(),
      isActive: Number(area.is_active) ? 1 : 0,
      sortOrder: Number.isNaN(sortOrder) ? Number(area.sort_order || 0) : sortOrder,
    }),
  });
  await loadSettings();
  toast("Area actualizada", "success");
}

async function toggleAreaActive(areaId, nextActive) {
  const area = (state.settings?.areas || []).find((a) => Number(a.id) === Number(areaId));
  if (!area) return;
  if (!nextActive) {
    const confirmed = await askConfirm({
      title: "Inhabilitar Area",
      message: `Deseas inhabilitar "${area.name}"?`,
      okText: "Inhabilitar",
    });
    if (!confirmed) return;
  }
  await api(`/api/settings/areas/${areaId}`, {
    method: "POST",
    body: JSON.stringify({
      name: area.name,
      isActive: nextActive ? 1 : 0,
      sortOrder: Number(area.sort_order || 0),
    }),
  });
  await loadSettings();
  toast(nextActive ? "Area habilitada" : "Area inhabilitada", "success");
}

async function editModifierGroup(groupId) {
  const group = (state.settings?.groups || []).find((g) => Number(g.id) === Number(groupId));
  if (!group) return;
  const name = await askInput({
    title: "Editar Paso",
    message: "Nombre del paso",
    defaultValue: String(group.name || ""),
    placeholder: "Ej: Guarniciones",
    okText: "Siguiente",
  });
  if (name === null) return;
  const minInput = await askInput({
    title: "Editar Paso",
    message: "Minimo de seleccion",
    defaultValue: String(group.min_select || 0),
    placeholder: "Ej: 0",
    okText: "Siguiente",
  });
  if (minInput === null) return;
  const maxInput = await askInput({
    title: "Editar Paso",
    message: "Maximo de seleccion",
    defaultValue: String(group.max_select || 1),
    placeholder: "Ej: 2",
    okText: "Guardar",
  });
  if (maxInput === null) return;
  const minSelect = Number(minInput || "0");
  const maxSelect = Number(maxInput || "0");
  if (!String(name).trim()) {
    toast("Nombre del paso requerido", "error");
    return;
  }
  if (Number.isNaN(minSelect) || Number.isNaN(maxSelect) || maxSelect < minSelect) {
    toast("Minimo/Maximo invalidos", "error");
    return;
  }
  await api(`/api/settings/modifier-groups/${groupId}`, {
    method: "POST",
    body: JSON.stringify({
      name: String(name).trim(),
      minSelect,
      maxSelect,
      sortOrder: Number(group.sort_order || 0),
      groupType: String(group.group_type || "other"),
      isActive: Number(group.is_active) ? 1 : 0,
    }),
  });
  await loadSettings();
  toast("Paso actualizado", "success");
}

async function toggleModifierGroupActive(groupId, nextActive) {
  const group = (state.settings?.groups || []).find((g) => Number(g.id) === Number(groupId));
  if (!group) return;
  if (!nextActive) {
    const confirmed = await askConfirm({
      title: "Inhabilitar Paso",
      message: `Deseas inhabilitar "${group.name}"?`,
      okText: "Inhabilitar",
    });
    if (!confirmed) return;
  }
  await api(`/api/settings/modifier-groups/${groupId}`, {
    method: "POST",
    body: JSON.stringify({
      name: group.name,
      minSelect: Number(group.min_select || 0),
      maxSelect: Number(group.max_select || 1),
      sortOrder: Number(group.sort_order || 0),
      groupType: String(group.group_type || "other"),
      isActive: nextActive ? 1 : 0,
    }),
  });
  await loadSettings();
  toast(nextActive ? "Paso habilitado" : "Paso inhabilitado", "success");
}

async function editModifierOption(optionId) {
  const option = (state.settings?.options || []).find((o) => Number(o.id) === Number(optionId));
  if (!option) return;
  const name = await askInput({
    title: "Editar Opcion",
    message: "Nombre de la opcion",
    defaultValue: String(option.name || ""),
    placeholder: "Ej: Papas Fritas",
    okText: "Siguiente",
  });
  if (name === null) return;
  const priceInput = await askInput({
    title: "Editar Opcion",
    message: "Precio extra",
    defaultValue: String(option.price_delta || 0),
    placeholder: "Ej: 5",
    okText: "Guardar",
  });
  if (priceInput === null) return;
  const priceDelta = Number(priceInput || "0");
  if (!String(name).trim() || Number.isNaN(priceDelta)) {
    toast("Nombre y precio validos son requeridos", "error");
    return;
  }
  await api(`/api/settings/modifier-options/${optionId}`, {
    method: "POST",
    body: JSON.stringify({
      name: String(name).trim(),
      priceDelta,
      sortOrder: Number(option.sort_order || 0),
      isActive: Number(option.is_active) ? 1 : 0,
    }),
  });
  await loadSettings();
  toast("Opcion actualizada", "success");
}

async function toggleModifierOptionActive(optionId, nextActive) {
  const option = (state.settings?.options || []).find((o) => Number(o.id) === Number(optionId));
  if (!option) return;
  if (!nextActive) {
    const confirmed = await askConfirm({
      title: "Inhabilitar Opcion",
      message: `Deseas inhabilitar "${option.name}"?`,
      okText: "Inhabilitar",
    });
    if (!confirmed) return;
  }
  await api(`/api/settings/modifier-options/${optionId}`, {
    method: "POST",
    body: JSON.stringify({
      name: option.name,
      priceDelta: Number(option.price_delta || 0),
      sortOrder: Number(option.sort_order || 0),
      isActive: nextActive ? 1 : 0,
    }),
  });
  await loadSettings();
  toast(nextActive ? "Opcion habilitada" : "Opcion inhabilitada", "success");
}

async function editDiscountPreset(presetId) {
  const preset = (state.settings?.discountPresets || []).find((d) => Number(d.id) === Number(presetId));
  if (!preset) return;
  const name = await askInput({
    title: "Editar Descuento",
    message: "Nombre del descuento",
    defaultValue: String(preset.name || ""),
    placeholder: "Ej: Promo Almuerzo",
    okText: "Siguiente",
  });
  if (name === null) return;
  const valueInput = await askInput({
    title: "Editar Descuento",
    message: `Valor (${preset.type === "percent" ? "porcentaje" : "monto fijo"})`,
    defaultValue: String(preset.value || 0),
    placeholder: "Ej: 10",
    okText: "Guardar",
  });
  if (valueInput === null) return;
  const value = Number(valueInput || "0");
  if (!String(name).trim() || Number.isNaN(value)) {
    toast("Nombre y valor validos son requeridos", "error");
    return;
  }
  await api(`/api/settings/discount-presets/${presetId}`, {
    method: "POST",
    body: JSON.stringify({
      name: String(name).trim(),
      type: preset.type,
      value,
      isActive: Number(preset.is_active) ? 1 : 0,
      sortOrder: Number(preset.sort_order || 0),
    }),
  });
  await loadSettings();
  toast("Tipo de descuento actualizado", "success");
}

async function toggleDiscountPresetActive(presetId, nextActive) {
  const preset = (state.settings?.discountPresets || []).find((d) => Number(d.id) === Number(presetId));
  if (!preset) return;
  await api(`/api/settings/discount-presets/${presetId}`, {
    method: "POST",
    body: JSON.stringify({
      name: preset.name,
      type: preset.type,
      value: Number(preset.value || 0),
      isActive: nextActive ? 1 : 0,
      sortOrder: Number(preset.sort_order || 0),
    }),
  });
  await loadSettings();
  toast(nextActive ? "Descuento habilitado" : "Descuento inhabilitado", "success");
}

function resetProductForm() {
  state.editingProductId = null;
  const nameInput = document.getElementById("cfgProductNameInput");
  const priceInput = document.getElementById("cfgProductPriceInput");
  const allowDiscountInput = document.getElementById("cfgProductAllowDiscountInput");
  const activeInput = document.getElementById("cfgProductActiveInput");
  const hint = document.getElementById("cfgProductEditHint");
  if (nameInput) nameInput.value = "";
  if (priceInput) priceInput.value = "";
  if (allowDiscountInput) allowDiscountInput.checked = true;
  if (activeInput) activeInput.checked = true;
  if (hint) hint.textContent = "Creando nuevo platillo";
}

function loadProductIntoForm(productId) {
  const p = (state.settings?.products || []).find((x) => Number(x.id) === Number(productId));
  if (!p) return;
  state.editingProductId = Number(p.id);
  const category = document.getElementById("cfgProductCategorySelect");
  const name = document.getElementById("cfgProductNameInput");
  const price = document.getElementById("cfgProductPriceInput");
  const allowDiscount = document.getElementById("cfgProductAllowDiscountInput");
  const active = document.getElementById("cfgProductActiveInput");
  const hint = document.getElementById("cfgProductEditHint");
  if (category) category.value = String(p.category_id);
  if (name) name.value = p.name || "";
  if (price) price.value = Number(p.base_price || 0);
  if (allowDiscount) allowDiscount.checked = Number(p.allow_discount) === 1;
  if (active) active.checked = Number(p.is_active) === 1;
  if (hint) hint.textContent = `Editando: ${p.name}`;
}

function renderProductsManager() {
  const queryText = String(document.getElementById("cfgProductSearchInput")?.value || "").trim().toLowerCase();
  const products = (state.settings?.products || []).filter((p) => {
    if (!queryText) return true;
    return String(p.name || "").toLowerCase().includes(queryText) || String(p.category_name || "").toLowerCase().includes(queryText);
  });
  const list = document.getElementById("cfgProductsList");
  list.innerHTML = products
    .map(
      (p) => `
      <div class="item-row cfg-product-row ${Number(p.is_active) ? "" : "cfg-product-inactive"}">
        <div>
          <strong>${escapeHtml(p.name)}</strong>
          <div>${escapeHtml(p.category_name || "")} | ${money(p.base_price)} | <span class="cfg-status-${
            Number(p.is_active) ? "active" : "inactive"
          }">${Number(p.is_active) ? "Activo" : "Inactivo"}</span></div>
        </div>
        <div class="cfg-product-actions">
          <button type="button" data-cfg-product-action="edit" data-product-id="${p.id}">Editar</button>
          <button type="button" data-cfg-product-action="toggle" data-product-id="${p.id}" data-next-active="${
            Number(p.is_active) ? 0 : 1
          }">${Number(p.is_active) ? "Inhabilitar" : "Habilitar"}</button>
        </div>
      </div>
    `
    )
    .join("");

  list.querySelectorAll("[data-cfg-product-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-cfg-product-action");
      const productId = Number(btn.getAttribute("data-product-id"));
      if (action === "edit") {
        loadProductIntoForm(productId);
        return;
      }
      if (action === "toggle") {
        const nextActive = Number(btn.getAttribute("data-next-active") || "0");
        toggleProductActive(productId, nextActive).catch((e) => toast(e.message, "error"));
      }
    });
  });
}

function resetWizardData() {
  state.wizardData = {
    categoryId: null,
    productTypeId: "plato_fuerte",
    productName: "",
    basePrice: 0,
    allowDiscount: true,
    selectedModifierGroups: {},
    modifierTemplates: state.wizardData.modifierTemplates || {},
    optionPoolByGroup: state.wizardData.optionPoolByGroup || {},
    modifierOptions: {},
    groupRules: {},
  };
  const categorySelect = document.getElementById("wizardCategorySelect");
  const productTypeSelect = document.getElementById("wizardProductTypeSelect");
  const nameInput = document.getElementById("wizardProductNameInput");
  const priceInput = document.getElementById("wizardProductPriceInput");
  const discountInput = document.getElementById("wizardAllowDiscountInput");
  if (categorySelect) state.wizardData.categoryId = Number(categorySelect.value || "0") || null;
  if (productTypeSelect) {
    productTypeSelect.value = state.wizardData.productTypeId;
    state.wizardData.productTypeId = String(productTypeSelect.value || "plato_fuerte");
  }
  if (nameInput) nameInput.value = "";
  if (priceInput) priceInput.value = "";
  if (discountInput) discountInput.checked = true;
  showWizardStep(1);
}

function switchProductsManagerView(view) {
  const listBtn = document.getElementById("cfgProductsViewListBtn");
  const createBtn = document.getElementById("cfgProductsViewCreateBtn");
  const listView = document.getElementById("cfgProductsListView");
  const createView = document.getElementById("cfgProductsCreateView");
  const showCreate = view === "create";
  if (listView) listView.classList.toggle("hidden", showCreate);
  if (createView) createView.classList.toggle("hidden", !showCreate);
  if (listBtn) listBtn.classList.toggle("tab-active", !showCreate);
  if (createBtn) createBtn.classList.toggle("tab-active", showCreate);
}

function showWizardStep(stepNumber) {
  [1, 2, 3].forEach((step) => {
    const node = document.getElementById(`wizardStep${step}`);
    if (!node) return;
    node.classList.toggle("hidden", step !== stepNumber);
  });
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function resolveGroupType(group) {
  const valid = new Set(["garnish", "preparation", "sauce", "meat_term", "milk_type", "beverage_temp", "ice", "other"]);
  const rawType = String(group?.group_type || "other");
  if (valid.has(rawType) && rawType !== "other") return rawType;
  const name = normalizeText(group?.name || "");
  if (name.includes("guarn")) return "garnish";
  if (name.includes("prepar")) return "preparation";
  if (name.includes("salsa")) return "sauce";
  if (name.includes("termino") || name.includes("coccion")) return "meat_term";
  if (name.includes("leche")) return "milk_type";
  if (name.includes("temperatura")) return "beverage_temp";
  if (name.includes("hielo")) return "ice";
  return "other";
}

function getSettingsOptionsByGroupType() {
  const map = {};
  const groups = state.settings?.groups || [];
  const options = state.settings?.options || [];
  const groupById = groups.reduce((acc, group) => {
    acc[Number(group.id)] = group;
    return acc;
  }, {});
  for (const option of options) {
    const group = groupById[Number(option.group_id)];
    if (!group) continue;
    const type = resolveGroupType(group);
    map[type] = map[type] || [];
    const exists = map[type].some((x) => String(x.name).toLowerCase() === String(option.name).toLowerCase());
    if (!exists) {
      map[type].push({ name: option.name, priceDelta: Number(option.price_delta || 0) });
    }
  }
  return map;
}

async function ensureWizardTemplatesLoaded() {
  if (Object.keys(state.wizardData.modifierTemplates || {}).length) return;
  const templates = await api("/api/modifier-templates");
  const existingByType = getSettingsOptionsByGroupType();
  state.wizardData.modifierTemplates = templates || {};
  state.wizardData.optionPoolByGroup = {};
  state.wizardData.selectedModifierGroups = {};
  state.wizardData.modifierOptions = {};
  state.wizardData.groupRules = {};
  Object.entries(state.wizardData.modifierTemplates).forEach(([groupType, template]) => {
    state.wizardData.selectedModifierGroups[groupType] = false;
    const options = (existingByType[groupType] || []).map((x) => ({
      name: x.name,
      priceDelta: Number(x.priceDelta || 0),
    }));
    state.wizardData.optionPoolByGroup[groupType] = options;
    state.wizardData.modifierOptions[groupType] = [...options];
    state.wizardData.groupRules[groupType] = {
      minSelect: Math.max(0, Number(template.defaultMinSelect || 0)),
      maxSelect: Math.max(0, Number(template.defaultMaxSelect || 0)),
      isMandatory: Boolean(Number(template.defaultIsMandatory) || false),
    };
  });
}

function templateDefaultRule(template) {
  return {
    minSelect: Math.max(0, Number(template?.defaultMinSelect || 0)),
    maxSelect: Math.max(0, Number(template?.defaultMaxSelect || 0)),
    isMandatory: Boolean(Number(template?.defaultIsMandatory) || false),
  };
}

function initializeWizardProductTypeSelect() {
  const select = document.getElementById("wizardProductTypeSelect");
  if (!select) return;
  const current = state.wizardData.productTypeId || "plato_fuerte";
  select.innerHTML = Object.entries(WIZARD_PRODUCT_TYPES)
    .map(([typeId, cfg]) => `<option value="${typeId}">${escapeHtml(cfg.label)}</option>`)
    .join("");
  select.value = current;
  select.onchange = () => {
    state.wizardData.productTypeId = select.value;
  };
}

function applyProductTypeSelection() {
  const typeId = state.wizardData.productTypeId || "plato_fuerte";
  const typeConfig = WIZARD_PRODUCT_TYPES[typeId];
  const templates = state.wizardData.modifierTemplates || {};
  if (!typeConfig) return;
  Object.keys(templates).forEach((groupType) => {
    const config = typeConfig.groups[groupType] || null;
    state.wizardData.selectedModifierGroups[groupType] = Boolean(config);
    if (config) {
      state.wizardData.groupRules[groupType] = {
        minSelect: Math.max(0, Number(config.minSelect || 0)),
        maxSelect: Math.max(0, Number(config.maxSelect || 1)),
        isMandatory: Boolean(config.isMandatory),
      };
      const pool = state.wizardData.optionPoolByGroup[groupType] || [];
      state.wizardData.modifierOptions[groupType] = [...pool];
    } else {
      state.wizardData.groupRules[groupType] = templateDefaultRule(templates[groupType]);
      state.wizardData.modifierOptions[groupType] = [];
    }
  });
  renderWizardModifierGroups();
}

function renderWizardModifierGroups() {
  const wrap = document.getElementById("wizardModifierGroupsContainer");
  if (!wrap) return;
  const templates = state.wizardData.modifierTemplates || {};
  const selectedTypes = selectedWizardGroupTypes();
  const entries = selectedTypes.map((groupType) => [groupType, templates[groupType]]).filter(([, t]) => Boolean(t));
  if (!entries.length) {
    wrap.innerHTML = '<div class="item-row">Este tipo no tiene grupos configurados.</div>';
    return;
  }

  wrap.innerHTML = entries
    .map(([groupType, template]) => {
      const selected = true;
      const pool = state.wizardData.optionPoolByGroup[groupType] || [];
      const options = state.wizardData.modifierOptions[groupType] || [];
      const rule = state.wizardData.groupRules[groupType] || {
        minSelect: Math.max(0, Number(template.defaultMinSelect || 0)),
        maxSelect: Math.max(0, Number(template.defaultMaxSelect || 0)),
        isMandatory: Boolean(Number(template.defaultIsMandatory) || false),
      };
      const optionsHtml = pool
        .map(
          (option, index) => `
            <button type="button" class="wizard-option-pill ${options.some((x) => x.name === option.name) ? "wizard-option-pill-active" : ""}" data-wizard-option-toggle="${groupType}" data-option-index="${index}">
              ${escapeHtml(option.name)} ${Number(option.priceDelta) ? `(+${money(option.priceDelta)})` : ""}
            </button>
          `
        )
        .join("");

      return `
        <div class="modifier-group-card ${selected ? "selected" : ""}">
          <div class="modifier-group-title">${escapeHtml(template.label || groupType)}</div>
          <div class="modifier-group-desc">${escapeHtml(template.description || "")}</div>
          <div class="wizard-rule-row">
            <div class="wizard-rule-field">
              <label>Min</label>
              <input type="number" min="0" value="${Number(rule.minSelect || 0)}" data-wizard-rule-min="${groupType}" />
            </div>
            <div class="wizard-rule-field">
              <label>Max</label>
              <input type="number" min="0" value="${Number(rule.maxSelect || 0)}" data-wizard-rule-max="${groupType}" />
            </div>
            <label class="wizard-rule-checkbox">
              <input type="checkbox" data-wizard-rule-required="${groupType}" ${rule.isMandatory ? "checked" : ""} />
              <span>Obligatorio</span>
            </label>
          </div>
          <div class="modifier-options-list">${optionsHtml || '<div class="wizard-hint">No hay opciones en este grupo. Crealas en "Guarniciones y Pasos".</div>'}</div>
        </div>
      `;
    })
    .join("");

  wrap.querySelectorAll("[data-wizard-rule-min]").forEach((input) => {
    input.addEventListener("input", () => {
      const groupType = input.getAttribute("data-wizard-rule-min");
      const current = state.wizardData.groupRules[groupType] || { minSelect: 0, maxSelect: 1, isMandatory: false };
      current.minSelect = Math.max(0, Number(input.value || 0));
      state.wizardData.groupRules[groupType] = current;
    });
  });

  wrap.querySelectorAll("[data-wizard-rule-max]").forEach((input) => {
    input.addEventListener("input", () => {
      const groupType = input.getAttribute("data-wizard-rule-max");
      const current = state.wizardData.groupRules[groupType] || { minSelect: 0, maxSelect: 1, isMandatory: false };
      current.maxSelect = Math.max(0, Number(input.value || 0));
      state.wizardData.groupRules[groupType] = current;
    });
  });

  wrap.querySelectorAll("[data-wizard-rule-required]").forEach((input) => {
    input.addEventListener("change", () => {
      const groupType = input.getAttribute("data-wizard-rule-required");
      const current = state.wizardData.groupRules[groupType] || { minSelect: 0, maxSelect: 1, isMandatory: false };
      current.isMandatory = input.checked;
      state.wizardData.groupRules[groupType] = current;
    });
  });

  wrap.querySelectorAll("[data-wizard-option-toggle][data-option-index]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const groupType = btn.getAttribute("data-wizard-option-toggle");
      const optionIndex = Number(btn.getAttribute("data-option-index"));
      const pool = state.wizardData.optionPoolByGroup[groupType] || [];
      const option = pool[optionIndex];
      if (!option) return;
      const current = state.wizardData.modifierOptions[groupType] || [];
      const existsIndex = current.findIndex((x) => x.name === option.name);
      if (existsIndex >= 0) current.splice(existsIndex, 1);
      else current.push({ name: option.name, priceDelta: Number(option.priceDelta || 0) });
      state.wizardData.modifierOptions[groupType] = current;
      renderWizardModifierGroups();
    });
  });
}

function selectedWizardGroupTypes() {
  return Object.entries(state.wizardData.selectedModifierGroups || {})
    .filter(([, enabled]) => Boolean(enabled))
    .map(([groupType]) => groupType);
}

function buildWizardSummary() {
  const category = (state.settings?.categories || []).find((c) => Number(c.id) === Number(state.wizardData.categoryId || 0));
  const typeCfg = WIZARD_PRODUCT_TYPES[state.wizardData.productTypeId || ""] || null;
  const selectedTypes = selectedWizardGroupTypes();
  const groupsHtml = selectedTypes
    .map((groupType) => {
      const template = state.wizardData.modifierTemplates[groupType] || {};
      const options = state.wizardData.modifierOptions[groupType] || [];
      const rule = state.wizardData.groupRules[groupType] || { minSelect: 0, maxSelect: 1, isMandatory: false };
      return `
        <div class="wizard-summary-item">
          <strong>${escapeHtml(template.label || groupType)}</strong> |
          Min: ${Number(rule.minSelect || 0)} |
          Max: ${Number(rule.maxSelect || 0)} |
          ${rule.isMandatory ? "Obligatorio" : "Opcional"}
          <div>${options.map((x) => `${escapeHtml(x.name)}${Number(x.priceDelta) ? ` (+${money(x.priceDelta)})` : ""}`).join(", ") || "Sin opciones"}</div>
        </div>
      `;
    })
    .join("");
  const summary = document.getElementById("wizardSummary");
  if (!summary) return;
  summary.innerHTML = `
    <h5>Platillo</h5>
    <div class="wizard-summary-item">Categoria: ${escapeHtml(category?.name || "-")}</div>
    <div class="wizard-summary-item">Tipo: ${escapeHtml(typeCfg?.label || "-")}</div>
    <div class="wizard-summary-item">Nombre: ${escapeHtml(state.wizardData.productName || "-")}</div>
    <div class="wizard-summary-item">Precio base: ${money(state.wizardData.basePrice || 0)}</div>
    <div class="wizard-summary-item">Permite descuento: ${state.wizardData.allowDiscount ? "Si" : "No"}</div>
    <h5>Atributos seleccionados</h5>
    ${groupsHtml || '<div class="wizard-summary-item">No hay atributos seleccionados</div>'}
  `;
}

async function goWizardFromStep1ToStep2() {
  const categoryId = Number(document.getElementById("wizardCategorySelect")?.value || "0");
  const productTypeId = String(document.getElementById("wizardProductTypeSelect")?.value || "plato_fuerte");
  const productName = String(document.getElementById("wizardProductNameInput")?.value || "").trim();
  const basePrice = Number(document.getElementById("wizardProductPriceInput")?.value || "0");
  const allowDiscount = Boolean(document.getElementById("wizardAllowDiscountInput")?.checked);
  if (!categoryId || !productName) {
    toast("Categoria y nombre de platillo son requeridos", "error");
    return;
  }

  state.wizardData.categoryId = categoryId;
  state.wizardData.productTypeId = productTypeId;
  state.wizardData.productName = productName;
  state.wizardData.basePrice = Number.isNaN(basePrice) ? 0 : basePrice;
  state.wizardData.allowDiscount = allowDiscount;
  await ensureWizardTemplatesLoaded();
  applyProductTypeSelection();
  showWizardStep(2);
}

function goWizardFromStep2ToStep3() {
  const selectedTypes = selectedWizardGroupTypes();
  if (!selectedTypes.length) {
    toast("Selecciona al menos un grupo de atributos", "error");
    return;
  }

  for (const groupType of selectedTypes) {
    const template = state.wizardData.modifierTemplates[groupType] || {};
    const options = state.wizardData.modifierOptions[groupType] || [];
    const rule = state.wizardData.groupRules[groupType] || {};
    const minSelect = Math.max(0, Number(rule.minSelect || 0));
    const maxSelect = Math.max(0, Number(rule.maxSelect || 0));
    if (!maxSelect || maxSelect < minSelect) {
      toast(`Regla invalida en ${template.label || groupType}: revisa Min/Max`, "error");
      return;
    }
    if (!options.length) {
      toast(`Debes agregar opciones en ${template.label || groupType}`, "error");
      return;
    }
    if (options.length < minSelect) {
      toast(`En ${template.label || groupType} debes tener al menos ${minSelect} opcion(es)`, "error");
      return;
    }
  }

  buildWizardSummary();
  showWizardStep(3);
}

async function createProductFromWizard() {
  const selectedTypes = selectedWizardGroupTypes();
  if (!state.wizardData.categoryId || !state.wizardData.productName) {
    toast("Completa la informacion basica del platillo", "error");
    return;
  }
  if (!selectedTypes.length) {
    toast("Selecciona al menos un atributo para el platillo", "error");
    return;
  }

  const modifierGroups = selectedTypes.map((groupType) => {
    const options = (state.wizardData.modifierOptions[groupType] || []).map((x) => ({
      name: String(x.name || "").trim(),
      priceDelta: Number(x.priceDelta || 0),
    }));
    const rule = state.wizardData.groupRules[groupType] || {};
    return {
      groupType,
      minSelect: Math.max(0, Number(rule.minSelect || 0)),
      maxSelect: Math.max(0, Number(rule.maxSelect || 0)),
      isMandatory: Boolean(rule.isMandatory),
      options,
    };
  });

  await api("/api/settings/products-complete", {
    method: "POST",
    body: JSON.stringify({
      categoryId: state.wizardData.categoryId,
      name: state.wizardData.productName,
      basePrice: state.wizardData.basePrice,
      allowDiscount: state.wizardData.allowDiscount ? 1 : 0,
      modifierGroups,
    }),
  });

  await loadSettings();
  switchProductsManagerView("list");
  resetWizardData();
  toast("Platillo creado con atributos", "success");
}

async function loadSettings() {
  state.settings = await api("/api/settings");
  state.wizardData.modifierTemplates = {};
  state.wizardData.optionPoolByGroup = {};
  renderSettings();
}

async function openSettings() {
  await loadSettings();
  resetProductForm();
  switchSettingsSection("ops");
  showSettingsView();
}

function switchSettingsSection(section) {
  const sections = {
    products: "cfgProductsSection",
    modifiers: "cfgModifiersSection",
    discounts: "cfgDiscountsSection",
    ops: "cfgOpsSection",
  };
  Object.values(sections).forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add("hidden");
  });
  const target = document.getElementById(sections[section] || sections.ops);
  if (target) target.classList.remove("hidden");
}

async function saveCategoryConfig() {
  const name = String(document.getElementById("cfgCategoryNameInput").value || "").trim();
  const isActive = document.getElementById("cfgCategoryActiveInput").checked ? 1 : 0;
  const sortOrder = Number(document.getElementById("cfgCategorySortInput").value || "0");
  if (!name) {
    toast("Nombre de categoria requerido", "error");
    return;
  }
  await api("/api/settings/categories", {
    method: "POST",
    body: JSON.stringify({ name, isActive, sortOrder }),
  });
  document.getElementById("cfgCategoryNameInput").value = "";
  await loadSettings();
  await loadBootstrap();
  toast("Categoria creada", "success");
}

async function saveAreaConfig() {
  const name = String(document.getElementById("cfgAreaNameInput").value || "").trim();
  const isActive = document.getElementById("cfgAreaActiveInput").checked ? 1 : 0;
  const sortOrder = Number(document.getElementById("cfgAreaSortInput").value || "0");
  if (!name) {
    toast("Nombre de area requerido", "error");
    return;
  }
  await api("/api/settings/areas", {
    method: "POST",
    body: JSON.stringify({ name, isActive, sortOrder }),
  });
  document.getElementById("cfgAreaNameInput").value = "";
  await loadSettings();
  toast("Area creada", "success");
}

async function saveTableConfig() {
  const areaId = Number(document.getElementById("cfgAreaSelect").value || "0");
  const centerId = Number(document.getElementById("cfgTableCenterSelect").value || "0");
  const code = String(document.getElementById("cfgTableCodeInput").value || "").trim();
  const seats = Number(document.getElementById("cfgTableSeatsInput").value || "4");
  if (!areaId || !centerId || !code) {
    toast("Area, centro y codigo son requeridos", "error");
    return;
  }
  await api("/api/settings/tables", {
    method: "POST",
    body: JSON.stringify({ areaId, centerId, code, seats }),
  });
  document.getElementById("cfgTableCodeInput").value = "";
  await loadSettings();
  await loadTables();
  toast("Mesa creada", "success");
}

async function saveOperationCenterConfig() {
  const name = String(document.getElementById("cfgCenterNameInput").value || "").trim();
  const areaId = Number(document.getElementById("cfgCenterAreaSelect").value || "0");
  const tableCount = Number(document.getElementById("cfgCenterTableCountInput").value || "0");
  const tablePrefix = String(document.getElementById("cfgCenterTablePrefixInput").value || "M").trim() || "M";
  if (!name || !areaId) {
    toast("Nombre de centro y area son requeridos", "error");
    return;
  }
  await api("/api/settings/operation-centers", {
    method: "POST",
    body: JSON.stringify({ name, areaId, tableCount, tablePrefix }),
  });
  document.getElementById("cfgCenterNameInput").value = "";
  await loadSettings();
  await loadBootstrap();
  toast("Centro creado", "success");
}

async function bindThisPcToCenter() {
  const centerId = Number(document.getElementById("cfgTerminalCenterSelect").value || "0");
  const label = String(document.getElementById("cfgTerminalLabelInput").value || "").trim();
  if (!centerId) {
    toast("Selecciona un centro", "error");
    return;
  }
  await api("/api/settings/terminal-binding", {
    method: "POST",
    body: JSON.stringify({ centerId, label }),
  });
  await loadSettings();
  await loadBootstrap();
  toast("Esta PC fue asignada al centro", "success");
}

async function saveCenterProductConfig() {
  const centerId = Number(document.getElementById("cfgCenterProductCenterSelect").value || "0");
  const productId = Number(document.getElementById("cfgCenterProductSelect").value || "0");
  const isEnabled = document.getElementById("cfgCenterProductEnabledInput").checked ? 1 : 0;
  if (!centerId || !productId) {
    toast("Centro y producto son requeridos", "error");
    return;
  }
  await api(`/api/settings/operation-centers/${centerId}/products`, {
    method: "POST",
    body: JSON.stringify({ productId, isEnabled }),
  });
  await loadSettings();
  toast("Producto por centro guardado", "success");
}

async function savePaymentMethodConfig() {
  const rawCode = document.getElementById("cfgPaymentCodeInput").value;
  const code = normalizePaymentMethodCode(rawCode);
  const label = String(document.getElementById("cfgPaymentLabelInput").value || "").trim();
  const isActive = document.getElementById("cfgPaymentActiveInput").checked ? 1 : 0;
  const sortOrder = Number(document.getElementById("cfgPaymentSortInput").value || "0");
  if (!code) {
    toast("Codigo de forma de pago requerido", "error");
    return;
  }
  if (!label) {
    toast("Nombre de forma de pago requerido", "error");
    return;
  }
  await api("/api/settings/payment-methods", {
    method: "POST",
    body: JSON.stringify({ code, label, isActive, sortOrder }),
  });
  await loadSettings();
  await loadBootstrap();
  document.getElementById("cfgPaymentCodeInput").value = code;
  toast("Forma de pago guardada", "success");
}

async function saveTipConfig() {
  const tipPercent = Number(document.getElementById("cfgTipPercentInput").value || "0");
  if (Number.isNaN(tipPercent) || tipPercent < 0 || tipPercent > 100) {
    toast("La propina debe estar entre 0 y 100", "error");
    return;
  }
  await api("/api/settings/tip-config", {
    method: "POST",
    body: JSON.stringify({ tipPercent }),
  });
  await loadSettings();
  if (state.selectedAccountId) {
    await loadAccountDetail();
  }
  toast("Porcentaje de propina guardado", "success");
}

function openPrecheckPrint() {
  if (!state.selectedAccountId || !state.accountDetail) {
    toast("Selecciona una cuenta", "error");
    return;
  }
  const detail = state.accountDetail;
  const itemsHtml = (detail.items || [])
    .map((i) => {
      const mods = (i.modifiers || [])
        .map((m) => `&nbsp;&nbsp;+ ${escapeHtml(m.name)}${Number(m.priceDelta || 0) ? ` (${money(m.priceDelta)})` : ""}`)
        .join("<br/>");
      return `
        <div class="line-item">
          <div><strong>S${Number(i.seat_no || 1)}</strong> ${escapeHtml(i.product_name)} x${Number(i.qty || 0)}</div>
          ${mods ? `<div>${mods}</div>` : ""}
          ${i.notes ? `<div>Nota: ${escapeHtml(i.notes)}</div>` : ""}
          <div class="amount">${money(i.line_total)}</div>
        </div>
      `;
    })
    .join("");

  const totals = detail.totals || {};
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Pre Cuenta</title>
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          body { font-family: "Courier New", monospace; width: 72mm; margin: 0 auto; color: #111; font-size: 12px; }
          h1, h2, p { margin: 0; }
          .center { text-align: center; }
          .sp { margin-top: 6px; }
          .sep { border-top: 1px dashed #333; margin: 6px 0; }
          .line-item { margin-bottom: 6px; }
          .amount { text-align: right; font-weight: bold; }
          .row { display: flex; justify-content: space-between; gap: 8px; }
          .totals strong { font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="center">
          <h1>PRE CUENTA</h1>
          <p>POS Restaurante</p>
        </div>
        <div class="sp">Mesa: ${escapeHtml(state.selectedTableCode || "-")}</div>
        <div>Check: ${escapeHtml(detail.account?.check_number || "-")}</div>
        <div>Mesero: ${escapeHtml(detail.account?.waiter_name || "-")}</div>
        <div>Fecha: ${escapeHtml(new Date().toLocaleString())}</div>
        <div class="sep"></div>
        ${itemsHtml || "<div>Sin productos</div>"}
        <div class="sep"></div>
        <div class="totals">
          <div class="row"><span>Subtotal</span><span>${money(totals.subtotal || 0)}</span></div>
          <div class="row"><span>Descuento</span><span>${money(totals.discountTotal || 0)}</span></div>
          <div class="row"><span>Propina (${Number(totals.tipPercent || 0).toFixed(2)}%)</span><span>${money(totals.tipAmount || 0)}</span></div>
          <div class="row"><strong>Total</strong><strong>${money(totals.total || 0)}</strong></div>
          <div class="row"><span>Pagado</span><span>${money(totals.paid || 0)}</span></div>
          <div class="row"><span>Pendiente</span><span>${money(totals.pending || 0)}</span></div>
        </div>
        <div class="sep"></div>
        <div class="center">Gracias por su visita</div>
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=420,height=760");
  if (!printWindow) {
    toast("Habilita popups para imprimir la pre cuenta", "error");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

async function saveProductConfig() {
  const categoryId = Number(document.getElementById("cfgProductCategorySelect").value || "0");
  const name = String(document.getElementById("cfgProductNameInput").value || "").trim();
  const basePrice = Number(document.getElementById("cfgProductPriceInput").value || "0");
  const allowDiscount = document.getElementById("cfgProductAllowDiscountInput").checked ? 1 : 0;
  const isActive = document.getElementById("cfgProductActiveInput").checked ? 1 : 0;
  if (!categoryId || !name) {
    toast("Categoria y nombre de platillo son requeridos", "error");
    return;
  }
  if (state.editingProductId) {
    await api(`/api/settings/products/${state.editingProductId}`, {
      method: "POST",
      body: JSON.stringify({ categoryId, name, basePrice, allowDiscount, isActive }),
    });
  } else {
    await api("/api/settings/products", {
      method: "POST",
      body: JSON.stringify({ categoryId, name, basePrice, allowDiscount }),
    });
  }
  resetProductForm();
  await loadSettings();
  toast("Platillo guardado", "success");
}

async function toggleProductActive(productId, nextActive) {
  const p = (state.settings?.products || []).find((x) => Number(x.id) === Number(productId));
  if (!p) return;
  if (!nextActive) {
    const confirmed = await askConfirm({
      title: "Inhabilitar Platillo",
      message: `¿Deseas inhabilitar "${p.name}"? Dejara de aparecer para comandar.`,
      okText: "Si, inhabilitar",
    });
    if (!confirmed) return;
  }
  await api(`/api/settings/products/${productId}`, {
    method: "POST",
    body: JSON.stringify({
      categoryId: p.category_id,
      name: p.name,
      basePrice: p.base_price,
      allowDiscount: p.allow_discount,
      isActive: nextActive ? 1 : 0,
    }),
  });
  await loadSettings();
  toast(nextActive ? "Platillo habilitado" : "Platillo inhabilitado", "success");
}

async function saveModifierGroupConfig() {
  const groupType = String(document.getElementById("cfgGroupTemplateTypeSelect")?.value || "other");
  const name = String(document.getElementById("cfgGroupNameInput").value || "").trim();
  const minSelect = Number(document.getElementById("cfgGroupMinInput").value || "0");
  const maxSelect = Number(document.getElementById("cfgGroupMaxInput").value || "1");
  const sortOrder = Number(document.getElementById("cfgGroupSortInput").value || "0");
  if (!name) {
    toast("Nombre del paso requerido", "error");
    return;
  }
  await api("/api/settings/modifier-groups", {
    method: "POST",
    body: JSON.stringify({ name, minSelect, maxSelect, sortOrder, groupType }),
  });
  document.getElementById("cfgGroupNameInput").value = "";
  const quickInput = document.getElementById("cfgGroupQuickOptionsInput");
  if (quickInput) quickInput.value = "";
  await loadSettings();
  toast("Paso creado", "success");
}

function applyModifierTemplatePreset() {
  const type = String(document.getElementById("cfgGroupTemplateTypeSelect")?.value || "other");
  const preset = MODIFIER_TEMPLATE_PRESETS[type] || MODIFIER_TEMPLATE_PRESETS.other;
  const nameInput = document.getElementById("cfgGroupNameInput");
  const minInput = document.getElementById("cfgGroupMinInput");
  const maxInput = document.getElementById("cfgGroupMaxInput");
  if (nameInput && !String(nameInput.value || "").trim() && preset.suggestedName) {
    nameInput.value = preset.suggestedName;
  }
  if (minInput) minInput.value = String(preset.minSelect);
  if (maxInput) maxInput.value = String(preset.maxSelect);
}

async function saveModifierTemplateWithOptions() {
  const groupType = String(document.getElementById("cfgGroupTemplateTypeSelect")?.value || "other");
  const name = String(document.getElementById("cfgGroupNameInput").value || "").trim();
  const minSelect = Number(document.getElementById("cfgGroupMinInput").value || "0");
  const maxSelect = Number(document.getElementById("cfgGroupMaxInput").value || "1");
  const sortOrder = Number(document.getElementById("cfgGroupSortInput").value || "0");
  const quickOptions = String(document.getElementById("cfgGroupQuickOptionsInput")?.value || "")
    .split(",")
    .map((x) => String(x || "").trim())
    .filter(Boolean);
  if (!name) {
    toast("Nombre del paso requerido", "error");
    return;
  }
  if (!quickOptions.length) {
    toast("Agrega opciones separadas por coma", "error");
    return;
  }

  const created = await api("/api/settings/modifier-groups", {
    method: "POST",
    body: JSON.stringify({ name, minSelect, maxSelect, sortOrder, groupType }),
  });
  const groupId = Number(created?.groupId || 0);
  if (!groupId) throw new Error("No se pudo crear la plantilla");

  for (let i = 0; i < quickOptions.length; i += 1) {
    await api(`/api/settings/modifier-groups/${groupId}/options`, {
      method: "POST",
      body: JSON.stringify({ name: quickOptions[i], priceDelta: 0, sortOrder: i + 1 }),
    });
  }
  document.getElementById("cfgGroupNameInput").value = "";
  const quickInput = document.getElementById("cfgGroupQuickOptionsInput");
  if (quickInput) quickInput.value = "";
  await loadSettings();
  toast("Plantilla creada con opciones", "success");
}

async function saveModifierOptionConfig() {
  const groupId = Number(document.getElementById("cfgOptionGroupSelect").value || "0");
  const name = String(document.getElementById("cfgOptionNameInput").value || "").trim();
  const priceDelta = Number(document.getElementById("cfgOptionPriceInput").value || "0");
  const sortOrder = Number(document.getElementById("cfgOptionSortInput").value || "0");
  if (!groupId || !name) {
    toast("Grupo y opcion son requeridos", "error");
    return;
  }
  await api(`/api/settings/modifier-groups/${groupId}/options`, {
    method: "POST",
    body: JSON.stringify({ name, priceDelta, sortOrder }),
  });
  document.getElementById("cfgOptionNameInput").value = "";
  await loadSettings();
  toast("Opcion agregada", "success");
}

async function saveProductStepConfig() {
  const productId = Number(document.getElementById("cfgStepProductSelect").value || "0");
  const groupId = Number(document.getElementById("cfgStepGroupSelect").value || "0");
  const sortOrder = Number(document.getElementById("cfgStepSortInput").value || "0");
  if (!productId || !groupId) {
    toast("Producto y paso son requeridos", "error");
    return;
  }
  await api("/api/settings/product-steps", {
    method: "POST",
    body: JSON.stringify({ productId, groupId, sortOrder }),
  });
  await loadSettings();
  toast("Paso asignado al plato", "success");
}

async function saveDiscountPresetConfig() {
  const name = String(document.getElementById("cfgDiscountPresetNameInput").value || "").trim();
  const type = document.getElementById("cfgDiscountPresetTypeSelect").value;
  const value = Number(document.getElementById("cfgDiscountPresetValueInput").value || "0");
  const isActive = document.getElementById("cfgDiscountPresetActiveInput").checked ? 1 : 0;
  const sortOrder = Number(document.getElementById("cfgDiscountPresetSortInput").value || "0");
  if (!name) {
    toast("Nombre del tipo de descuento requerido", "error");
    return;
  }
  await api("/api/settings/discount-presets", {
    method: "POST",
    body: JSON.stringify({ name, type, value, isActive, sortOrder }),
  });
  document.getElementById("cfgDiscountPresetNameInput").value = "";
  await loadSettings();
  toast("Tipo de descuento guardado", "success");
}

async function sendAccountToCashier() {
  if (!state.selectedAccountId) {
    toast("Selecciona una cuenta", "error");
    return;
  }
  const result = await api(`/api/accounts/${state.selectedAccountId}/send`, { method: "POST" });
  const destinations = (result.tickets || [])
    .map((t) => `${t.centerName}${t.printerName ? ` (${t.printerName})` : ""}`)
    .join(", ");
  toast(
    `Comanda ${result.checkNumber} enviada (${Number(result.sentItems || 0)} item(s))${destinations ? ` -> ${destinations}` : ""}`,
    "success",
    4200
  );
  await loadAccountDetail();
}

async function closeAccount() {
  if (!state.selectedAccountId) return;
  const confirmed = await askConfirm({
    title: "Cerrar Cuenta",
    message: "Esta accion cerrara la cuenta actual. ¿Deseas continuar?",
    okText: "Si, cerrar",
  });
  if (!confirmed) return;
  await api(`/api/accounts/${state.selectedAccountId}/close`, { method: "POST" });
  toast("Cuenta cerrada", "success");
  await handleAfterAccountClosed();
}

async function handleAfterAccountClosed() {
  await loadTables();
  const accounts = await api(`/api/tables/${state.selectedTableId}/accounts`);
  state.tableAccounts = accounts;
  if (accounts.length > 1) {
    state.selectedAccountId = null;
    state.accountDetail = null;
    renderAccountPickerCards();
    showAccountPickerView();
    return;
  }
  state.selectedAccountId = accounts.length ? accounts[0].id : null;
  if (state.selectedAccountId) {
    showServiceView();
    document.getElementById("orderTitle").textContent = `Mesa ${state.selectedTableCode} | ${accounts[0].check_number}`;
    await loadAccountDetail();
  } else {
    state.accountDetail = null;
    document.getElementById("orderTitle").textContent = `Mesa ${state.selectedTableCode || ""}`;
    document.getElementById("orderList").innerHTML = "";
    document.getElementById("subtotalText").textContent = money(0);
    document.getElementById("discountText").textContent = money(0);
    document.getElementById("tipText").textContent = money(0);
    document.getElementById("totalText").textContent = money(0);
    document.getElementById("paidText").textContent = money(0);
    document.getElementById("pendingText").textContent = money(0);
  }
}

function backToTables() {
  state.selectedTableId = null;
  state.selectedTableCode = null;
  state.selectedAccountId = null;
  state.tableAccounts = [];
  state.selectedCategoryId = null;
  state.selectedProductId = null;
  state.accountDetail = null;
  clearProductBuilder();
  document.getElementById("orderTitle").textContent = "Cuenta";
  setOrderWaiterText("-");
  const pickerCards = document.getElementById("accountPickerCards");
  if (pickerCards) pickerCards.innerHTML = "";
  document.getElementById("orderList").innerHTML = "";
  document.getElementById("subtotalText").textContent = money(0);
  document.getElementById("discountText").textContent = money(0);
  document.getElementById("tipText").textContent = money(0);
  document.getElementById("totalText").textContent = money(0);
  document.getElementById("paidText").textContent = money(0);
  document.getElementById("pendingText").textContent = money(0);
  updateMenuQuickActionsState();
  showTablesView();
}

async function openShift() {
  await api("/api/shifts/open", {
    method: "POST",
    body: JSON.stringify({ cashierId: selectedCashierId(), centerId: selectedCenterId(), note: "Turno abierto desde POS" }),
  });
  toast("Turno abierto", "success");
}

async function closeShift() {
  const confirmed = await askConfirm({
    title: "Cerrar Turno",
    message: "Se realizara el cierre del turno actual. ¿Deseas continuar?",
    okText: "Cerrar turno",
  });
  if (!confirmed) return;
  const result = await api("/api/shifts/close", {
    method: "POST",
    body: JSON.stringify({ cashierId: selectedCashierId(), centerId: selectedCenterId(), note: "Cierre normal" }),
  });
  toast(
    `Cierre ${result.shiftId} | CHKs: ${result.summary.total_checks} | Total: ${money(result.summary.grand_total)}`,
    "info",
    4200
  );
}

document.getElementById("modalOkBtn")?.addEventListener("click", () => {
  const input = document.getElementById("modalInput");
  closeModal(input.classList.contains("hidden") ? true : input.value);
});

document.getElementById("modalCancelBtn")?.addEventListener("click", () => closeModal(null));

document.getElementById("uiModal")?.addEventListener("click", (e) => {
  if (e.target.id === "uiModal") closeModal(null);
});

document.getElementById("modalInput")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    closeModal(e.currentTarget.value);
  }
});

document.getElementById("countPickerCancelBtn")?.addEventListener("click", () => closeCountPicker(null));

document.getElementById("countPickerOkBtn")?.addEventListener("click", () => {
  const input = document.getElementById("countPickerInput");
  const value = Number(input?.value || "0");
  const min = Number(countPickerState.min || 1);
  const max = Number(countPickerState.max || min);
  if (Number.isNaN(value) || value < min || value > max) {
    toast(`Ingresa un numero entre ${min} y ${max}`, "error");
    return;
  }
  closeCountPicker(Math.trunc(value));
});

document.getElementById("countPickerInput")?.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  document.getElementById("countPickerOkBtn")?.click();
});

document.getElementById("countPickerModal")?.addEventListener("click", (e) => {
  if (e.target.id === "countPickerModal") closeCountPicker(null);
});

document.getElementById("payTableModal")?.addEventListener("click", (e) => {
  if (e.target.id === "payTableModal") closePayTableModal();
});
document.getElementById("functionsModal")?.addEventListener("click", (e) => {
  if (e.target.id === "functionsModal") closeFunctionsModal();
});

document.getElementById("moduleRestaurantBtn")?.addEventListener("click", enterRestaurantModule);
document.getElementById("moduleReceptionBtn")?.addEventListener("click", () =>
  toast("Modulo Recepcion estara disponible proximamente.", "info")
);
document.getElementById("moduleCrmBtn")?.addEventListener("click", () =>
  toast("Modulo CRM estara disponible proximamente.", "info")
);
document.getElementById("backToModulesBtn")?.addEventListener("click", showModuleLauncher);
document.getElementById("restaurantHomeBtn")?.addEventListener("click", showRestaurantHomeView);
document.getElementById("openTablesFromHomeBtn")?.addEventListener("click", () =>
  loadTables().then(showTablesView).catch((e) => toast(e.message, "error"))
);
document.getElementById("backHomeFromTablesBtn")?.addEventListener("click", showRestaurantHomeView);
document.getElementById("openCashierFromHomeBtn")?.addEventListener("click", () => {
  showCashierView();
  resetCashierSummary();
});
document.getElementById("openSettingsFromHomeBtn")?.addEventListener("click", () =>
  openSettings().catch((e) => toast(e.message, "error"))
);
document.getElementById("openOpsFromHomeBtn")?.addEventListener("click", showOpsView);
document.getElementById("ambienceDefaultBtn")?.addEventListener("click", () => applyAmbience("default"));
document.getElementById("ambienceWarmBtn")?.addEventListener("click", () => applyAmbience("warm"));
document.getElementById("ambienceCoolBtn")?.addEventListener("click", () => applyAmbience("cool"));
document.getElementById("createAccountFromPickerBtn")?.addEventListener("click", () =>
  createAccount({ withPrompt: true }).catch((e) => toast(e.message, "error"))
);
document.getElementById("menuFunctionsBtn")?.addEventListener("click", openFunctionsModal);
document.getElementById("menuPrecheckBtn")?.addEventListener("click", openPrecheckPrint);
document.getElementById("menuPayTableBtn")?.addEventListener("click", () => openPayTableModal());
document.getElementById("menuSendOrderBtn")?.addEventListener("click", () =>
  sendAccountToCashier().catch((e) => toast(e.message, "error"))
);
document.getElementById("payTableAddLineBtn")?.addEventListener("click", () => {
  const methods = availablePaymentMethods();
  state.payTableModal.lines.push(createPayTableLine({ method: methods[0]?.code || "cash" }));
  renderPayTableLines();
});
document.getElementById("payTableCancelBtn")?.addEventListener("click", closePayTableModal);
document.getElementById("payTableRemoveTipBtn")?.addEventListener("click", () =>
  removeTipForCurrentAccount().catch((e) => toast(e.message, "error"))
);
document.getElementById("payTableApplyBtn")?.addEventListener("click", () =>
  applyPayTableModalPayments({ closeAfter: false }).catch((e) => toast(e.message, "error"))
);
document.getElementById("payTableApplyCloseBtn")?.addEventListener("click", () =>
  applyPayTableModalPayments({ closeAfter: true }).catch((e) => toast(e.message, "error"))
);
document.getElementById("payTableTenderedInput")?.addEventListener("input", renderTenderedPreview);
document.getElementById("functionsCloseBtn")?.addEventListener("click", closeFunctionsModal);
document.getElementById("functionsMoveSeatBtn")?.addEventListener("click", showFunctionsMoveSeat);
document.getElementById("functionsSeatSummaryBtn")?.addEventListener("click", showFunctionsSeatSummary);
document.getElementById("functionsSplitAccountsBtn")?.addEventListener("click", () =>
  showFunctionsSplitAccounts().catch((e) => toast(e.message, "error"))
);
document.getElementById("functionsSeatSummaryPrintAllBtn")?.addEventListener("click", printAllSeatPrechecks);
document.getElementById("functionsMoveSeatBackBtn")?.addEventListener("click", showFunctionsMenu);
document.getElementById("functionsSeatSummaryBackBtn")?.addEventListener("click", showFunctionsMenu);
document.getElementById("functionsSeatSummaryCloseBtn")?.addEventListener("click", closeFunctionsModal);
document.getElementById("functionsMoveSeatApplyBtn")?.addEventListener("click", () =>
  applyMoveSeatFromFunctions().catch((e) => toast(e.message, "error"))
);
document.getElementById("functionsSplitBackBtn")?.addEventListener("click", showFunctionsMenu);
document.getElementById("functionsSplitCloseBtn")?.addEventListener("click", closeFunctionsModal);
document.getElementById("functionsSplitRefreshBtn")?.addEventListener("click", () =>
  showFunctionsSplitAccounts().catch((e) => toast(e.message, "error"))
);
document.getElementById("functionsSplitAddAccountBtn")?.addEventListener("click", () =>
  addEmptyAccountFromFunctions().catch((e) => toast(e.message, "error"))
);
document.getElementById("functionsSplitMoveSeatBtn")?.addEventListener("click", () =>
  moveSeatBetweenAccountsFromFunctions().catch((e) => toast(e.message, "error"))
);
document.getElementById("functionsSplitMoveItemBtn")?.addEventListener("click", () =>
  moveItemBetweenAccountsFromFunctions().catch((e) => toast(e.message, "error"))
);
document.getElementById("functionsSplitShareEqualBtn")?.addEventListener("click", () =>
  splitEqualAcrossAccountsFromFunctions().catch((e) => toast(e.message, "error"))
);
document.getElementById("functionsSplitSourceAccountSelect")?.addEventListener("change", () => {
  state.splitAccounts.sourceAccountId = Number(document.getElementById("functionsSplitSourceAccountSelect")?.value || "0");
  refreshSplitSourceAccountDetail()
    .then(renderSplitAccountsSection)
    .catch((e) => toast(e.message, "error"));
});

document.getElementById("centerSelect")?.addEventListener("change", () => {
  state.selectedCenterId = Number(document.getElementById("centerSelect").value || "0");
  loadTables()
    .then(showTablesView)
    .catch((e) => toast(e.message, "error"));
});
document.getElementById("closeOpsBtn")?.addEventListener("click", showRestaurantHomeView);
document.getElementById("openShiftBtn")?.addEventListener("click", () => openShift().catch((e) => toast(e.message, "error")));
document.getElementById("closeShiftBtn")?.addEventListener("click", () => closeShift().catch((e) => toast(e.message, "error")));
document.getElementById("backToTablesBtn")?.addEventListener("click", backToTables);
document.getElementById("openCashierBtn")?.addEventListener("click", () => {
  showCashierView();
  resetCashierSummary();
});
document.getElementById("backFromCashierBtn")?.addEventListener("click", showRestaurantHomeView);
document.getElementById("findByCheckBtn")?.addEventListener("click", () => findCashierByCheck().catch((e) => toast(e.message, "error")));
document.getElementById("findByAccountIdBtn")?.addEventListener("click", () =>
  findCashierByAccountId().catch((e) => toast(e.message, "error"))
);
document.getElementById("cashAddDiscountBtn")?.addEventListener("click", () =>
  applyCashierDiscount().catch((e) => toast(e.message, "error"))
);
document.getElementById("cashAddPaymentBtn")?.addEventListener("click", () =>
  addCashierPayment().catch((e) => toast(e.message, "error"))
);
document.getElementById("cashCloseAccountBtn")?.addEventListener("click", () =>
  closeCashierAccount().catch((e) => toast(e.message, "error"))
);
document.getElementById("cashCloseShiftBtn")?.addEventListener("click", () => closeShift().catch((e) => toast(e.message, "error")));
document.getElementById("openSettingsBtn")?.addEventListener("click", () => openSettings().catch((e) => toast(e.message, "error")));
document.getElementById("backFromSettingsBtn")?.addEventListener("click", showRestaurantHomeView);
document.getElementById("cfgNavProductsBtn")?.addEventListener("click", () => switchSettingsSection("products"));
document.getElementById("cfgNavModifiersBtn")?.addEventListener("click", () => switchSettingsSection("modifiers"));
document.getElementById("cfgNavDiscountsBtn")?.addEventListener("click", () => switchSettingsSection("discounts"));
document.getElementById("cfgNavOpsBtn")?.addEventListener("click", () => switchSettingsSection("ops"));
document.getElementById("cfgAddCategoryBtn")?.addEventListener("click", () =>
  saveCategoryConfig().catch((e) => toast(e.message, "error"))
);
document.getElementById("cfgAddAreaBtn")?.addEventListener("click", () => saveAreaConfig().catch((e) => toast(e.message, "error")));
document.getElementById("cfgAddCenterBtn")?.addEventListener("click", () =>
  saveOperationCenterConfig().catch((e) => toast(e.message, "error"))
);
document.getElementById("cfgBindThisPcBtn")?.addEventListener("click", () =>
  bindThisPcToCenter().catch((e) => toast(e.message, "error"))
);
document.getElementById("cfgSaveCenterProductBtn")?.addEventListener("click", () =>
  saveCenterProductConfig().catch((e) => toast(e.message, "error"))
);
document.getElementById("cfgAddTableBtn")?.addEventListener("click", () => saveTableConfig().catch((e) => toast(e.message, "error")));
document.getElementById("cfgSavePaymentBtn")?.addEventListener("click", () =>
  savePaymentMethodConfig().catch((e) => toast(e.message, "error"))
);
document.getElementById("cfgSaveTipBtn")?.addEventListener("click", () =>
  saveTipConfig().catch((e) => toast(e.message, "error"))
);
document.getElementById("cfgAddProductBtn")?.addEventListener("click", () => saveProductConfig().catch((e) => toast(e.message, "error")));
document.getElementById("cfgResetProductFormBtn")?.addEventListener("click", resetProductForm);
document.getElementById("cfgProductSearchInput")?.addEventListener("input", renderProductsManager);
document.getElementById("cfgProductsViewListBtn")?.addEventListener("click", () => switchProductsManagerView("list"));
document.getElementById("cfgProductsViewCreateBtn")?.addEventListener("click", async () => {
  switchProductsManagerView("create");
  await ensureWizardTemplatesLoaded();
  resetWizardData();
  initializeWizardProductTypeSelect();
});
document.getElementById("wizardNextStep1Btn")?.addEventListener("click", () =>
  goWizardFromStep1ToStep2().catch((e) => toast(e.message, "error"))
);
document.getElementById("wizardBackStep2Btn")?.addEventListener("click", () => showWizardStep(1));
document.getElementById("wizardNextStep2Btn")?.addEventListener("click", goWizardFromStep2ToStep3);
document.getElementById("wizardBackStep3Btn")?.addEventListener("click", () => showWizardStep(2));
document.getElementById("wizardCreateBtn")?.addEventListener("click", () =>
  createProductFromWizard().catch((e) => toast(e.message, "error"))
);
document.getElementById("cfgAddGroupBtn")?.addEventListener("click", () =>
  saveModifierGroupConfig().catch((e) => toast(e.message, "error"))
);
document.getElementById("cfgCreateGroupTemplateBtn")?.addEventListener("click", () =>
  saveModifierTemplateWithOptions().catch((e) => toast(e.message, "error"))
);
document.getElementById("cfgGroupTemplateTypeSelect")?.addEventListener("change", applyModifierTemplatePreset);
document.getElementById("cfgAddOptionBtn")?.addEventListener("click", () =>
  saveModifierOptionConfig().catch((e) => toast(e.message, "error"))
);
document.getElementById("cfgAssignStepBtn")?.addEventListener("click", () =>
  saveProductStepConfig().catch((e) => toast(e.message, "error"))
);
document.getElementById("cfgAddDiscountPresetBtn")?.addEventListener("click", () =>
  saveDiscountPresetConfig().catch((e) => toast(e.message, "error"))
);

switchProductsManagerView("list");
showWizardStep(1);
applyModifierTemplatePreset();
applyAmbience(localStorage.getItem("restaurantAmbience") || "default");
setInterval(refreshTablesElapsedTimes, 30000);
updateMenuQuickActionsState();

loadBootstrap()
  .then(() => {
    if (!state.activeModule) showModuleLauncher();
  })
  .catch((e) => toast(e.message, "error", 4000));

