/* =========================================================
   Kanban Board (vanilla JS + localStorage)
   Data: board = { columns: [ { id, title, limit, done, cards: [] } ] }
   ========================================================= */

const STORAGE_KEY = "kanban_board_v1";
const THEME_KEY = "kanban_theme";
const PRIORITIES = { high: "High", medium: "Medium", low: "Low" };

/* ---------- Safe storage ---------- */
function load(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function store(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
}

/* ---------- Elements ---------- */
const boardEl = document.getElementById("board");
const statsEl = document.getElementById("stats");
const toastEl = document.getElementById("toast");
const searchInput = document.getElementById("searchInput");
const priorityFilter = document.getElementById("priorityFilter");
const addColumnBtn = document.getElementById("addColumnBtn");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFile = document.getElementById("importFile");
const clearDoneBtn = document.getElementById("clearDoneBtn");
const resetBtn = document.getElementById("resetBtn");
const themeBtn = document.getElementById("themeBtn");

const cardDialog = document.getElementById("cardDialog");
const cardForm = document.getElementById("cardForm");
const cardDialogTitle = document.getElementById("cardDialogTitle");
const cardTitle = document.getElementById("cardTitle");
const cardDesc = document.getElementById("cardDesc");
const cardPriority = document.getElementById("cardPriority");
const cardDue = document.getElementById("cardDue");
const cardLabel = document.getElementById("cardLabel");
const cardColumn = document.getElementById("cardColumn");
const cardError = document.getElementById("cardError");
const cardDeleteBtn = document.getElementById("cardDeleteBtn");
const cardCancelBtn = document.getElementById("cardCancelBtn");

const columnDialog = document.getElementById("columnDialog");
const columnForm = document.getElementById("columnForm");
const columnDialogTitle = document.getElementById("columnDialogTitle");
const colName = document.getElementById("colName");
const colLimit = document.getElementById("colLimit");
const colDone = document.getElementById("colDone");
const columnError = document.getElementById("columnError");
const columnCancelBtn = document.getElementById("columnCancelBtn");

/* ---------- Small helpers ---------- */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function iconBtn(text, label, onClick) {
  const btn = el("button", "icon-btn", text);
  btn.type = "button";
  btn.title = label;
  btn.setAttribute("aria-label", label);
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  return btn;
}

function dateToString(d) {
  return (
    d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function todayString() {
  return dateToString(new Date());
}

function offsetDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dateToString(d);
}

function formatDue(due) {
  return new Date(due + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatTime(ts) {
  return new Date(ts).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });
}

let toastTimer = null;
function toast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2600);
}

/* ---------- Data model ---------- */
function makeCard(f) {
  return {
    id: uid(),
    title: f.title,
    desc: f.desc || "",
    priority: f.priority || "medium",
    due: f.due || "",
    label: f.label || "",
    createdAt: f.createdAt || Date.now(),
    completedAt: f.completedAt || null,
  };
}

function makeColumn(title, limit, done, cards) {
  return { id: uid(), title: title, limit: limit || 0, done: !!done, cards: cards || [] };
}

function defaultBoard() {
  return {
    columns: [
      makeColumn("To Do", 0, false, [
        makeCard({ title: "Plan the project", desc: "List the features and pages.", priority: "high", due: offsetDate(2), label: "Planning" }),
        makeCard({ title: "Design the layout", desc: "Sketch the board and cards.", priority: "medium", label: "Design" }),
      ]),
      makeColumn("In Progress", 3, false, [
        makeCard({ title: "Build the HTML structure", priority: "medium", label: "Code" }),
      ]),
      makeColumn("Review", 0, false, []),
      makeColumn("Done", 0, true, [
        makeCard({ title: "Set up project folder", priority: "low", label: "Setup", completedAt: Date.now() }),
      ]),
    ],
  };
}

// Kisi bhi saved/imported data ko safe shape mein badalta hai
function normalizeBoard(data) {
  if (!data || !Array.isArray(data.columns)) return null;
  return {
    columns: data.columns.map((col) => ({
      id: typeof col.id === "string" && col.id ? col.id : uid(),
      title: String(col.title || "Untitled").slice(0, 30),
      limit: Math.max(0, parseInt(col.limit, 10) || 0),
      done: !!col.done,
      cards: Array.isArray(col.cards)
        ? col.cards.filter((c) => c && c.title).map((c) => ({
            id: typeof c.id === "string" && c.id ? c.id : uid(),
            title: String(c.title).slice(0, 80),
            desc: String(c.desc || "").slice(0, 300),
            priority: PRIORITIES[c.priority] ? c.priority : "medium",
            due: /^\d{4}-\d{2}-\d{2}$/.test(c.due || "") ? c.due : "",
            label: String(c.label || "").slice(0, 20),
            createdAt: Number(c.createdAt) || Date.now(),
            completedAt: Number(c.completedAt) || null,
          }))
        : [],
    })),
  };
}

function loadBoard() {
  try {
    const saved = normalizeBoard(JSON.parse(load(STORAGE_KEY)));
    if (saved) return saved;
  } catch (e) { /* default board use hoga */ }
  return defaultBoard();
}

let board = loadBoard();
let dragged = null;            // { cardId }
let editingCardId = null;
let editingColumnId = null;
let searchTerm = "";
let priorityValue = "all";

function save() {
  store(STORAGE_KEY, JSON.stringify(board));
}

function findColumn(id) {
  return board.columns.find((c) => c.id === id) || null;
}

function findCard(cardId) {
  for (const column of board.columns) {
    const index = column.cards.findIndex((c) => c.id === cardId);
    if (index !== -1) return { card: column.cards[index], column: column, index: index };
  }
  return null;
}

function isFull(column) {
  return column.limit > 0 && column.cards.length >= column.limit;
}

/* ---------- Move a card (drag-drop aur arrow buttons dono yahi use karte hain) ---------- */
function moveCard(cardId, toColumnId, toIndex) {
  const found = findCard(cardId);
  const target = findColumn(toColumnId);
  if (!found || !target) return false;

  const sameColumn = found.column.id === target.id;
  if (!sameColumn && isFull(target)) {
    toast('"' + target.title + '" is full (limit ' + target.limit + ").");
    return false;
  }

  let index = typeof toIndex === "number" ? toIndex : target.cards.length;
  found.column.cards.splice(found.index, 1);
  if (sameColumn && found.index < index) index--;
  target.cards.splice(index, 0, found.card);

  if (target.done && !found.card.completedAt) found.card.completedAt = Date.now();
  if (!target.done) found.card.completedAt = null;

  save();
  render();
  return true;
}

/* ---------- Rendering ---------- */
function cardMatches(card) {
  if (priorityValue !== "all" && card.priority !== priorityValue) return false;
  if (!searchTerm) return true;
  const text = (card.title + " " + card.desc + " " + card.label).toLowerCase();
  return text.includes(searchTerm);
}

function render() {
  boardEl.innerHTML = "";

  if (board.columns.length === 0) {
    boardEl.appendChild(
      el("p", "empty-board", "No columns yet. Click + Column to create your first one.")
    );
  }

  board.columns.forEach((column, index) => boardEl.appendChild(createColumnEl(column, index)));
  updateStats();
}

function updateStats() {
  const today = todayString();
  let total = 0, completed = 0, overdue = 0;
  board.columns.forEach((col) => {
    col.cards.forEach((card) => {
      total++;
      if (col.done) completed++;
      else if (card.due && card.due < today) overdue++;
    });
  });
  statsEl.textContent = total + " cards · " + completed + " completed · " + overdue + " overdue";
}

function createColumnEl(column, colIndex) {
  const section = el("section", "column");
  section.dataset.id = column.id;

  /* Header */
  const head = el("div", "col-head");
  head.appendChild(el("h2", "col-title", column.title));
  if (column.done) {
    const mark = el("span", "col-done-mark", "✅");
    mark.title = "Cards here count as completed";
    head.appendChild(mark);
  }
  const count = el(
    "span",
    "col-count" + (column.limit > 0 && column.cards.length >= column.limit ? " full" : ""),
    column.limit > 0 ? column.cards.length + "/" + column.limit : String(column.cards.length)
  );
  count.title = column.limit > 0 ? "Cards / WIP limit" : "Cards";
  head.appendChild(count);
  head.appendChild(iconBtn("✎", "Edit column", () => openColumnDialog(column.id)));
  head.appendChild(iconBtn("🗑", "Delete column", () => deleteColumn(column.id)));
  section.appendChild(head);

  /* Cards list */
  const list = el("ul", "list");
  const visible = column.cards.filter(cardMatches);
  visible.forEach((card) => list.appendChild(createCardEl(card, column, colIndex)));
  if (visible.length === 0) {
    const filtering = searchTerm || priorityValue !== "all";
    list.appendChild(
      el("li", "empty", filtering ? "No matching cards." : "No cards yet. Add one or drag a card here.")
    );
  }
  section.appendChild(list);

  /* Add card button */
  const addBtn = el("button", "add-card", "+ Add card");
  addBtn.type = "button";
  addBtn.addEventListener("click", () => openCardDialog(null, column.id));
  section.appendChild(addBtn);

  /* Drag & drop target */
  section.addEventListener("dragover", (e) => {
    if (!dragged) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    clearDropMarks();
    const after = getDragAfterElement(list, e.clientY);
    if (after) after.classList.add("drop-before");
    else list.classList.add("drop-end");
  });

  section.addEventListener("dragleave", (e) => {
    if (!section.contains(e.relatedTarget)) clearDropMarks();
  });

  section.addEventListener("drop", (e) => {
    if (!dragged) return;
    e.preventDefault();
    const after = getDragAfterElement(list, e.clientY);
    const index = after
      ? column.cards.findIndex((c) => c.id === after.dataset.id)
      : column.cards.length;
    const cardId = dragged.cardId;
    dragged = null;
    clearDropMarks();
    moveCard(cardId, column.id, index);
  });

  return section;
}

function createCardEl(card, column, colIndex) {
  const today = todayString();
  const li = el("li", "card priority-" + card.priority + (column.done ? " is-done" : ""));
  li.dataset.id = card.id;
  li.draggable = true;
  li.tabIndex = 0;

  /* Tags */
  const tags = el("div", "card-tags");
  tags.appendChild(el("span", "tag p-" + card.priority, PRIORITIES[card.priority]));
  if (card.label) tags.appendChild(el("span", "tag", card.label));
  li.appendChild(tags);

  li.appendChild(el("h3", "card-title", card.title));
  if (card.desc) li.appendChild(el("p", "card-desc", card.desc));

  if (card.due) {
    const overdue = !column.done && card.due < today;
    li.appendChild(
      el("div", "card-due" + (overdue ? " overdue" : ""), (overdue ? "Overdue: " : "Due: ") + formatDue(card.due))
    );
  }

  let time = "Added " + formatTime(card.createdAt);
  if (column.done && card.completedAt) time += " · Completed " + formatTime(card.completedAt);
  li.appendChild(el("div", "card-time", time));

  /* Actions: move left/right (touch + keyboard ke liye), edit, delete */
  const actions = el("div", "card-actions");
  const left = iconBtn("◀", "Move to previous column", () =>
    moveCard(card.id, board.columns[colIndex - 1].id)
  );
  const right = iconBtn("▶", "Move to next column", () =>
    moveCard(card.id, board.columns[colIndex + 1].id)
  );
  left.disabled = colIndex === 0;
  right.disabled = colIndex === board.columns.length - 1;
  actions.append(
    left,
    right,
    iconBtn("✎", "Edit card", () => openCardDialog(card.id)),
    iconBtn("🗑", "Delete card", () => deleteCard(card.id))
  );
  li.appendChild(actions);

  /* Events */
  li.addEventListener("dragstart", (e) => {
    dragged = { cardId: card.id };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", card.id);
    setTimeout(() => li.classList.add("dragging"), 0);
  });
  li.addEventListener("dragend", () => {
    dragged = null;
    li.classList.remove("dragging");
    clearDropMarks();
  });
  li.addEventListener("dblclick", () => openCardDialog(card.id));
  li.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target === li) openCardDialog(card.id);
  });

  return li;
}

function clearDropMarks() {
  document.querySelectorAll(".drop-before").forEach((n) => n.classList.remove("drop-before"));
  document.querySelectorAll(".drop-end").forEach((n) => n.classList.remove("drop-end"));
}

function getDragAfterElement(list, y) {
  const cards = Array.from(list.querySelectorAll(".card:not(.dragging)"));
  let closest = null;
  let closestOffset = Number.NEGATIVE_INFINITY;
  cards.forEach((c) => {
    const box = c.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closestOffset) {
      closestOffset = offset;
      closest = c;
    }
  });
  return closest;
}

/* ---------- Card dialog ---------- */
function showCardError(text, field) {
  cardError.textContent = text;
  cardError.hidden = false;
  if (field) field.classList.add("invalid");
}

function openCardDialog(cardId, columnId) {
  cardError.hidden = true;
  cardTitle.classList.remove("invalid");

  cardColumn.innerHTML = "";
  board.columns.forEach((col) => {
    const option = document.createElement("option");
    option.value = col.id;
    option.textContent = col.title;
    cardColumn.appendChild(option);
  });

  if (board.columns.length === 0) {
    toast("Create a column first.");
    return;
  }

  const found = cardId ? findCard(cardId) : null;
  if (found) {
    editingCardId = cardId;
    cardDialogTitle.textContent = "Edit card";
    cardTitle.value = found.card.title;
    cardDesc.value = found.card.desc;
    cardPriority.value = found.card.priority;
    cardDue.value = found.card.due;
    cardLabel.value = found.card.label;
    cardColumn.value = found.column.id;
    cardDeleteBtn.hidden = false;
  } else {
    editingCardId = null;
    cardDialogTitle.textContent = "New card";
    cardForm.reset();
    cardPriority.value = "medium";
    cardColumn.value = columnId || board.columns[0].id;
    cardDeleteBtn.hidden = true;
  }

  cardDialog.showModal();
  cardTitle.focus();
}

cardForm.addEventListener("submit", (e) => {
  e.preventDefault();
  cardError.hidden = true;
  cardTitle.classList.remove("invalid");

  const title = cardTitle.value.trim();
  if (!title) {
    showCardError("Please enter a card title.", cardTitle);
    return;
  }

  const target = findColumn(cardColumn.value);
  if (!target) {
    showCardError("Please choose a column.");
    return;
  }

  const data = {
    title: title,
    desc: cardDesc.value.trim(),
    priority: cardPriority.value,
    due: cardDue.value,
    label: cardLabel.value.trim(),
  };

  if (editingCardId) {
    const found = findCard(editingCardId);
    if (!found) { cardDialog.close(); return; }

    const changingColumn = found.column.id !== target.id;
    if (changingColumn && isFull(target)) {
      showCardError('"' + target.title + '" is full (limit ' + target.limit + ").");
      return;
    }

    Object.assign(found.card, data);
    if (changingColumn) {
      moveCard(found.card.id, target.id);
    } else {
      save();
      render();
    }
  } else {
    if (isFull(target)) {
      showCardError('"' + target.title + '" is full (limit ' + target.limit + ").");
      return;
    }
    const card = makeCard(data);
    if (target.done) card.completedAt = Date.now();
    target.cards.push(card);
    save();
    render();
  }

  cardDialog.close();
});

cardCancelBtn.addEventListener("click", () => cardDialog.close());
cardDeleteBtn.addEventListener("click", () => {
  if (editingCardId && deleteCard(editingCardId)) cardDialog.close();
});

function deleteCard(cardId) {
  const found = findCard(cardId);
  if (!found) return false;
  if (!confirm('Delete "' + found.card.title + '" permanently?')) return false;
  found.column.cards.splice(found.index, 1);
  save();
  render();
  return true;
}

/* ---------- Column dialog ---------- */
function openColumnDialog(columnId) {
  columnError.hidden = true;
  colName.classList.remove("invalid");

  const column = columnId ? findColumn(columnId) : null;
  if (column) {
    editingColumnId = columnId;
    columnDialogTitle.textContent = "Edit column";
    colName.value = column.title;
    colLimit.value = column.limit;
    colDone.checked = column.done;
  } else {
    editingColumnId = null;
    columnDialogTitle.textContent = "New column";
    colName.value = "";
    colLimit.value = 0;
    colDone.checked = false;
  }

  columnDialog.showModal();
  colName.focus();
}

columnForm.addEventListener("submit", (e) => {
  e.preventDefault();
  columnError.hidden = true;
  colName.classList.remove("invalid");

  const name = colName.value.trim();
  const limit = colLimit.value === "" ? 0 : parseInt(colLimit.value, 10);

  if (!name) {
    columnError.textContent = "Please enter a column name.";
    columnError.hidden = false;
    colName.classList.add("invalid");
    return;
  }
  if (isNaN(limit) || limit < 0) {
    columnError.textContent = "WIP limit must be 0 or more.";
    columnError.hidden = false;
    return;
  }

  if (editingColumnId) {
    const column = findColumn(editingColumnId);
    if (limit > 0 && limit < column.cards.length) {
      columnError.textContent = "Limit is lower than the " + column.cards.length + " cards already here.";
      columnError.hidden = false;
      return;
    }
    column.title = name;
    column.limit = limit;
    column.done = colDone.checked;
    column.cards.forEach((card) => {
      if (column.done && !card.completedAt) card.completedAt = Date.now();
      if (!column.done) card.completedAt = null;
    });
  } else {
    board.columns.push(makeColumn(name, limit, colDone.checked, []));
  }

  save();
  render();
  columnDialog.close();
});

columnCancelBtn.addEventListener("click", () => columnDialog.close());

function deleteColumn(columnId) {
  const column = findColumn(columnId);
  if (!column) return;
  const message = column.cards.length
    ? 'Delete "' + column.title + '" and its ' + column.cards.length + " cards?"
    : 'Delete column "' + column.title + '"?';
  if (!confirm(message)) return;
  board.columns = board.columns.filter((c) => c.id !== columnId);
  save();
  render();
}

// Dialog ke bahar (backdrop) click karne par band ho
[cardDialog, columnDialog].forEach((dialog) => {
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
});

/* ---------- Toolbar ---------- */
addColumnBtn.addEventListener("click", () => openColumnDialog(null));

searchInput.addEventListener("input", () => {
  searchTerm = searchInput.value.trim().toLowerCase();
  render();
});

priorityFilter.addEventListener("change", () => {
  priorityValue = priorityFilter.value;
  render();
});

clearDoneBtn.addEventListener("click", () => {
  const doneColumns = board.columns.filter((c) => c.done && c.cards.length > 0);
  if (doneColumns.length === 0) {
    toast("No completed cards to clear.");
    return;
  }
  if (!confirm("Delete all cards in completed columns?")) return;
  doneColumns.forEach((c) => { c.cards = []; });
  save();
  render();
});

resetBtn.addEventListener("click", () => {
  if (!confirm("Reset the board to the sample data? This deletes everything.")) return;
  board = defaultBoard();
  save();
  render();
});

exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(board, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "kanban-board.json";
  link.click();
  URL.revokeObjectURL(url);
});

importBtn.addEventListener("click", () => importFile.click());

importFile.addEventListener("change", () => {
  const file = importFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = normalizeBoard(JSON.parse(reader.result));
      if (!imported) throw new Error("bad shape");
      if (!confirm("Replace the current board with the imported file?")) return;
      board = imported;
      save();
      render();
      toast("Board imported.");
    } catch (err) {
      toast("Invalid file. Please choose a board exported from this app.");
    }
  };
  reader.readAsText(file);
  importFile.value = "";
});

/* ---------- Dark / Light mode ---------- */
let currentTheme = "light";

function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  themeBtn.textContent = theme === "dark" ? "☀️ Light" : "🌙 Dark";
  store(THEME_KEY, theme);
}

themeBtn.addEventListener("click", () => {
  applyTheme(currentTheme === "dark" ? "light" : "dark");
});

applyTheme(load(THEME_KEY) === "dark" ? "dark" : "light");

/* ---------- Start ---------- */
render();