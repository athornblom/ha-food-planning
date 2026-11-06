/*
 * Food Planning recipe card.
 *
 * Served by the food_planning integration and loaded on every dashboard.
 * Usage:  type: custom:food-planning-card
 * Options: title (string), language ("sv" | "en", default "sv").
 *
 * Recipe text comes from web pages, so it is only ever inserted as text
 * (textContent / input values), never as HTML, and links/images are limited
 * to http(s) and the integration's own image path.
 */

const STRINGS = {
  sv: {
    title: "Recept",
    placeholder: "Klistra in en länk eller recepttext…",
    add: "Lägg till",
    importing: "Hämtar recept… det tar några sekunder.",
    imported: (title) => `”${title}” har lagts till.`,
    empty: "Inga recept än. Klistra in en länk eller en recepttext ovan.",
    search: "Sök recept eller ingrediens",
    noMatch: "Inga recept matchar.",
    filterAll: "Alla",
    filterReady: "Redo att laga",
    filterShopping: "Att handla",
    toBuy: (n) => `🛒 ${n} kvar att handla`,
    ready: "✓ Redo att laga",
    readyLong: "Allt är inhandlat. Dags att laga!",
    cooked: "Lagad",
    cookedDone: "Markerad som lagad. Hemma uppdateras med det som gick åt.",
    ingredients: "Ingredienser",
    steps: "Gör så här",
    notes: "Tips",
    addToList: "Lägg i inköpslistan",
    added: (n) =>
      n === 0
        ? "Allt fanns redan på inköpslistan."
        : `${n} ${n === 1 ? "ingrediens" : "ingredienser"} lades till i inköpslistan.`,
    remove: "Ta bort",
    confirmRemove: "Ja, ta bort",
    cancel: "Avbryt",
    edit: "Redigera",
    save: "Spara",
    fieldTitle: "Namn",
    fieldServings: "Portioner",
    fieldIngredients: "Ingredienser (en per rad)",
    fieldSteps: "Gör så här (ett steg per rad)",
    fieldNotes: "Tips",
    fieldSource: "Källa (länk)",
    titleRequired: "Receptet behöver ett namn.",
    source: "Källa",
    close: "Stäng",
    notLoaded: "Food Planning är inte laddad.",
  },
  en: {
    title: "Recipes",
    placeholder: "Paste a link or recipe text…",
    add: "Add",
    importing: "Fetching the recipe… this takes a few seconds.",
    imported: (title) => `“${title}” was added.`,
    empty: "No recipes yet. Paste a link or recipe text above.",
    search: "Search recipes or ingredients",
    noMatch: "No recipes match.",
    filterAll: "All",
    filterReady: "Ready to cook",
    filterShopping: "To buy",
    toBuy: (n) => `🛒 ${n} left to buy`,
    ready: "✓ Ready to cook",
    readyLong: "Everything is bought. Time to cook!",
    cooked: "Cooked",
    cookedDone: "Marked as cooked. At home is being updated with what was used.",
    ingredients: "Ingredients",
    steps: "Steps",
    notes: "Tips",
    addToList: "Add to shopping list",
    added: (n) =>
      n === 0
        ? "Everything was already on the shopping list."
        : `${n} ${n === 1 ? "ingredient" : "ingredients"} added to the shopping list.`,
    remove: "Delete",
    confirmRemove: "Yes, delete",
    cancel: "Cancel",
    edit: "Edit",
    save: "Save",
    fieldTitle: "Name",
    fieldServings: "Servings",
    fieldIngredients: "Ingredients (one per line)",
    fieldSteps: "Steps (one per line)",
    fieldNotes: "Tips",
    fieldSource: "Source (link)",
    titleRequired: "The recipe needs a name.",
    source: "Source",
    close: "Close",
    notLoaded: "Food Planning is not loaded.",
  },
};

const DOMAIN = "food_planning";
const URL_RE = /^https?:\/\/\S+$/;

function safeUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (url.protocol === "https:" || url.protocol === "http:") return url.href;
  } catch (_err) {
    /* not a URL */
  }
  return null;
}

function hostOf(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch (_err) {
    return value;
  }
}

/** Create an element with a class, text and children. */
function el(tag, { cls, text, attrs } = {}, ...children) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined && text !== null) node.textContent = text;
  if (attrs) for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const child of children) if (child) node.append(child);
  return node;
}

function errorMessage(err) {
  return (err && (err.message || err.error?.message)) || String(err);
}

function lines(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

const SHARED_CSS = `
  :host { --fp-radius: var(--ha-card-border-radius, 12px); --fp-danger: var(--error-color, #db4437); }
  button {
    font: inherit; cursor: pointer; border: none; border-radius: 999px;
    padding: 8px 16px; background: var(--primary-color); color: var(--text-primary-color, #fff);
  }
  button.secondary {
    background: transparent; color: var(--primary-text-color);
    border: 1px solid var(--divider-color);
  }
  button.danger { background: var(--fp-danger); color: #fff; }
  button.danger-outline {
    background: transparent; color: var(--fp-danger); border: 1px solid var(--fp-danger);
  }
  button:disabled { opacity: 0.5; cursor: default; }
  input, textarea {
    font: inherit; box-sizing: border-box; width: 100%; padding: 9px 12px; border-radius: 8px;
    border: 1px solid var(--divider-color); background: var(--card-background-color);
    color: var(--primary-text-color);
  }
  .placeholder {
    display: flex; align-items: center; justify-content: center;
    background: var(--secondary-background-color); color: var(--secondary-text-color);
    font-size: 40px;
  }
  .status { font-size: 14px; color: var(--secondary-text-color); margin: 8px 0 0; }
  .status.error { color: var(--fp-danger); }
  .badge {
    display: inline-block; font-size: 12px; padding: 2px 8px; border-radius: 999px;
    background: var(--secondary-background-color); color: var(--secondary-text-color);
  }
  .badge.ready { background: var(--success-color, #43a047); color: #fff; }
`;

class FoodPlanningCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._recipes = null;
    this._search = "";
    this._filter = "all";
    this._unsub = null;
    this._subscribing = false;
  }

  setConfig(config) {
    this._config = config || {};
    this._t = STRINGS[this._config.language] || STRINGS.sv;
    this._build();
    this._renderGrid();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._unsub && !this._subscribing && this.isConnected) this._subscribe();
  }

  connectedCallback() {
    if (this._hass && !this._unsub && !this._subscribing) this._subscribe();
  }

  disconnectedCallback() {
    if (this._unsub) {
      this._unsub();
      this._unsub = null;
    }
  }

  getCardSize() {
    return 6;
  }

  getGridOptions() {
    return { columns: "full", min_rows: 4 };
  }

  static getStubConfig() {
    return {};
  }

  async _subscribe() {
    this._subscribing = true;
    try {
      // Re-subscribed automatically by the websocket library on reconnect.
      this._unsub = await this._hass.connection.subscribeMessage(
        (msg) => {
          this._recipes = msg.recipes;
          this._renderGrid();
          if (this._dialog) this._dialog.update(this._recipes);
        },
        { type: `${DOMAIN}/recipes/subscribe` }
      );
      if (!this.isConnected) this.disconnectedCallback();
    } catch (err) {
      this._setStatus(this._t.notLoaded, true);
    } finally {
      this._subscribing = false;
    }
  }

  _build() {
    const t = this._t;
    const style = el("style", {
      text:
        SHARED_CSS +
        `
      ha-card { padding: 16px; }
      h1 { margin: 0 0 12px; font-size: 20px; font-weight: 500; }
      .add { display: flex; gap: 8px; align-items: flex-start; }
      .add textarea { flex: 1; min-height: 40px; max-height: 200px; resize: vertical; }
      .tools { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 16px; }
      .tools input { flex: 1 1 200px; width: auto; }
      .chips { display: flex; gap: 6px; flex-wrap: wrap; }
      .chip {
        padding: 6px 12px; font-size: 13px; background: transparent;
        color: var(--primary-text-color); border: 1px solid var(--divider-color);
      }
      .chip.active { background: var(--primary-color); color: var(--text-primary-color, #fff); border-color: transparent; }
      .grid {
        display: grid; gap: 12px; margin-top: 16px;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      }
      .tile {
        all: unset; cursor: pointer; display: flex; flex-direction: column; overflow: hidden;
        border-radius: var(--fp-radius); background: var(--secondary-background-color);
        box-shadow: var(--ha-card-box-shadow, none); transition: transform 0.15s; position: relative;
      }
      .tile:hover, .tile:focus-visible { transform: translateY(-2px); }
      .tile:focus-visible { outline: 2px solid var(--primary-color); }
      .tile img, .tile .placeholder { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
      .tile .badge { position: absolute; top: 8px; left: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.4); }
      .tile .badge:not(.ready) { background: rgba(0, 0, 0, 0.65); color: #fff; }
      .tile .name { padding: 8px 10px 2px; font-weight: 500; line-height: 1.25; }
      .tile .meta { padding: 0 10px 10px; font-size: 12px; color: var(--secondary-text-color); }
      .empty { margin: 16px 0 0; color: var(--secondary-text-color); }
    `,
    });

    this._input = el("textarea", { attrs: { rows: "1", placeholder: t.placeholder } });
    this._input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && !ev.shiftKey && URL_RE.test(this._input.value.trim())) {
        ev.preventDefault();
        this._add();
      }
    });
    this._addButton = el("button", { text: t.add });
    this._addButton.addEventListener("click", () => this._add());
    this._status = el("p", { cls: "status", attrs: { hidden: "" } });

    this._searchInput = el("input", { attrs: { type: "search", placeholder: t.search } });
    this._searchInput.addEventListener("input", () => {
      this._search = this._searchInput.value.trim().toLowerCase();
      this._renderGrid();
    });
    this._chips = el("div", { cls: "chips" });
    for (const [key, label] of [
      ["all", t.filterAll],
      ["ready", t.filterReady],
      ["shopping", t.filterShopping],
    ]) {
      const chip = el("button", { cls: "chip", text: label, attrs: { "data-filter": key } });
      chip.addEventListener("click", () => {
        this._filter = key;
        this._renderGrid();
      });
      this._chips.append(chip);
    }
    this._grid = el("div", { cls: "grid" });
    this._empty = el("p", { cls: "empty", attrs: { hidden: "" } });

    const card = el(
      "ha-card",
      {},
      el("h1", { text: this._config.title || t.title }),
      el("div", { cls: "add" }, this._input, this._addButton),
      this._status,
      el("div", { cls: "tools" }, this._searchInput, this._chips),
      this._grid,
      this._empty
    );
    this.shadowRoot.replaceChildren(style, card);
  }

  _setStatus(text, isError = false) {
    if (!this._status) return;
    this._status.textContent = text || "";
    this._status.classList.toggle("error", isError);
    this._status.toggleAttribute("hidden", !text);
  }

  async _add() {
    const value = this._input.value.trim();
    if (!value || !this._hass) return;
    const data = URL_RE.test(value) ? { url: value } : { text: value };
    this._addButton.disabled = true;
    this._input.disabled = true;
    this._setStatus(this._t.importing);
    try {
      const result = await this._hass.callWS({
        type: "call_service",
        domain: DOMAIN,
        service: "import_recipe",
        service_data: data,
        return_response: true,
      });
      this._input.value = "";
      this._setStatus(this._t.imported(result?.response?.title || ""));
    } catch (err) {
      this._setStatus(errorMessage(err), true);
    } finally {
      this._addButton.disabled = false;
      this._input.disabled = false;
    }
  }

  _renderGrid() {
    if (!this._grid) return;
    const t = this._t;
    const recipes = this._recipes || [];
    for (const chip of this._chips.children) {
      chip.classList.toggle("active", chip.dataset.filter === this._filter);
    }
    const shown = recipes.filter((r) => {
      if (this._filter !== "all" && r.status !== this._filter) return false;
      if (!this._search) return true;
      return (
        r.title.toLowerCase().includes(this._search) ||
        r.ingredients.some((i) => i.toLowerCase().includes(this._search))
      );
    });

    this._grid.replaceChildren(...shown.map((recipe) => this._tile(recipe)));
    let emptyText = "";
    if (this._recipes !== null) {
      if (recipes.length === 0) emptyText = t.empty;
      else if (shown.length === 0) emptyText = t.noMatch;
    }
    this._empty.textContent = emptyText;
    this._empty.toggleAttribute("hidden", !emptyText);
  }

  _tile(recipe) {
    const t = this._t;
    const tile = el("button", { cls: "tile", attrs: { type: "button" } });
    tile.append(recipeImage(recipe));
    if (recipe.status === "ready") tile.append(el("span", { cls: "badge ready", text: t.ready }));
    if (recipe.status === "shopping") tile.append(el("span", { cls: "badge", text: t.toBuy(recipe.to_buy) }));
    tile.append(
      el("span", { cls: "name", text: recipe.title }),
      el("span", { cls: "meta", text: recipe.servings || "" })
    );
    tile.addEventListener("click", () => this._open(recipe.uid));
    return tile;
  }

  _open(uid) {
    if (this._dialog) this._dialog.close();
    const dialog = document.createElement("food-planning-recipe-dialog");
    dialog.setup({
      hass: this._hass,
      t: this._t,
      uid,
      recipes: this._recipes || [],
      onClose: () => {
        if (this._dialog === dialog) this._dialog = null;
      },
    });
    this._dialog = dialog;
    document.body.append(dialog);
  }
}

function recipeImage(recipe, cls) {
  const src = safeUrl(recipe.image_url);
  const placeholder = () => el("div", { cls: `placeholder ${cls || ""}`, text: "🍽" });
  if (!src) return placeholder();
  const img = el("img", {
    cls: cls || "",
    attrs: { src, alt: "", loading: "lazy", referrerpolicy: "no-referrer" },
  });
  img.addEventListener("error", () => img.replaceWith(placeholder()), { once: true });
  return img;
}

/** Full-screen recipe view, appended to document.body so no card layout clips it. */
class FoodPlanningRecipeDialog extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._editing = false;
    this._confirmingDelete = false;
    this._onKey = (ev) => {
      if (ev.key === "Escape" && !this._editing) this.close();
    };
  }

  setup({ hass, t, uid, recipes, onClose }) {
    this._hass = hass;
    this._t = t;
    this._uid = uid;
    this._onClose = onClose;
    this.update(recipes);
  }

  connectedCallback() {
    document.addEventListener("keydown", this._onKey);
  }

  disconnectedCallback() {
    document.removeEventListener("keydown", this._onKey);
  }

  close() {
    this.remove();
    if (this._onClose) this._onClose();
  }

  update(recipes) {
    const recipe = recipes.find((r) => r.uid === this._uid);
    if (!recipe) {
      this.close();
      return;
    }
    this._recipe = recipe;
    // Don't throw away what the user is typing when data changes elsewhere.
    if (this._editing) return;
    const status = this._statusText;
    this._render();
    if (status) this._setStatus(status.text, status.isError);
  }

  _setStatus(text, isError = false) {
    this._statusText = text ? { text, isError } : null;
    if (!this._status) return;
    this._status.textContent = text || "";
    this._status.classList.toggle("error", isError);
    this._status.toggleAttribute("hidden", !text);
  }

  _style() {
    return el("style", {
      text:
        SHARED_CSS +
        `
      .backdrop {
        position: fixed; inset: 0; z-index: 9999; background: rgba(0, 0, 0, 0.55);
        display: flex; align-items: flex-start; justify-content: center;
        overflow-y: auto; padding: 24px 12px; box-sizing: border-box;
      }
      .panel {
        position: relative; width: 100%; max-width: 760px; overflow: hidden;
        background: var(--card-background-color, #fff); color: var(--primary-text-color);
        border-radius: var(--fp-radius); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
        font-family: var(--paper-font-body1_-_font-family, inherit);
      }
      .hero { width: 100%; max-height: 360px; aspect-ratio: 16 / 9; object-fit: cover; display: block; }
      .corner { position: absolute; top: 12px; right: 12px; display: flex; gap: 8px; }
      .corner button {
        width: 40px; height: 40px; padding: 0; border-radius: 50%;
        background: rgba(0, 0, 0, 0.55); color: #fff; font-size: 18px; line-height: 40px;
      }
      .content { padding: 20px 24px 24px; }
      h2 { margin: 0; font-size: 26px; line-height: 1.2; font-weight: 600; padding-right: 96px; }
      .hero + .corner + .content h2 { padding-right: 0; }
      .meta { margin: 6px 0 0; color: var(--secondary-text-color); font-size: 14px; }
      .meta a { color: var(--primary-color); }
      .state {
        display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
        margin-top: 14px; padding: 10px 14px; border-radius: 8px;
        background: var(--secondary-background-color);
      }
      .state.ready { background: rgba(67, 160, 71, 0.15); }
      .state span { flex: 1; }
      .columns {
        display: grid; gap: 24px; margin-top: 20px;
        grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
      }
      @media (max-width: 640px) { .columns { grid-template-columns: 1fr; } }
      h3 {
        margin: 0 0 8px; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase;
        color: var(--secondary-text-color); font-weight: 600;
      }
      ul.ingredients { list-style: none; margin: 0; padding: 0; }
      ul.ingredients li {
        padding: 7px 0; border-bottom: 1px solid var(--divider-color); cursor: pointer;
        line-height: 1.35;
      }
      ul.ingredients li.done { text-decoration: line-through; color: var(--secondary-text-color); }
      ol.steps { margin: 0; padding: 0; list-style: none; counter-reset: step; }
      ol.steps li {
        counter-increment: step; position: relative; padding: 0 0 14px 40px; line-height: 1.5;
      }
      ol.steps li::before {
        content: counter(step); position: absolute; left: 0; top: 0;
        width: 26px; height: 26px; border-radius: 50%; font-size: 13px; font-weight: 600;
        display: flex; align-items: center; justify-content: center;
        background: var(--primary-color); color: var(--text-primary-color, #fff);
      }
      .notes {
        margin-top: 8px; padding: 12px 14px; border-radius: 8px; line-height: 1.5;
        background: var(--secondary-background-color); white-space: pre-line;
      }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 24px; align-items: center; }
      .actions .spacer { flex: 1; }
      form label { display: block; margin-top: 14px; font-size: 13px; color: var(--secondary-text-color); }
      form label > input, form label > textarea { margin-top: 4px; }
      form textarea { resize: vertical; line-height: 1.45; }
      .row { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; }
      @media (max-width: 640px) { .row { grid-template-columns: 1fr; } }
    `,
    });
  }

  _render() {
    if (this._editing) this._renderEdit();
    else this._renderView();
  }

  _shell(...content) {
    const t = this._t;
    const corner = el("div", { cls: "corner" });
    if (!this._editing) {
      const editButton = el("button", { text: "✎", attrs: { "aria-label": t.edit, title: t.edit } });
      editButton.addEventListener("click", () => {
        this._editing = true;
        this._confirmingDelete = false;
        this._setStatus("");
        this._render();
      });
      corner.append(editButton);
    }
    const closeButton = el("button", { text: "✕", attrs: { "aria-label": t.close, title: t.close } });
    closeButton.addEventListener("click", () => this.close());
    corner.append(closeButton);

    const recipe = this._recipe;
    const hasImage = Boolean(safeUrl(recipe.image_url));
    const panel = el(
      "div",
      { cls: "panel", attrs: { role: "dialog", "aria-modal": "true", "aria-label": recipe.title } },
      hasImage ? recipeImage(recipe, "hero") : null,
      corner,
      el("div", { cls: "content" }, ...content)
    );
    const backdrop = el("div", { cls: "backdrop" }, panel);
    backdrop.addEventListener("click", (ev) => {
      if (ev.target === backdrop && !this._editing) this.close();
    });
    this.shadowRoot.replaceChildren(this._style(), backdrop);
  }

  _renderView() {
    const t = this._t;
    const recipe = this._recipe;

    const meta = el("p", { cls: "meta" });
    const metaParts = [];
    if (recipe.servings) metaParts.push(document.createTextNode(recipe.servings));
    const source = safeUrl(recipe.source_url);
    if (source) {
      metaParts.push(
        el("a", {
          text: `${t.source}: ${hostOf(source)}`,
          attrs: { href: source, target: "_blank", rel: "noopener noreferrer" },
        })
      );
    }
    metaParts.forEach((part, i) => {
      if (i) meta.append(document.createTextNode(" · "));
      meta.append(part);
    });

    let state = null;
    if (recipe.status === "ready") {
      const cookedButton = el("button", { text: `✓ ${t.cooked}` });
      cookedButton.addEventListener("click", () => this._markCooked(cookedButton));
      state = el("div", { cls: "state ready" }, el("span", { text: t.readyLong }), cookedButton);
    } else if (recipe.status === "shopping") {
      state = el("div", { cls: "state" }, el("span", { text: t.toBuy(recipe.to_buy) }));
    }

    const ingredients = el("ul", { cls: "ingredients" });
    for (const text of recipe.ingredients) {
      const li = el("li", { text });
      // Tick off ingredients while cooking; only kept until the view closes.
      li.addEventListener("click", () => li.classList.toggle("done"));
      ingredients.append(li);
    }
    const left = el("section", {}, el("h3", { text: t.ingredients }), ingredients);
    const right = el("section", {});
    if (recipe.steps.length) {
      right.append(
        el("h3", { text: t.steps }),
        el("ol", { cls: "steps" }, ...recipe.steps.map((s) => el("li", { text: s })))
      );
    }
    if (recipe.notes) {
      right.append(el("h3", { text: t.notes }), el("div", { cls: "notes", text: recipe.notes }));
    }

    const addButton = el("button", { text: `🛒 ${t.addToList}` });
    addButton.addEventListener("click", () => this._addToList(addButton));
    const actions = el("div", { cls: "actions" }, addButton, el("span", { cls: "spacer" }));
    if (this._confirmingDelete) {
      const cancel = el("button", { cls: "secondary", text: t.cancel });
      cancel.addEventListener("click", () => {
        this._confirmingDelete = false;
        this._render();
      });
      const confirm = el("button", { cls: "danger", text: t.confirmRemove });
      confirm.addEventListener("click", () => this._remove(confirm));
      actions.append(cancel, confirm);
    } else {
      const remove = el("button", { cls: "danger-outline", text: t.remove });
      remove.addEventListener("click", () => {
        this._confirmingDelete = true;
        this._render();
      });
      actions.append(remove);
    }
    this._status = el("p", { cls: "status", attrs: { hidden: "" } });

    this._shell(
      el("h2", { text: recipe.title }),
      meta,
      state,
      el("div", { cls: "columns" }, left, right),
      actions,
      this._status
    );
  }

  _renderEdit() {
    const t = this._t;
    const recipe = this._recipe;
    const field = (label, control) => el("label", { text: label }, control);
    const input = (value) => {
      const node = el("input", { attrs: { type: "text" } });
      node.value = value || "";
      return node;
    };
    const area = (value, rows) => {
      const node = el("textarea", { attrs: { rows: String(rows) } });
      node.value = value || "";
      return node;
    };

    const title = input(recipe.title);
    const servings = input(recipe.servings);
    const ingredients = area(recipe.ingredients.join("\n"), Math.min(14, recipe.ingredients.length + 2));
    const steps = area(recipe.steps.join("\n"), Math.min(14, recipe.steps.length + 3));
    const notes = area(recipe.notes, 3);
    const source = input(recipe.source_url);

    const save = el("button", { text: t.save, attrs: { type: "submit" } });
    const cancel = el("button", { cls: "secondary", text: t.cancel, attrs: { type: "button" } });
    cancel.addEventListener("click", () => {
      this._editing = false;
      this._setStatus("");
      this._render();
    });
    this._status = el("p", { cls: "status", attrs: { hidden: "" } });

    const form = el(
      "form",
      {},
      el("div", { cls: "row" }, field(t.fieldTitle, title), field(t.fieldServings, servings)),
      field(t.fieldIngredients, ingredients),
      field(t.fieldSteps, steps),
      field(t.fieldNotes, notes),
      field(t.fieldSource, source),
      el("div", { cls: "actions" }, save, cancel),
      this._status
    );
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (!title.value.trim()) {
        this._setStatus(t.titleRequired, true);
        return;
      }
      save.disabled = true;
      try {
        await this._hass.callWS({
          type: `${DOMAIN}/recipes/update`,
          uid: this._uid,
          title: title.value.trim(),
          servings: servings.value.trim() || null,
          ingredients: lines(ingredients.value),
          steps: lines(steps.value),
          notes: notes.value.trim() || null,
          source_url: source.value.trim() || null,
        });
        this._editing = false;
        this._setStatus("");
        this._render();
      } catch (err) {
        this._setStatus(errorMessage(err), true);
        save.disabled = false;
      }
    });

    this._shell(el("h2", { text: t.edit }), form);
    title.focus();
  }

  async _addToList(button) {
    button.disabled = true;
    try {
      const result = await this._hass.callWS({
        type: "call_service",
        domain: DOMAIN,
        service: "add_recipe_to_shopping_list",
        service_data: { recipe: this._uid },
        return_response: true,
      });
      this._setStatus(this._t.added(result?.response?.added ?? 0));
    } catch (err) {
      this._setStatus(errorMessage(err), true);
    } finally {
      button.disabled = false;
    }
  }

  async _markCooked(button) {
    button.disabled = true;
    try {
      await this._hass.callWS({ type: `${DOMAIN}/recipes/cooked`, uid: this._uid });
      this._setStatus(this._t.cookedDone);
    } catch (err) {
      this._setStatus(errorMessage(err), true);
      button.disabled = false;
    }
  }

  async _remove(button) {
    button.disabled = true;
    try {
      await this._hass.callWS({ type: `${DOMAIN}/recipes/delete`, uid: this._uid });
      this.close();
    } catch (err) {
      this._setStatus(errorMessage(err), true);
      button.disabled = false;
    }
  }
}

if (!customElements.get("food-planning-recipe-dialog")) {
  customElements.define("food-planning-recipe-dialog", FoodPlanningRecipeDialog);
}
if (!customElements.get("food-planning-card")) {
  customElements.define("food-planning-card", FoodPlanningCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "food-planning-card",
    name: "Food Planning",
    description: "Recipes from the Food Planning integration.",
  });
}
