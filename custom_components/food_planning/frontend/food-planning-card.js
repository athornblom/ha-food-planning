/*
 * Food Planning recipe card.
 *
 * Served by the food_planning integration and loaded on every dashboard.
 * Usage:  type: custom:food-planning-card
 * Options: title (string), language ("sv" | "en", default "sv").
 *
 * Recipe text comes from web pages, so it is only ever inserted as text
 * (textContent), never as HTML, and links/images are limited to http(s)
 * and the integration's own image path.
 */

const STRINGS = {
  sv: {
    title: "Recept",
    placeholder: "Klistra in en länk eller recepttext…",
    add: "Lägg till",
    importing: "Hämtar recept… det tar några sekunder.",
    imported: (title) => `”${title}” har lagts till.`,
    empty: "Inga recept än. Klistra in en länk eller en recepttext ovan.",
    search: "Sök recept",
    noMatch: "Inga recept matchar sökningen.",
    ingredients: "Ingredienser",
    steps: "Gör så här",
    notes: "Tips",
    addToList: "Lägg i inköpslistan",
    added: (n) =>
      n === 0
        ? "Allt fanns redan på inköpslistan."
        : `${n} ${n === 1 ? "ingrediens" : "ingredienser"} lades till i inköpslistan.`,
    remove: "Ta bort",
    confirmRemove: (title) => `Ta bort ”${title}”?`,
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
    search: "Search recipes",
    noMatch: "No recipes match the search.",
    ingredients: "Ingredients",
    steps: "Steps",
    notes: "Tips",
    addToList: "Add to shopping list",
    added: (n) =>
      n === 0
        ? "Everything was already on the shopping list."
        : `${n} ${n === 1 ? "ingredient" : "ingredients"} added to the shopping list.`,
    remove: "Delete",
    confirmRemove: (title) => `Delete “${title}”?`,
    source: "Source",
    close: "Close",
    notLoaded: "Food Planning is not loaded.",
  },
};

const DOMAIN = "food_planning";
const URL_RE = /^https?:\/\/\S+$/;
const SEARCH_FROM = 7; // show the search field once there are this many recipes

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

const SHARED_CSS = `
  :host { --fp-radius: var(--ha-card-border-radius, 12px); }
  button {
    font: inherit; cursor: pointer; border: none; border-radius: 999px;
    padding: 8px 16px; background: var(--primary-color); color: var(--text-primary-color, #fff);
  }
  button.secondary {
    background: transparent; color: var(--primary-text-color);
    border: 1px solid var(--divider-color);
  }
  button:disabled { opacity: 0.5; cursor: default; }
  .placeholder {
    display: flex; align-items: center; justify-content: center;
    background: var(--secondary-background-color); color: var(--secondary-text-color);
    font-size: 40px;
  }
  .status { font-size: 14px; color: var(--secondary-text-color); margin: 8px 0 0; }
  .status.error { color: var(--error-color, #db4437); }
`;

class FoodPlanningCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._recipes = null;
    this._filter = "";
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
      textarea {
        flex: 1; min-height: 40px; max-height: 200px; resize: vertical; box-sizing: border-box;
        font: inherit; padding: 9px 12px; border-radius: 8px;
        border: 1px solid var(--divider-color); background: var(--card-background-color);
        color: var(--primary-text-color);
      }
      input[type=search] {
        width: 100%; box-sizing: border-box; margin-top: 12px; font: inherit; padding: 8px 12px;
        border-radius: 8px; border: 1px solid var(--divider-color);
        background: var(--card-background-color); color: var(--primary-text-color);
      }
      .grid {
        display: grid; gap: 12px; margin-top: 16px;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      }
      .tile {
        all: unset; cursor: pointer; display: flex; flex-direction: column; overflow: hidden;
        border-radius: var(--fp-radius); background: var(--secondary-background-color);
        box-shadow: var(--ha-card-box-shadow, none); transition: transform 0.15s;
      }
      .tile:hover, .tile:focus-visible { transform: translateY(-2px); }
      .tile:focus-visible { outline: 2px solid var(--primary-color); }
      .tile img, .tile .placeholder { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
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

    this._search = el("input", {
      attrs: { type: "search", placeholder: t.search, hidden: "" },
    });
    this._search.addEventListener("input", () => {
      this._filter = this._search.value.trim().toLowerCase();
      this._renderGrid();
    });
    this._grid = el("div", { cls: "grid" });
    this._empty = el("p", { cls: "empty", attrs: { hidden: "" } });

    const card = el(
      "ha-card",
      {},
      el("h1", { text: this._config.title || t.title }),
      el("div", { cls: "add" }, this._input, this._addButton),
      this._status,
      this._search,
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
    this._search.toggleAttribute("hidden", recipes.length < SEARCH_FROM);
    const shown = this._filter
      ? recipes.filter(
          (r) =>
            r.title.toLowerCase().includes(this._filter) ||
            r.ingredients.some((i) => i.toLowerCase().includes(this._filter))
        )
      : recipes;

    this._grid.replaceChildren(...shown.map((recipe) => this._tile(recipe)));
    const emptyText =
      this._recipes === null ? "" : recipes.length === 0 ? t.empty : shown.length === 0 ? t.noMatch : "";
    this._empty.textContent = emptyText;
    this._empty.toggleAttribute("hidden", !emptyText);
  }

  _tile(recipe) {
    const tile = el("button", { cls: "tile", attrs: { type: "button" } });
    tile.append(
      recipeImage(recipe),
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
    this._onKey = (ev) => {
      if (ev.key === "Escape") this.close();
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
    this._closeButton?.focus();
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
    // Keep a status message across re-renders triggered by data updates.
    const status = this._statusText;
    this._render(recipe);
    if (status) this._setStatus(status.text, status.isError);
  }

  _setStatus(text, isError = false) {
    this._statusText = text ? { text, isError } : null;
    this._status.textContent = text || "";
    this._status.classList.toggle("error", isError);
    this._status.toggleAttribute("hidden", !text);
  }

  _render(recipe) {
    const t = this._t;
    const style = el("style", {
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
      .close {
        position: absolute; top: 12px; right: 12px; width: 40px; height: 40px; padding: 0;
        border-radius: 50%; background: rgba(0, 0, 0, 0.55); color: #fff; font-size: 20px;
      }
      .content { padding: 20px 24px 24px; }
      h2 { margin: 0; font-size: 26px; line-height: 1.2; font-weight: 600; }
      .meta { margin: 6px 0 0; color: var(--secondary-text-color); font-size: 14px; }
      .meta a { color: var(--primary-color); }
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
      .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 24px; }
      .actions .spacer { flex: 1; }
    `,
    });

    const hero = recipeImage(recipe, "hero");
    this._closeButton = el("button", { cls: "close", text: "✕", attrs: { "aria-label": t.close } });
    this._closeButton.addEventListener("click", () => this.close());

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

    const ingredients = el("ul", { cls: "ingredients" });
    for (const text of recipe.ingredients) {
      const li = el("li", { text });
      // Tick off ingredients while cooking; only kept until the view closes.
      li.addEventListener("click", () => li.classList.toggle("done"));
      ingredients.append(li);
    }
    const steps = el("ol", { cls: "steps" }, ...recipe.steps.map((s) => el("li", { text: s })));

    const left = el("section", {}, el("h3", { text: t.ingredients }), ingredients);
    const right = el("section", {});
    if (recipe.steps.length) right.append(el("h3", { text: t.steps }), steps);
    if (recipe.notes) right.append(el("h3", { text: t.notes }), el("div", { cls: "notes", text: recipe.notes }));

    const addButton = el("button", { text: `🛒 ${t.addToList}` });
    addButton.addEventListener("click", () => this._addToList(addButton));
    const removeButton = el("button", { cls: "secondary", text: t.remove });
    removeButton.addEventListener("click", () => this._remove(recipe));
    this._status = el("p", { cls: "status", attrs: { hidden: "" } });

    const panel = el(
      "div",
      { cls: "panel", attrs: { role: "dialog", "aria-modal": "true", "aria-label": recipe.title } },
      hero,
      this._closeButton,
      el(
        "div",
        { cls: "content" },
        el("h2", { text: recipe.title }),
        meta,
        el("div", { cls: "columns" }, left, right),
        el("div", { cls: "actions" }, addButton, el("span", { cls: "spacer" }), removeButton),
        this._status
      )
    );
    const backdrop = el("div", { cls: "backdrop" }, panel);
    backdrop.addEventListener("click", (ev) => {
      if (ev.target === backdrop) this.close();
    });
    this.shadowRoot.replaceChildren(style, backdrop);
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

  async _remove(recipe) {
    if (!window.confirm(this._t.confirmRemove(recipe.title))) return;
    try {
      await this._hass.callWS({ type: `${DOMAIN}/recipes/delete`, uid: recipe.uid });
      this.close();
    } catch (err) {
      this._setStatus(errorMessage(err), true);
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
