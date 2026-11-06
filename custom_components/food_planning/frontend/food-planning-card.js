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
    filterMissing: "Saknar något",
    allCategories: "Alla kategorier",
    fieldCategories: "Kategorier",
    categoriesHint: "Kategorierna hanteras under Inställningar → Enheter och tjänster → Food Planning → Konfigurera.",
    missingBadge: (n) => `Saknar ${n}`,
    notAtHome: "saknas hemma",
    ready: "✓ Redo att laga",
    readyLong: "Allt finns hemma. Dags att laga!",
    missingLong: (items) => `Saknas hemma: ${items.join(", ")}`,
    onList: (n) => `🛒 ${n} ${n === 1 ? "vara" : "varor"} på inköpslistan`,
    addMissing: (n) => `Lägg saknade i inköpslistan (${n})`,
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
    filterMissing: "Missing something",
    allCategories: "All categories",
    fieldCategories: "Categories",
    categoriesHint: "Manage categories under Settings → Devices & services → Food Planning → Configure.",
    missingBadge: (n) => `Missing ${n}`,
    notAtHome: "not at home",
    ready: "✓ Ready to cook",
    readyLong: "Everything is at home. Time to cook!",
    missingLong: (items) => `Not at home: ${items.join(", ")}`,
    onList: (n) => `🛒 ${n} ${n === 1 ? "item" : "items"} on the shopping list`,
    addMissing: (n) => `Add missing to shopping list (${n})`,
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
    this._category = null;
    this._categories = [];
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
          this._categories = msg.categories || [];
          if (this._category && !this._categories.includes(this._category)) this._category = null;
          this._renderCategoryChips();
          this._renderGrid();
          if (this._dialog) this._dialog.update(this._recipes, this._categories);
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
      .categories { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
      .categories:empty { display: none; }
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
      ["missing", t.filterMissing],
    ]) {
      const chip = el("button", { cls: "chip", text: label, attrs: { "data-filter": key } });
      chip.addEventListener("click", () => {
        this._filter = key;
        this._renderGrid();
      });
      this._chips.append(chip);
    }
    this._categoryChips = el("div", { cls: "categories" });
    this._grid = el("div", { cls: "grid" });
    this._empty = el("p", { cls: "empty", attrs: { hidden: "" } });

    const card = el(
      "ha-card",
      {},
      el("h1", { text: this._config.title || t.title }),
      el("div", { cls: "add" }, this._input, this._addButton),
      this._status,
      el("div", { cls: "tools" }, this._searchInput, this._chips),
      this._categoryChips,
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

  _renderCategoryChips() {
    if (!this._categoryChips) return;
    const used = new Set((this._recipes || []).flatMap((r) => r.categories || []));
    const shown = this._categories.filter((c) => used.has(c));
    if (!shown.length) {
      this._categoryChips.replaceChildren();
      return;
    }
    const chip = (label, value) => {
      const node = el("button", { cls: "chip", text: label });
      node.classList.toggle("active", this._category === value);
      node.addEventListener("click", () => {
        this._category = value;
        this._renderCategoryChips();
        this._renderGrid();
      });
      return node;
    };
    this._categoryChips.replaceChildren(
      chip(this._t.allCategories, null),
      ...shown.map((c) => chip(c, c))
    );
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
      if (this._category && !(r.categories || []).includes(this._category)) return false;
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
    if (recipe.status === "missing") tile.append(el("span", { cls: "badge", text: t.missingBadge(recipe.missing.length) }));
    tile.append(
      el("span", { cls: "name", text: recipe.title }),
      el("span", {
        cls: "meta",
        text: [recipe.servings, ...(recipe.categories || [])].filter(Boolean).join(" · "),
      })
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
      categories: this._categories,
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

  setup({ hass, t, uid, recipes, categories, onClose }) {
    this._hass = hass;
    this._t = t;
    this._uid = uid;
    this._onClose = onClose;
    this.update(recipes, categories);
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

  update(recipes, categories) {
    if (categories) this._categories = categories;
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
      ul.ingredients li.missing::after {
        content: attr(data-note); color: var(--warning-color, #ffa600); font-size: 12px;
      }
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
      .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
      .pick { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
      .pick button {
        padding: 6px 12px; font-size: 13px; background: transparent;
        color: var(--primary-text-color); border: 1px solid var(--divider-color);
      }
      .pick button.on { background: var(--primary-color); color: var(--text-primary-color, #fff); border-color: transparent; }
      .hint { font-size: 12px; color: var(--secondary-text-color); margin: 6px 0 0; }
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
    const stateLines = [];
    if (recipe.status === "ready") stateLines.push(t.readyLong);
    if (recipe.status === "missing") stateLines.push(t.missingLong(recipe.missing));
    if (recipe.on_list) stateLines.push(t.onList(recipe.on_list));
    if (stateLines.length) {
      state = el(
        "div",
        { cls: `state ${recipe.status === "ready" ? "ready" : ""}` },
        el("span", {}, ...stateLines.map((line) => el("div", { text: line })))
      );
    }
    const missingSet = new Set(recipe.missing || []);

    const ingredients = el("ul", { cls: "ingredients" });
    for (const text of recipe.ingredients) {
      const li = el("li", { cls: missingSet.has(text) ? "missing" : "", text });
      if (missingSet.has(text)) li.dataset.note = ` · ${t.notAtHome}`;
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

    const onlyMissing = recipe.status === "missing";
    const addButton = el("button", {
      text: `🛒 ${onlyMissing ? t.addMissing(recipe.missing.length) : t.addToList}`,
    });
    addButton.addEventListener("click", () => this._addToList(addButton, onlyMissing));
    const cookedButton = el("button", { cls: "secondary", text: `✓ ${t.cooked}` });
    cookedButton.addEventListener("click", () => this._markCooked(cookedButton));
    const actions = el(
      "div",
      { cls: "actions" },
      addButton,
      cookedButton,
      el("span", { cls: "spacer" })
    );
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

    const tags = (recipe.categories || []).length
      ? el("div", { cls: "tags" }, ...recipe.categories.map((c) => el("span", { cls: "badge", text: c })))
      : null;

    this._shell(
      el("h2", { text: recipe.title }),
      meta,
      tags,
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
    const selected = new Set(recipe.categories || []);
    const picker = el("div", { cls: "pick" });
    for (const name of this._categories || []) {
      const b = el("button", { text: name, attrs: { type: "button" } });
      b.classList.toggle("on", selected.has(name));
      b.addEventListener("click", () => {
        if (selected.has(name)) selected.delete(name);
        else selected.add(name);
        b.classList.toggle("on", selected.has(name));
      });
      picker.append(b);
    }
    const categoriesField = el(
      "div",
      {},
      el("label", { text: t.fieldCategories }),
      picker,
      el("p", { cls: "hint", text: t.categoriesHint })
    );

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
      categoriesField,
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
          categories: (this._categories || []).filter((c) => selected.has(c)),
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

  async _addToList(button, onlyMissing = false) {
    button.disabled = true;
    try {
      const result = await this._hass.callWS({
        type: "call_service",
        domain: DOMAIN,
        service: "add_recipe_to_shopping_list",
        service_data: { recipe: this._uid, only_missing: onlyMissing },
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

/* ------------------------------------------------------------------ */
/* Navigation between the dashboard's views                            */
/* ------------------------------------------------------------------ */

const NAV_STRINGS = {
  sv: { shopping: "Inköpslista", pantry: "Hemma", recipes: "Recept" },
  en: { shopping: "Shopping list", pantry: "At home", recipes: "Recipes" },
};
const NAV_ITEMS = [
  { key: "shopping", path: "inkopslista", icon: "🛒" },
  { key: "pantry", path: "hemma", icon: "🏠" },
  { key: "recipes", path: "recept", icon: "📖" },
];

/**
 * Tabs for the Food Planning views. Switching replaces the history entry,
 * so the view's back arrow leaves the dashboard instead of going back
 * through the tabs.
 */
class FoodPlanningNav extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  setConfig(config) {
    this._config = config || {};
    this._t = NAV_STRINGS[this._config.language] || NAV_STRINGS.sv;
    this._render();
  }

  set hass(_hass) {}

  getCardSize() {
    return 1;
  }

  getGridOptions() {
    return { columns: "full", rows: 1 };
  }

  _render() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    const current = parts[parts.length - 1];
    const base = "/" + parts.slice(0, -1).join("/");
    const nav = el("nav", { attrs: { role: "tablist" } });
    for (const item of NAV_ITEMS) {
      const active = item.path === (this._config.active || current);
      const tab = el("button", {
        cls: active ? "active" : "",
        attrs: { role: "tab", "aria-selected": String(active) },
      }, el("span", { cls: "icon", text: item.icon }), el("span", { text: this._t[item.key] }));
      tab.addEventListener("click", () => {
        if (active) return;
        window.history.replaceState(window.history.state, "", `${base}/${item.path}`);
        window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: true } }));
      });
      nav.append(tab);
    }
    const style = el("style", {
      text: `
      nav {
        display: flex; gap: 4px; padding: 4px; border-radius: 999px;
        background: var(--card-background-color); box-shadow: var(--ha-card-box-shadow, none);
        border: 1px solid var(--divider-color);
      }
      button {
        flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
        font: inherit; font-weight: 500; cursor: pointer; border: none; border-radius: 999px;
        padding: 10px 12px; background: transparent; color: var(--primary-text-color);
      }
      button.active { background: var(--primary-color); color: var(--text-primary-color, #fff); }
      @media (max-width: 420px) { .icon { display: none; } }
    `,
    });
    this.shadowRoot.replaceChildren(style, nav);
  }
}

/* ------------------------------------------------------------------ */
/* Shopping list / At home list card                                   */
/* ------------------------------------------------------------------ */

const LIST_STRINGS = {
  sv: {
    shopping: {
      title: "Inköpslista", open: "Att köpa", done: "I korgen",
      empty: "Inköpslistan är tom.", add: "Lägg till vara…",
      move: (n) => `🏠 Flytta till Hemma (${n})`, clear: "Rensa korgen",
      moved: (n) => `${n} ${n === 1 ? "vara" : "varor"} flyttades till Hemma.`,
    },
    pantry: {
      title: "Hemma", open: "Finns hemma", done: "Slut",
      empty: "Inget registrerat hemma än.", add: "Lägg till något som finns hemma…",
      clear: "Rensa det som är slut",
    },
    edit: "Ändra", remove: "Ta bort", save: "Spara", cancel: "Avbryt",
    showDone: (n) => `Visa (${n})`, hideDone: "Dölj",
    merging: "Dubbletter slås ihop automatiskt.",
  },
  en: {
    shopping: {
      title: "Shopping list", open: "To buy", done: "In the basket",
      empty: "The shopping list is empty.", add: "Add an item…",
      move: (n) => `🏠 Move home (${n})`, clear: "Clear basket",
      moved: (n) => `${n} ${n === 1 ? "item" : "items"} moved to At home.`,
    },
    pantry: {
      title: "At home", open: "At home", done: "Used up",
      empty: "Nothing at home yet.", add: "Add something you have…",
      clear: "Clear used up",
    },
    edit: "Edit", remove: "Delete", save: "Save", cancel: "Cancel",
    showDone: (n) => `Show (${n})`, hideDone: "Hide",
    merging: "Duplicates are merged automatically.",
  },
};

/**
 * A food list (shopping list or At home) on top of the integration's to-do
 * entity. Uses Home Assistant's to-do API, so it stays in sync with Assist,
 * the companion app and the AI merging.
 *
 *   type: custom:food-planning-list-card
 *   list: shopping | pantry
 */
class FoodPlanningListCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._items = null;
    this._editing = null;
    this._showDone = false;
    this._unsub = null;
    this._subscribedTo = null;
  }

  setConfig(config) {
    if (!config || !["shopping", "pantry"].includes(config.list)) {
      throw new Error("list must be 'shopping' or 'pantry'");
    }
    this._config = config;
    const strings = LIST_STRINGS[config.language] || LIST_STRINGS.sv;
    this._t = { ...strings, ...strings[config.list] };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    const entity =
      this._config.entity ||
      findListEntity(
        hass,
        this._config.list === "shopping" ? "shopping_list" : "pantry",
        this._config.list === "shopping" ? "todo.food_planning_shopping_list" : "todo.food_planning_pantry"
      );
    if (entity !== this._entity) {
      this._entity = entity;
      this._subscribe();
    }
  }

  connectedCallback() {
    if (this._hass && !this._unsub) this._subscribe();
  }

  disconnectedCallback() {
    this._unsubscribe();
  }

  getCardSize() {
    return 6;
  }

  getGridOptions() {
    return { columns: "full", min_rows: 4 };
  }

  _unsubscribe() {
    if (this._unsub) {
      const unsub = this._unsub;
      this._unsub = null;
      unsub.then((fn) => fn()).catch(() => {});
    }
  }

  _subscribe() {
    if (!this._hass || !this._entity || !this.isConnected) return;
    this._unsubscribe();
    this._unsub = this._hass.connection.subscribeMessage(
      (msg) => {
        this._items = msg.items || [];
        this._render();
      },
      { type: "todo/item/subscribe", entity_id: this._entity }
    );
    this._unsub.catch((err) => this._setStatus(errorMessage(err), true));
  }

  async _call(service, data) {
    try {
      return await this._hass.callWS({
        type: "call_service",
        domain: "todo",
        service,
        service_data: data,
        target: { entity_id: this._entity },
      });
    } catch (err) {
      this._setStatus(errorMessage(err), true);
      return null;
    }
  }

  _setStatus(text, isError = false) {
    this._statusText = text ? { text, isError } : null;
    if (!this._status) return;
    this._status.textContent = text || "";
    this._status.classList.toggle("error", isError);
    this._status.toggleAttribute("hidden", !text);
  }

  _render() {
    if (!this._config) return;
    const t = this._t;
    const items = this._items || [];
    const open = items.filter((i) => i.status !== "completed");
    const done = items.filter((i) => i.status === "completed");

    const style = el("style", {
      text:
        SHARED_CSS +
        `
      ha-card { padding: 16px; }
      h1 { margin: 0 0 12px; font-size: 20px; font-weight: 500; }
      form.add { display: flex; gap: 8px; }
      form.add input { flex: 1; }
      .toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
      h2 {
        display: flex; align-items: center; justify-content: space-between;
        margin: 20px 0 4px; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase;
        color: var(--secondary-text-color); font-weight: 600;
      }
      h2 button { padding: 2px 10px; font-size: 12px; text-transform: none; letter-spacing: 0; }
      ul { list-style: none; margin: 0; padding: 0; }
      li {
        display: flex; align-items: center; gap: 10px; padding: 6px 0;
        border-bottom: 1px solid var(--divider-color);
      }
      li input[type=checkbox] { width: 20px; height: 20px; flex: none; accent-color: var(--primary-color); cursor: pointer; }
      .text { flex: 1; min-width: 0; cursor: text; }
      .summary { line-height: 1.35; overflow-wrap: anywhere; }
      .done .summary { text-decoration: line-through; color: var(--secondary-text-color); }
      .desc { font-size: 12px; color: var(--secondary-text-color); margin-top: 2px; }
      .icon-button {
        flex: none; width: 32px; height: 32px; padding: 0; border-radius: 50%;
        background: transparent; color: var(--secondary-text-color); font-size: 15px;
      }
      .icon-button:hover { background: var(--secondary-background-color); color: var(--fp-danger); }
      li.editing { flex-wrap: wrap; }
      li.editing input[type=text] { flex: 1 1 200px; }
      .empty { color: var(--secondary-text-color); margin: 16px 0 4px; }
      .note { font-size: 12px; color: var(--secondary-text-color); margin: 12px 0 0; }
    `,
    });

    const addInput = el("input", { attrs: { type: "text", placeholder: t.add } });
    const addForm = el("form", { cls: "add" }, addInput, el("button", { text: "+", attrs: { type: "submit", "aria-label": t.add } }));
    addForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const value = addInput.value.trim();
      if (!value) return;
      addInput.value = "";
      await this._call("add_item", { item: value });
      this.shadowRoot.querySelector("form.add input")?.focus();
    });

    const toolbar = el("div", { cls: "toolbar" });
    if (this._config.list === "shopping" && done.length) {
      const move = el("button", { text: t.move(done.length) });
      move.addEventListener("click", async () => {
        move.disabled = true;
        try {
          const result = await this._hass.callWS({
            type: "call_service",
            domain: DOMAIN,
            service: "move_bought_to_pantry",
            service_data: {},
            return_response: true,
          });
          this._setStatus(t.moved(result?.response?.moved ?? done.length));
        } catch (err) {
          this._setStatus(errorMessage(err), true);
          move.disabled = false;
        }
      });
      toolbar.append(move);
    }
    if (done.length) {
      const clear = el("button", { cls: "secondary", text: t.clear });
      clear.addEventListener("click", () => this._call("remove_completed_items", {}));
      toolbar.append(clear);
    }
    this._status = el("p", { cls: "status", attrs: { hidden: "" } });

    const content = [];
    if (this._items !== null && !items.length) content.push(el("p", { cls: "empty", text: t.empty }));
    if (open.length) {
      content.push(el("h2", {}, el("span", { text: `${t.open} (${open.length})` })));
      content.push(el("ul", {}, ...open.map((item) => this._row(item))));
    }
    if (done.length) {
      const toggle = el("button", { cls: "secondary", text: this._showDone ? t.hideDone : t.showDone(done.length) });
      toggle.addEventListener("click", () => {
        this._showDone = !this._showDone;
        this._render();
      });
      content.push(el("h2", {}, el("span", { text: `${t.done} (${done.length})` }), toggle));
      if (this._showDone) content.push(el("ul", {}, ...done.map((item) => this._row(item))));
    }

    const card = el(
      "ha-card",
      {},
      this._config.title === false ? null : el("h1", { text: this._config.title || t.title }),
      addForm,
      toolbar.childElementCount ? toolbar : null,
      this._status,
      ...content,
      el("p", { cls: "note", text: t.merging })
    );
    const focused = this.shadowRoot.activeElement;
    const keepAdd = focused && focused.closest && focused.closest("form.add") ? this.shadowRoot.querySelector("form.add input")?.value : null;
    this.shadowRoot.replaceChildren(style, card);
    if (keepAdd !== null && keepAdd !== undefined) {
      addInput.value = keepAdd;
      addInput.focus();
    }
    if (this._statusText) this._setStatus(this._statusText.text, this._statusText.isError);
    this.shadowRoot.querySelector("li.editing input[type=text]")?.focus();
  }

  _row(item) {
    const t = this._t;
    const isDone = item.status === "completed";
    if (this._editing === item.uid) {
      const input = el("input", { attrs: { type: "text" } });
      input.value = item.summary;
      const save = el("button", { text: t.save, attrs: { type: "submit" } });
      const cancel = el("button", { cls: "secondary", text: t.cancel, attrs: { type: "button" } });
      const form = el("form", { cls: "edit-form" }, input, save, cancel);
      const li = el("li", { cls: "editing" }, form);
      form.style.cssText = "display:flex;gap:8px;flex:1;flex-wrap:wrap";
      const stop = () => {
        this._editing = null;
        this._render();
      };
      cancel.addEventListener("click", stop);
      input.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape") stop();
      });
      form.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const value = input.value.trim();
        this._editing = null;
        if (value && value !== item.summary) await this._call("update_item", { item: item.uid, rename: value });
        this._render();
      });
      return li;
    }

    const check = el("input", { attrs: { type: "checkbox", "aria-label": item.summary } });
    check.checked = isDone;
    check.addEventListener("change", () =>
      this._call("update_item", { item: item.uid, status: check.checked ? "completed" : "needs_action" })
    );
    const text = el(
      "div",
      { cls: "text", attrs: { title: t.edit } },
      el("div", { cls: "summary", text: item.summary }),
      item.description ? el("div", { cls: "desc", text: item.description }) : null
    );
    text.addEventListener("click", () => {
      this._editing = item.uid;
      this._render();
    });
    const remove = el("button", { cls: "icon-button", text: "✕", attrs: { "aria-label": t.remove, title: t.remove } });
    remove.addEventListener("click", () => this._call("remove_item", { item: [item.uid] }));
    return el("li", { cls: isDone ? "done" : "" }, check, text, remove);
  }
}

if (!customElements.get("food-planning-nav")) {
  customElements.define("food-planning-nav", FoodPlanningNav);
  customElements.define("food-planning-list-card", FoodPlanningListCard);
  window.customCards = window.customCards || [];
  window.customCards.push(
    { type: "food-planning-nav", name: "Food Planning navigation", description: "Tabs between the Food Planning views." },
    { type: "food-planning-list-card", name: "Food Planning list", description: "The shopping list or the At home list." }
  );
}

/*
 * Dashboard strategy: generates the whole Food Planning dashboard, so it
 * ships with (and is updated by) the integration.
 *
 *   strategy:
 *     type: custom:food-planning
 *     # language: sv     # sv (default) or en
 *
 * "Take control" in the dashboard menu turns it into an ordinary,
 * editable dashboard (which then no longer follows updates).
 */
const DASHBOARD_STRINGS = {
  sv: {
    shopping: "Inköpslista",
    pantry: "Hemma",
    recipes: "Recept",
    moveHome: "Flytta inhandlat till Hemma",
    moveHomeConfirm: "Flytta allt som är avbockat till Hemma?",
  },
  en: {
    shopping: "Shopping list",
    pantry: "At home",
    recipes: "Recipes",
    moveHome: "Move bought items home",
    moveHomeConfirm: "Move everything ticked off to At home?",
  },
};

/** Find one of the integration's to-do lists, by its translation key. */
function findListEntity(hass, key, fallback) {
  const entry = Object.values(hass?.entities || {}).find(
    (e) => e.platform === DOMAIN && e.translation_key === key
  );
  return entry ? entry.entity_id : fallback;
}

// HA finds a custom dashboard strategy by the element name
// ll-strategy-dashboard-<type> and calls its static generate(config, hass).
class FoodPlanningDashboardStrategy extends HTMLElement {
  static async generate(config, _hass) {
    const t = DASHBOARD_STRINGS[config?.language] || DASHBOARD_STRINGS.sv;
    const lang = config?.language ? { language: config.language } : {};
    // Subviews: the header shows a back arrow to wherever the dashboard was
    // opened from (or back_path), and the nav card switches between views.
    const view = (title, path, card) => ({
      title,
      path,
      subview: true,
      ...(config?.back_path ? { back_path: config.back_path } : {}),
      type: "sections",
      max_columns: 3,
      sections: [
        {
          type: "grid",
          column_span: 3,
          cards: [{ type: "custom:food-planning-nav", active: path, ...lang }, card],
        },
      ],
    });
    return {
      views: [
        view(t.shopping, "inkopslista", { type: "custom:food-planning-list-card", list: "shopping", ...lang }),
        view(t.pantry, "hemma", { type: "custom:food-planning-list-card", list: "pantry", ...lang }),
        view(t.recipes, "recept", { type: "custom:food-planning-card", title: t.recipes, ...lang }),
      ],
    };
  }
}

if (!customElements.get("ll-strategy-dashboard-food-planning")) {
  customElements.define("ll-strategy-dashboard-food-planning", FoodPlanningDashboardStrategy);
  window.customStrategies = window.customStrategies || [];
  window.customStrategies.push({
    type: "food-planning",
    strategyType: "dashboard",
    name: "Food Planning",
    description: "Shopping list, At home and recipes from the Food Planning integration.",
  });
}
