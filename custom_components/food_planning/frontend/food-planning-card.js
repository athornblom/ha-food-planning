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
    lang: "sv",
    title: "Recept",
    placeholder: "Klistra in en länk eller recepttext…",
    add: "Lägg till",
    importing: "Hämtar recept… det tar några sekunder.",
    imported: (title) => `”${title}” har lagts till.`,
    exists: (title) => `”${title}” finns redan bland recepten.`,
    adminOnly: "Bara administratörer kan ändra eller ta bort recept.",
    empty: "Inga recept än. Klistra in en länk eller en recepttext ovan.",
    search: "Sök recept eller ingrediens",
    noMatch: "Inga recept matchar.",
    filterAll: "Alla",
    filterReady: "Redo att laga",
    filterMissing: "Saknar något",
    filterQuick: "⚡ Max 30 min",
    allCategories: "Alla kategorier",
    fieldCategories: "Kategorier",
    categoriesHint: "Ändra själva listan med ✎ Kategorier ovanför recepten.",
    editCategories: "✎ Kategorier",
    catTitle: "Kategorier",
    catNew: "Ny kategori",
    catDescription: "Vad hör hit? T.ex. dipp, tapas, chips och annat att dela",
    catAdd: "Lägg till",
    catRemove: "Ta bort",
    catSave: "Spara",
    catSaveSort: "Spara och sortera om alla recept",
    catSortHint: "Beskrivningen talar om för AI:n vad som hör till kategorin. Sortera om låter AI:n välja kategorier på nytt för alla recept, även de du har satt själv.",
    catSaved: "Kategorierna är sparade.",
    catSorting: "Sorterar om recepten… det tar en stund.",
    catSorted: (n) => (n ? `Klart. ${n} ${n === 1 ? "recept" : "recept"} fick nya kategorier.` : "Klart. Inga recept behövde ändras."),
    missingBadge: (n) => `Saknar ${n}`,
    notAtHome: "saknas hemma",
    ready: "✓ Redo att laga",
    readyLong: "Allt finns hemma. Dags att laga!",
    missingLong: (items) => `Saknas hemma: ${items.join(", ")}`,
    onList: (n) => `🛒 ${n} ${n === 1 ? "vara" : "varor"} på inköpslistan`,
    addSelected: (n) => (n ? `Lägg valda i inköpslistan (${n})` : "Välj ingredienser att handla"),
    selectHint: "Bocka i det du vill handla. Det som saknas hemma är förvalt.",
    cooked: "Lagad",
    cookingMode: "🍳 Matlagningsläge",
    cookingOn: "🍳 Matlagningsläge på",
    cookingActive: "Skärmen hålls tänd medan receptet är öppet.",
    wakeNeedsHttps: "Matlagningsläget kräver att Home Assistant öppnas via https (t.ex. https://homeassistant.athornblom.se).",
    wakeUnsupported: "Den här webbläsaren kan inte hålla skärmen tänd.",
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
    fieldTime: "Tid (minuter)",
    fieldIngredients: "Ingredienser (en per rad)",
    fieldSteps: "Gör så här (ett steg per rad)",
    fieldNotes: "Tips",
    fieldSource: "Källa (länk)",
    titleRequired: "Receptet behöver ett namn.",
    source: "Källa",
    close: "Stäng",
    notLoaded: "Food Planning är inte laddad.",
    weekTitle: "Veckans middagar",
    weekProgress: (done, total, week) => `${done} av ${total} lagade · v${week}`,
    weekEmpty: "Inga förslag den här veckan än.",
    weekPlan: "Föreslå middagar",
    weekPlanning: "Tar fram förslag…",
    weekNew: "Ny plan",
    weekShop: (n) => (n ? `🛒 Handla till veckan · ${n} ${n === 1 ? "vara" : "varor"}` : "🛒 Allt till veckan finns"),
    weekShopped: (n) => (n ? `${n} ${n === 1 ? "vara" : "varor"} lades på inköpslistan.` : "Allt fanns redan på listan."),
    weekSwap: "Byt",
    weekRemove: "Ta bort för veckan",
    weekPin: "Behåll",
    weekUnpin: "Sluta behålla",
    weekCooked: "✓ lagad",
    weekAdded: "tillagd av dig",
    weekRolled: "från förra veckan",
    weekIdea: "💡 Ny idé",
    weekAdd: "＋ Lägg i veckan",
    weekIn: "✓ I veckans middagar",
    weekAddedToast: "Lagd i veckans middagar.",
    weekNoMore: "Inga fler recept att föreslå just nu. Recept som lagats de senaste två veckorna, kakor och liknande räknas inte. Lägg till fler recept så blir förslagen bättre.",
    weekPlanned: (n) => `${n} ${n === 1 ? "nytt förslag" : "nya förslag"}.`,
  },
  en: {
    lang: "en",
    title: "Recipes",
    placeholder: "Paste a link or recipe text…",
    add: "Add",
    importing: "Fetching the recipe… this takes a few seconds.",
    imported: (title) => `“${title}” was added.`,
    exists: (title) => `“${title}” is already in your recipes.`,
    adminOnly: "Only administrators can change or delete recipes.",
    empty: "No recipes yet. Paste a link or recipe text above.",
    search: "Search recipes or ingredients",
    noMatch: "No recipes match.",
    filterAll: "All",
    filterReady: "Ready to cook",
    filterMissing: "Missing something",
    filterQuick: "⚡ 30 min or less",
    allCategories: "All categories",
    fieldCategories: "Categories",
    categoriesHint: "Change the list itself with ✎ Categories above the recipes.",
    editCategories: "✎ Categories",
    catTitle: "Categories",
    catNew: "New category",
    catDescription: "What belongs here? E.g. dips, tapas, chips and other food to share",
    catAdd: "Add",
    catRemove: "Remove",
    catSave: "Save",
    catSaveSort: "Save and re-sort all recipes",
    catSortHint: "The description tells the AI what belongs in the category. Re-sort has the AI pick categories again for every recipe, including ones you set yourself.",
    catSaved: "Categories saved.",
    catSorting: "Re-sorting the recipes… this takes a moment.",
    catSorted: (n) => (n ? `Done. ${n} ${n === 1 ? "recipe" : "recipes"} got new categories.` : "Done. No recipes needed changing."),
    missingBadge: (n) => `Missing ${n}`,
    notAtHome: "not at home",
    ready: "✓ Ready to cook",
    readyLong: "Everything is at home. Time to cook!",
    missingLong: (items) => `Not at home: ${items.join(", ")}`,
    onList: (n) => `🛒 ${n} ${n === 1 ? "item" : "items"} on the shopping list`,
    addSelected: (n) => (n ? `Add selected to shopping list (${n})` : "Pick ingredients to buy"),
    selectHint: "Tick what you want to buy. What's missing at home is preselected.",
    cooked: "Cooked",
    cookingMode: "🍳 Cooking mode",
    cookingOn: "🍳 Cooking mode on",
    cookingActive: "The screen stays on while the recipe is open.",
    wakeNeedsHttps: "Cooking mode needs Home Assistant to be opened over https.",
    wakeUnsupported: "This browser can't keep the screen on.",
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
    fieldTime: "Time (minutes)",
    fieldIngredients: "Ingredients (one per line)",
    fieldSteps: "Steps (one per line)",
    fieldNotes: "Tips",
    fieldSource: "Source (link)",
    titleRequired: "The recipe needs a name.",
    source: "Source",
    close: "Close",
    notLoaded: "Food Planning is not loaded.",
    weekTitle: "This week's dinners",
    weekProgress: (done, total, week) => `${done} of ${total} cooked · week ${week}`,
    weekEmpty: "No suggestions this week yet.",
    weekPlan: "Suggest dinners",
    weekPlanning: "Picking dinners…",
    weekNew: "New plan",
    weekShop: (n) => (n ? `🛒 Shop for the week · ${n} ${n === 1 ? "item" : "items"}` : "🛒 Everything for the week is there"),
    weekShopped: (n) => (n ? `${n} ${n === 1 ? "item" : "items"} added to the shopping list.` : "Everything was already on the list."),
    weekSwap: "Swap",
    weekRemove: "Remove for this week",
    weekPin: "Keep",
    weekUnpin: "Stop keeping",
    weekCooked: "✓ cooked",
    weekAdded: "added by you",
    weekRolled: "from last week",
    weekIdea: "💡 New idea",
    weekAdd: "＋ Add to the week",
    weekIn: "✓ In this week's dinners",
    weekAddedToast: "Added to this week's dinners.",
    weekNoMore: "No more recipes to suggest right now. Recipes cooked in the last two weeks, cakes and the like don't count. Add more recipes for better suggestions.",
    weekPlanned: (n) => `${n} new ${n === 1 ? "suggestion" : "suggestions"}.`,
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

// Quick recipes: the "fast" filter shows these, quickest first.
const QUICK_MINUTES = 30;

// Icons for the default categories (and common ones users add); others get
// a dot. Matched case-insensitively.
const CATEGORY_ICONS = {
  frukost: "🥐", breakfast: "🥐",
  lunch: "🥪",
  middag: "🍽️", dinner: "🍽️",
  förrätt: "🥗", starter: "🥗",
  efterrätt: "🍰", dessert: "🍰", efterrätter: "🍰", desserts: "🍰",
  bakning: "🧁", baking: "🧁",
  mellanmål: "🍎", snack: "🍎",
  plockmat: "🫒", tilltugg: "🫒", snacks: "🫒", "finger food": "🫒", tapas: "🫒", appetizers: "🫒",
  vegetariskt: "🥦", vegetarian: "🥦", vegan: "🌱", veganskt: "🌱",
  snabbt: "⚡", quick: "⚡",
  soppa: "🍲", soup: "🍲",
  sallad: "🥗", salad: "🥗",
  fisk: "🐟", fish: "🐟", "fisk & skaldjur": "🐟", seafood: "🦐",
  kyckling: "🍗", chicken: "🍗",
  kött: "🥩", meat: "🥩",
  pasta: "🍝",
  matlåda: "🍱", "lunch box": "🍱", matlådor: "🍱",
  helg: "🕯️", weekend: "🕯️",
  fest: "🎉",
  dryck: "🍹", drinks: "🍹", drink: "🍹",
  party: "🎉",
  tillbehör: "🥖", "side dish": "🥖", sides: "🥖",
  sås: "🥣", sauce: "🥣",
};
const CATEGORY_COLORS = [
  "#e53935", "#d81b60", "#8e24aa", "#5e35b1", "#1e88e5", "#00897b", "#43a047",
  "#f4511e", "#6d4c41", "#c0ca33", "#ffb300", "#7cb342", "#00acc1",
];
// The default categories get colors that don't clash with each other.
const FIXED_COLORS = {
  frukost: 7, breakfast: 7,
  middag: 4, dinner: 4,
  förrätt: 3, starter: 3,
  efterrätt: 1, dessert: 1,
  bakning: 8, baking: 8,
  plockmat: 2, "finger food": 2,
  mellanmål: 0, snack: 0,
  soppa: 10, soup: 10,
  sallad: 11, salad: 11,
  vegetariskt: 6, vegetarian: 6,
  matlåda: 5, "lunch box": 5,
  helg: 12, weekend: 12,
};

function categoryColor(name) {
  const key = name.toLowerCase();
  if (key in FIXED_COLORS) return CATEGORY_COLORS[FIXED_COLORS[key]];
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
}

/** A colored label for a category, e.g. "🍰 Efterrätt". */
function categoryLabel(name, tag = "span") {
  const icon = CATEGORY_ICONS[name.toLowerCase()];
  const node = el(tag, { cls: "cat", text: icon ? `${icon} ${name}` : name });
  node.style.setProperty("--cat", categoryColor(name));
  if (!icon) node.classList.add("dot");
  return node;
}

/** "25 min", "1 h 30 min". */
function formatMinutes(minutes) {
  return formatDuration(minutes * 60);
}

/* ------------------------------------------------------------------ */
/* Offers (only shown when the offers module is on)                    */
/* ------------------------------------------------------------------ */

const OFFER_STRINGS = {
  sv: {
    lang: "sv",
    filter: "🏷 Extrapris",
    onOffer: (n) => `🏷 ${n} på extrapris`,
    ordinary: "Ordinarie",
    save: (kr, pct) => `spara ${kr} (${pct} %)`,
    lowest: "Lägsta pris 30 dagar",
    unknown: "Rabatt ej angiven i reklambladet",
    compare: "Jfr-pris",
    until: "Gäller t.o.m.",
    member: "Medlemspris",
    max: (n) => `Max ${n} per hushåll`,
    plus: "Plus",
    also: "Även",
    pieces: "för",
    refill: "Fyll på – extrapris",
    refillAdd: "Lägg på inköpslistan",
    refillHide: "Dölj till nästa vecka",
    added: (name) => `”${name}” lades på inköpslistan.`,
    listSavings: (kr) => `Extrapris på listan: spara minst ${kr}`,
  },
  en: {
    lang: "en",
    filter: "🏷 On offer",
    onOffer: (n) => `🏷 ${n} on offer`,
    ordinary: "Ordinary price",
    save: (kr, pct) => `save ${kr} (${pct} %)`,
    lowest: "Lowest price in 30 days",
    unknown: "Discount not stated in the flyer",
    compare: "Comparison price",
    until: "Valid until",
    member: "Member price",
    max: (n) => `Max ${n} per household`,
    plus: "Member",
    also: "Also",
    pieces: "for",
    refill: "Stock up – on offer",
    refillAdd: "Add to shopping list",
    refillHide: "Hide until next week",
    added: (name) => `“${name}” was added to the shopping list.`,
    listSavings: (kr) => `Offers on the list: save at least ${kr}`,
  },
};

/** 34.9 -> "34:90", 35 -> "35:-" (as on Swedish price signs). */
function formatKr(value) {
  const cents = Math.round(value * 100);
  const whole = Math.floor(cents / 100);
  const rest = cents % 100;
  return rest ? `${whole}:${String(rest).padStart(2, "0")}` : `${whole}:-`;
}

/** "34:90", or "2 för 30" for multi-buy offers. */
function offerPrice(offer, o) {
  if (offer.pieces > 1) return `${offer.pieces} ${o.pieces} ${formatKr(offer.price).replace(/:-$/, "")}`;
  return formatKr(offer.price);
}

/** "sön 15/11". */
function formatOfferDate(iso, lang) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(lang === "en" ? "en-GB" : "sv-SE", { weekday: "short", day: "numeric", month: "numeric" });
}

/** Sorts recipes for the offer filter: real deals first, then any offer. */
function offerScore(recipe) {
  const offers = Object.values(recipe.offers || {});
  return offers.filter((list) => list[0].deal).length * 10 + offers.length;
}

/** "2026-W46", as the integration names weeks. */
function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - start) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Same as the integration's name_key: casefold, single spaces. */
function nameKey(text) {
  return text.toLowerCase().split(/\s+/).filter(Boolean).join(" ");
}

/**
 * The price-sign tag: price first, the discount next to it when the flyer
 * states it. Faded when the discount is unknown or small.
 */
function offerTag(offer, o, { label = "", chain = false } = {}) {
  const tag = el("button", { cls: `offer-tag${offer.deal ? "" : " weak"}`, attrs: { type: "button" } });
  const parts = [`🏷${label ? ` ${label}` : ""} ${offerPrice(offer, o)}`];
  tag.append(document.createTextNode(parts.join("")));
  if (offer.discount_percent) tag.append(document.createTextNode(" "), el("b", { text: `−${offer.discount_percent} %` }));
  if (offer.member) tag.append(document.createTextNode(` ${o.plus}`));
  if (chain && offer.chain) tag.append(document.createTextNode(` ${offer.chain}`));
  tag.title = `${offer.store}: ${offer.heading}`;
  return tag;
}

/** Store, price, ordinary price and saving, end date: shown on tap. */
function offerDetails(offers, o) {
  const [best, ...others] = offers;
  const row = (k, v) => el("div", { cls: "r" }, el("span", { cls: "k", text: k }), el("span", { text: v }));
  const box = el(
    "div",
    { cls: "offer-pop" },
    el("div", { cls: "r" }, el("strong", { text: best.store }), el("span", { text: [offerPrice(best, o), best.quantity].filter(Boolean).join(" · ") }))
  );
  if (best.discount_source === "stated" && best.ordinary_price) {
    box.append(row(o.ordinary, `${formatKr(best.ordinary_price)} · ${o.save(formatKr(best.saving || 0), best.discount_percent)}`));
  } else if (best.discount_source === "lowest_30d" && best.ordinary_price) {
    box.append(row(o.lowest, `${formatKr(best.ordinary_price)} (−${best.discount_percent} %)`));
  } else {
    box.append(el("div", { cls: "k", text: o.unknown }));
  }
  if (best.comparison) box.append(row(o.compare, best.comparison));
  const extras = [best.member ? o.member : null, best.max_per_household ? o.max(best.max_per_household) : null].filter(Boolean);
  if (extras.length) box.append(el("div", { cls: "k", text: extras.join(" · ") }));
  box.append(row(o.until, formatOfferDate(best.valid_until, o.lang)));
  for (const other of others) {
    box.append(row(`${o.also} ${other.store}`, [offerPrice(other, o), other.discount_percent ? `−${other.discount_percent} %` : null].filter(Boolean).join(" ")));
  }
  return box;
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
  .cat {
    display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500;
    padding: 2px 9px; border-radius: 999px; line-height: 1.5; white-space: nowrap;
    background: color-mix(in srgb, var(--cat) 16%, transparent);
    color: color-mix(in srgb, var(--cat) 75%, var(--primary-text-color));
    border: 1px solid color-mix(in srgb, var(--cat) 35%, transparent);
  }
  .cat.dot::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--cat); }
  .time { white-space: nowrap; }
  .offer-tag {
    font: inherit; cursor: pointer; display: inline-flex; align-items: center; gap: 0;
    font-size: 12px; font-weight: 600; line-height: 1.4; padding: 1px 7px; border-radius: 4px;
    background: #ffd21f; color: #2a2100; border: none; white-space: nowrap; flex: none;
  }
  .offer-tag b { color: #c62828; font-weight: 700; }
  .offer-tag.weak { background: color-mix(in srgb, #ffd21f 35%, var(--card-background-color, #fff)); color: var(--primary-text-color); }
  .offer-tag.weak b { color: inherit; }
  .offer-pop {
    margin: 4px 0 6px; padding: 8px 10px; border-radius: 8px; font-size: 12px; line-height: 1.45;
    background: var(--secondary-background-color); display: grid; gap: 2px;
  }
  .offer-pop .r { display: flex; justify-content: space-between; gap: 12px; }
  .offer-pop .r > :last-child { text-align: right; }
  .offer-pop .k { color: var(--secondary-text-color); }
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
    this._week = null;
    this._offerFilter = false;
  }

  setConfig(config) {
    this._config = config || {};
    this._t = STRINGS[this._config.language] || STRINGS.sv;
    this._o = OFFER_STRINGS[this._config.language] || OFFER_STRINGS.sv;
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
          this._week = msg.week || null;
          this._weeklyEnabled = Boolean(msg.weekly_enabled);
          this._offersEnabled = Boolean(msg.offers_enabled);
          this._categories = msg.categories || [];
          this._categoryDescriptions = msg.category_descriptions || {};
          if (this._category && !this._categories.includes(this._category)) this._category = null;
          this._renderCategoryChips();
          this._renderWeek();
          this._renderGrid();
          if (this._dialog) this._dialog.update(this._recipes, this._categories, this._weekInfo());
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
      .tile .badge.time { left: auto; right: 8px; background: rgba(0, 0, 0, 0.65); color: #fff; }
      .tile .badge.time.quick { background: var(--primary-color); color: var(--text-primary-color, #fff); }
      .tile .name { padding: 8px 10px 4px; font-weight: 500; line-height: 1.25; }
      .tile .cats { display: flex; flex-wrap: wrap; gap: 4px; padding: 0 10px 6px; }
      .tile .meta { padding: 0 10px 10px; font-size: 12px; color: var(--secondary-text-color); }
      .tile .meta:empty { display: none; }
      .tile .cats:empty + .meta:empty { display: none; }
      .tile > :last-child { margin-bottom: 4px; }
      .chip.cat {
        padding: 5px 12px; font-size: 13px; cursor: pointer;
        background: color-mix(in srgb, var(--cat) 16%, transparent);
        color: color-mix(in srgb, var(--cat) 75%, var(--primary-text-color));
        border: 1px solid color-mix(in srgb, var(--cat) 35%, transparent);
      }
      .chip.cat.active {
        background: var(--cat); color: #fff; border-color: transparent;
      }
      .chip.cat.active.dot::before { background: #fff; }
      .chip.edit { border-style: dashed; color: var(--secondary-text-color); }
      .cat-editor {
        margin-top: 10px; padding: 12px; border-radius: var(--fp-radius);
        border: 1px solid var(--divider-color); background: var(--secondary-background-color);
      }
      .cat-editor h2 { margin: 0 0 8px; font-size: 15px; font-weight: 500; }
      .cat-editor .rows { display: grid; gap: 12px; }
      .cat-editor .centry { display: grid; gap: 4px; }
      .cat-editor input.desc {
        padding: 5px 10px; font-size: 13px;
        margin-left: calc(1.6em + 24px); width: calc(100% - 1.6em - 24px);
      }
      .cat-editor .crow { display: flex; gap: 6px; align-items: center; }
      .cat-editor .crow .cat { flex: none; min-width: 1.6em; justify-content: center; }
      .cat-editor .crow input { flex: 1; padding: 6px 10px; }
      .cat-editor .crow button { padding: 6px 10px; flex: none; }
      .cat-editor .add-row { display: flex; gap: 6px; margin-top: 10px; }
      .cat-editor .add-row input { flex: 1; padding: 6px 10px; }
      .cat-editor .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
      .cat-editor .hint { font-size: 12px; color: var(--secondary-text-color); margin: 8px 0 0; }
      .empty { margin: 16px 0 0; color: var(--secondary-text-color); }
      .tile .imgwrap { position: relative; display: block; }
      .tile .imgwrap .offer-tag {
        position: absolute; left: 8px; bottom: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.35); pointer-events: none;
      }
      .chip.offers.active { background: #ffd21f; color: #2a2100; }
      .week { margin-top: 16px; border: 1px solid var(--divider-color); border-radius: var(--fp-radius); overflow: hidden; }
      .week:empty { display: none; }
      .week header { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; padding: 12px 14px 6px; }
      .week h2 { margin: 0; font-size: 16px; font-weight: 500; }
      .week .progress { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; }
      .week .dish {
        display: grid; grid-template-columns: 48px minmax(0, 1fr) auto; gap: 12px; align-items: center;
        padding: 8px 14px; border-top: 1px solid var(--divider-color);
      }
      .week .thumb { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; font-size: 22px; }
      .week .open { cursor: pointer; display: block; min-width: 0; }
      .week .open:focus-visible { outline: 2px solid var(--primary-color); border-radius: 4px; }
      .week .from { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--primary-color); }
      .week .title { font-weight: 500; line-height: 1.25; }
      .week .dmeta { display: flex; flex-wrap: wrap; gap: 4px 8px; align-items: center; margin-top: 3px; font-size: 12px; color: var(--secondary-text-color); }
      .week .reason { font-size: 12px; color: var(--secondary-text-color); margin-top: 2px; }
      .week .ok { color: var(--success-color, #43a047); }
      .week .warn { color: var(--warning-color, #ffa600); }
      .week .done .title { text-decoration: line-through; color: var(--secondary-text-color); }
      .week .done .thumb { opacity: 0.45; }
      .week .acts { display: flex; gap: 2px; }
      .week .acts button {
        width: 34px; height: 34px; padding: 0; border-radius: 50%; font-size: 15px;
        background: transparent; color: var(--secondary-text-color);
      }
      .week .acts button:hover { background: var(--secondary-background-color); }
      .week .acts button.on { color: var(--primary-color); }
      .week footer { display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 14px 14px; border-top: 1px solid var(--divider-color); }
      .week footer .grow { flex: 1 1 auto; }
      .week .wempty { padding: 4px 14px 14px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; color: var(--secondary-text-color); }
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
    this._quick = false;
    this._quickChip = el("button", { cls: "chip", text: t.filterQuick });
    this._quickChip.addEventListener("click", () => {
      this._quick = !this._quick;
      this._renderGrid();
    });
    this._chips.append(this._quickChip);
    this._offerChip = el("button", { cls: "chip offers", text: this._o.filter, attrs: { hidden: "" } });
    this._offerChip.addEventListener("click", () => {
      this._offerFilter = !this._offerFilter;
      this._renderGrid();
    });
    this._chips.append(this._offerChip);
    this._weekBox = el("div", { cls: "week" });
    this._categoryChips = el("div", { cls: "categories" });
    this._grid = el("div", { cls: "grid" });
    this._empty = el("p", { cls: "empty", attrs: { hidden: "" } });

    const card = el(
      "ha-card",
      {},
      el("h1", { text: this._config.title || t.title }),
      el("div", { cls: "add" }, this._input, this._addButton),
      this._status,
      this._weekBox,
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
      const response = result?.response || {};
      this._setStatus((response.created === false ? this._t.exists : this._t.imported)(response.title || ""));
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
    const edit = el("button", { cls: "chip edit", text: this._t.editCategories });
    edit.addEventListener("click", () => this._toggleCategoryEditor());
    if (!shown.length) {
      this._categoryChips.replaceChildren(edit);
      return;
    }
    const chip = (label, value) => {
      const node = value === null ? el("button", { cls: "chip", text: label }) : categoryLabel(value, "button");
      node.classList.add("chip");
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
      ...shown.map((c) => chip(c, c)),
      edit
    );
  }

  _toggleCategoryEditor() {
    if (this._catEditor) {
      this._catEditor.remove();
      this._catEditor = null;
      return;
    }
    const t = this._t;
    const rowsBox = el("div", { cls: "rows" });
    const rows = [];
    const addRow = (orig, value, description) => {
      const input = el("input", { attrs: { type: "text", "aria-label": t.catTitle } });
      input.value = value;
      const desc = el("input", { cls: "desc", attrs: { type: "text", placeholder: t.catDescription, "aria-label": t.catDescription } });
      desc.value = description || "";
      const preview = categoryLabel(value || "?");
      preview.textContent = (CATEGORY_ICONS[value.toLowerCase()] || "").trim();
      const remove = el("button", { cls: "secondary", text: "✕", attrs: { type: "button", title: t.catRemove, "aria-label": t.catRemove } });
      const row = {
        orig,
        input,
        desc,
        node: el("div", { cls: "centry" }, el("div", { cls: "crow" }, preview, input, remove), desc),
      };
      input.addEventListener("input", () => {
        const name = input.value.trim();
        preview.style.setProperty("--cat", categoryColor(name || "?"));
        preview.textContent = (CATEGORY_ICONS[name.toLowerCase()] || "").trim();
        preview.classList.toggle("dot", !CATEGORY_ICONS[name.toLowerCase()]);
      });
      remove.addEventListener("click", () => {
        rows.splice(rows.indexOf(row), 1);
        row.node.remove();
      });
      rows.push(row);
      rowsBox.append(row.node);
      return row;
    };
    const descriptions = this._categoryDescriptions || {};
    for (const name of this._categories) addRow(name, name, descriptions[name]);

    const newInput = el("input", { attrs: { type: "text", placeholder: t.catNew } });
    const addButton = el("button", { cls: "secondary", text: t.catAdd, attrs: { type: "button" } });
    const add = () => {
      const name = newInput.value.trim();
      if (!name) return;
      newInput.value = "";
      addRow(null, name, "").desc.focus();
    };
    addButton.addEventListener("click", add);
    newInput.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        add();
      }
    });

    const status = el("p", { cls: "status", attrs: { hidden: "" } });
    const setStatus = (text, isError = false) => {
      status.textContent = text;
      status.classList.toggle("error", isError);
      status.toggleAttribute("hidden", !text);
    };
    const save = el("button", { text: t.catSave });
    const saveSort = el("button", { cls: "secondary", text: t.catSaveSort });
    const cancel = el("button", { cls: "secondary", text: t.cancel });
    cancel.addEventListener("click", () => this._toggleCategoryEditor());
    const submit = async (recategorize) => {
      const categories = [];
      const renames = {};
      const descriptions = {};
      for (const row of rows) {
        const name = row.input.value.trim();
        if (!name) continue;
        categories.push(name);
        descriptions[name] = row.desc.value.trim();
        if (row.orig && row.orig !== name) renames[row.orig] = name;
      }
      for (const b of [save, saveSort, cancel]) b.disabled = true;
      setStatus(recategorize ? t.catSorting : "");
      try {
        const result = await this._hass.callWS({
          type: `${DOMAIN}/categories/set`,
          categories,
          renames,
          descriptions,
          recategorize,
        });
        this._toggleCategoryEditor();
        this._setStatus(recategorize ? t.catSorted(result?.changed ?? 0) : t.catSaved);
      } catch (err) {
        setStatus(err?.code === "unauthorized" ? t.adminOnly : errorMessage(err), true);
        for (const b of [save, saveSort, cancel]) b.disabled = false;
      }
    };
    save.addEventListener("click", () => submit(false));
    saveSort.addEventListener("click", () => submit(true));

    this._catEditor = el(
      "div",
      { cls: "cat-editor" },
      el("h2", { text: t.catTitle }),
      rowsBox,
      el("div", { cls: "add-row" }, newInput, addButton),
      el("div", { cls: "actions" }, save, saveSort, cancel),
      el("p", { cls: "hint", text: t.catSortHint }),
      status
    );
    this._categoryChips.after(this._catEditor);
  }

  _renderGrid() {
    if (!this._grid) return;
    const t = this._t;
    const recipes = this._recipes || [];
    for (const chip of this._chips.children) {
      if (chip.dataset.filter) chip.classList.toggle("active", chip.dataset.filter === this._filter);
    }
    this._quickChip.classList.toggle("active", this._quick);
    this._offerChip.toggleAttribute("hidden", !this._offersEnabled);
    const offerFilter = this._offerFilter && this._offersEnabled;
    this._offerChip.classList.toggle("active", offerFilter);
    const shown = recipes.filter((r) => {
      if (this._filter !== "all" && r.status !== this._filter) return false;
      if (offerFilter && !Object.keys(r.offers || {}).length) return false;
      if (this._quick && !(r.total_minutes && r.total_minutes <= QUICK_MINUTES)) return false;
      if (this._category && !(r.categories || []).includes(this._category)) return false;
      if (!this._search) return true;
      return (
        r.title.toLowerCase().includes(this._search) ||
        r.ingredients.some((i) => i.toLowerCase().includes(this._search))
      );
    });

    if (this._quick) shown.sort((a, b) => a.total_minutes - b.total_minutes);
    else if (offerFilter) shown.sort((a, b) => offerScore(b) - offerScore(a));
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
    const offers = Object.values(recipe.offers || {});
    if (this._offersEnabled && offers.length) {
      const deals = offers.filter((list) => list[0].deal).length;
      const badge = el("span", { cls: `offer-tag${deals ? "" : " weak"}`, text: this._o.onOffer(deals || offers.length) });
      tile.append(el("span", { cls: "imgwrap" }, recipeImage(recipe), badge));
    } else {
      tile.append(recipeImage(recipe));
    }
    if (recipe.status === "ready") tile.append(el("span", { cls: "badge ready", text: t.ready }));
    if (recipe.status === "missing") tile.append(el("span", { cls: "badge", text: t.missingBadge(recipe.missing.length) }));
    if (recipe.total_minutes) {
      const time = el("span", { cls: "badge time", text: `⏱ ${formatMinutes(recipe.total_minutes)}` });
      time.classList.toggle("quick", recipe.total_minutes <= QUICK_MINUTES);
      tile.append(time);
    }
    tile.append(
      el("span", { cls: "name", text: recipe.title }),
      el("span", { cls: "cats" }, ...(recipe.categories || []).map((c) => categoryLabel(c))),
      el("span", { cls: "meta", text: recipe.servings || "" })
    );
    tile.addEventListener("click", () => this._open(recipe.uid));
    return tile;
  }

  _weekInfo() {
    return {
      enabled: this._weeklyEnabled,
      offers: this._offersEnabled,
      uids: new Set((this._week?.dinners || []).filter((d) => !d.cooked).map((d) => d.recipe_uid)),
    };
  }

  async _weekAction(action, uid, button) {
    if (button) button.disabled = true;
    if (action === "plan") this._setStatus(this._t.weekPlanning);
    try {
      const result = await this._hass.callWS({ type: `${DOMAIN}/week/update`, action, ...(uid ? { uid } : {}) });
      if (action === "shop") this._setStatus(this._t.weekShopped(result?.added ?? 0));
      else if (action === "plan") this._setStatus(result?.added ? this._t.weekPlanned(result.added) : this._t.weekNoMore);
      if (button) button.disabled = false;
    } catch (err) {
      this._setStatus(errorMessage(err), true);
      if (button) button.disabled = false;
    }
  }

  _renderWeek() {
    if (!this._weekBox) return;
    const t = this._t;
    if (!this._weeklyEnabled) {
      this._weekBox.replaceChildren();
      return;
    }
    const week = this._week;
    const dinners = week?.dinners || [];
    const header = el("header", {}, el("h2", { text: t.weekTitle }));
    if (!dinners.length) {
      const plan = el("button", { cls: "secondary", text: t.weekPlan });
      plan.addEventListener("click", () => this._weekAction("plan", null, plan));
      this._weekBox.replaceChildren(header, el("div", { cls: "wempty" }, el("span", { text: t.weekEmpty }), plan));
      return;
    }
    const cooked = dinners.filter((d) => d.cooked).length;
    header.append(el("span", { cls: "progress", text: t.weekProgress(cooked, dinners.length, (week.week || "").split("-W")[1] || "") }));
    const byUid = new Map((this._recipes || []).map((r) => [r.uid, r]));
    const rows = dinners.map((dinner) => this._weekRow(dinner, byUid.get(dinner.recipe_uid)));
    const toBuy = new Set(dinners.filter((d) => !d.cooked).flatMap((d) => d.missing || []));
    const shop = el("button", { cls: "grow", text: t.weekShop(toBuy.size) });
    shop.disabled = toBuy.size === 0;
    shop.addEventListener("click", () => this._weekAction("shop", null, shop));
    const again = el("button", { cls: "secondary", text: t.weekNew });
    again.addEventListener("click", () => this._weekAction("plan", null, again));
    this._weekBox.replaceChildren(header, ...rows, el("footer", {}, shop, again));
  }

  _weekRow(dinner, recipe) {
    const t = this._t;
    const thumb = recipe ? recipeImage(recipe, "thumb") : el("div", { cls: "thumb placeholder", text: "💡" });
    const info = el("div", { cls: "open" });
    if (dinner.idea) info.append(el("div", { cls: "from", text: t.weekIdea }));
    else if (dinner.rolled_over && !dinner.cooked) info.append(el("div", { cls: "from", text: t.weekRolled }));
    info.append(el("div", { cls: "title", text: dinner.title }));
    const meta = el("div", { cls: "dmeta" });
    if (dinner.cooked) meta.append(el("span", { cls: "ok", text: t.weekCooked }));
    else if (recipe) {
      if (dinner.total_minutes) {
        meta.append(el("span", { text: `${dinner.total_minutes <= QUICK_MINUTES ? "⚡" : "⏱"} ${formatMinutes(dinner.total_minutes)}` }));
      }
      if (dinner.missing && !dinner.missing.length) meta.append(el("span", { cls: "ok", text: t.ready }));
      else if (dinner.missing?.length) meta.append(el("span", { cls: "warn", text: t.missingBadge(dinner.missing.length) }));
      const deal = (dinner.deals || [])[0];
      if (deal) {
        const name = deal.product.charAt(0).toUpperCase() + deal.product.slice(1);
        const tag = offerTag({ ...deal, deal: true }, this._o, { label: name });
        tag.tabIndex = -1;
        tag.style.pointerEvents = "none";
        meta.append(tag);
      }
      if (dinner.added) meta.append(el("span", { text: t.weekAdded }));
    }
    info.append(meta);
    if (dinner.reason && !dinner.cooked) info.append(el("div", { cls: "reason", text: dinner.reason }));
    if (recipe) {
      info.setAttribute("role", "button");
      info.tabIndex = 0;
      info.addEventListener("click", () => this._open(recipe.uid));
      info.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") this._open(recipe.uid);
      });
    }
    const acts = el("div", { cls: "acts" });
    const key = dinner.recipe_uid || dinner.title;
    const act = (icon, label, action, on = false) => {
      const button = el("button", { text: icon, attrs: { type: "button", title: label, "aria-label": label } });
      button.classList.toggle("on", on);
      button.addEventListener("click", () => this._weekAction(action, key, button));
      acts.append(button);
    };
    if (!dinner.cooked) {
      if (recipe) act("📌", dinner.pinned ? t.weekUnpin : t.weekPin, dinner.pinned ? "unpin" : "pin", dinner.pinned);
      if (!dinner.pinned && !dinner.added) act("↻", t.weekSwap, "swap");
      act("✕", t.weekRemove, "remove");
    }
    return el("div", { cls: `dish${dinner.cooked ? " done" : ""}` }, thumb, info, acts);
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
      week: this._weekInfo(),
      onClose: () => {
        if (this._dialog === dialog) this._dialog = null;
      },
    });
    this._dialog = dialog;
    document.body.append(dialog);
  }
}

/* ------------------------------------------------------------------ */
/* Cooking timers                                                      */
/* ------------------------------------------------------------------ */

const TIMER_STRINGS = {
  sv: {
    start: (d) => `Starta timer ${d}`,
    pause: "Pausa",
    resume: "Fortsätt",
    cancel: "Avbryt timern",
    dismiss: "Stäng av",
    addMinute: "+1 min",
    finished: "Klar!",
    done: "Klar",
    paused: "Pausad",
    timers: "Timers",
  },
  en: {
    start: (d) => `Start timer ${d}`,
    pause: "Pause",
    resume: "Resume",
    cancel: "Cancel timer",
    dismiss: "Dismiss",
    addMinute: "+1 min",
    finished: "Done!",
    done: "Done",
    paused: "Paused",
    timers: "Timers",
  },
};

const TIME_WORDS = {
  en: 1, ett: 1, "två": 2, tre: 3, fyra: 4, fem: 5, sex: 6, sju: 7, "åtta": 8, nio: 9, tio: 10,
  elva: 11, tolv: 12, femton: 15, tjugo: 20, trettio: 30, fyrtio: 40, femtio: 50,
  one: 1, a: 1, an: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50,
};
const UNIT_HOURS = "timmar|timmen|timme|tim|hours|hour|hrs|hr|h";
const UNIT_MINUTES = "minuterna|minuter|minuten|minut|min|minutes|minute|mins";
const UNIT_SECONDS = "sekunder|sekund|sek|seconds|second|secs|sec";
const TIME_RE = (() => {
  const words = Object.keys(TIME_WORDS).sort((a, b) => b.length - a.length).join("|");
  const num = `(\\d+(?:[.,]\\d+)?(?:\\s*½)?|½|${words})`;
  // Not a time to wait: "två minuter kortare än anvisat", "5 min less".
  const relative =
    "(?!\\s+(?:kortare|längre|mindre|tidigare|senare|" +
    "shorter|longer|less|earlier|later)(?![\\p{L}]))";
  const end = `(?![\\p{L}\\d])${relative}`;
  const main =
    `(?<![\\p{L}\\d])${num}(?:\\s*(?:-|–|—|till|to|or|eller)\\s*${num})?` +
    `\\s*(${UNIT_HOURS}|${UNIT_MINUTES}|${UNIT_SECONDS})${end}` +
    `(?:\\s*(?:och|and|,)?\\s*(\\d+)\\s*(?:${UNIT_MINUTES})${end})?`;
  const special = `(?<![\\p{L}\\d])(?:(?:en|ett)\\s+)?(halvtimme|halvtimma|kvart|half an hour|half hour)${end}`;
  return new RegExp(`${main}|${special}`, "giu");
})();

function parseTimeNumber(text) {
  if (!text) return null;
  const word = TIME_WORDS[text.toLowerCase()];
  if (word !== undefined) return word;
  const half = text.includes("½");
  const digits = text.replace("½", "").replace(",", ".").trim();
  const value = (digits ? parseFloat(digits) : 0) + (half ? 0.5 : 0);
  return Number.isFinite(value) ? value : null;
}

function unitSeconds(unit) {
  const u = unit.toLowerCase();
  if (new RegExp(`^(?:${UNIT_HOURS})$`).test(u)) return 3600;
  if (new RegExp(`^(?:${UNIT_SECONDS})$`).test(u)) return 1;
  return 60;
}

/** The sentence or clause around a match, for the timer's label. */
function clauseAround(text, start, end, stops = /[.!?;:\n]/) {
  let from = start;
  while (from > 0 && !stops.test(text[from - 1])) from--;
  let to = end;
  while (to < text.length && !stops.test(text[to])) to++;
  let clause = text.slice(from, to).trim();
  if (clause.length > 60) clause = `${clause.slice(0, 57).trimEnd()}…`;
  return clause.charAt(0).toUpperCase() + clause.slice(1);
}

/**
 * Each step's cooking times, with labels that are unique within the recipe
 * (the labels name the timers).
 */
function recipeDurations(steps) {
  const parsed = steps.map((step) => parseDurations(step));
  const all = parsed.flat();
  const shared = new Set(all.map((f) => f.label).filter((label, i, labels) => labels.indexOf(label) !== i));
  for (const found of all) if (shared.has(found.label)) found.label = found.short;
  const seen = new Map();
  for (const found of all) {
    const n = (seen.get(found.label) || 0) + 1;
    seen.set(found.label, n);
    if (n > 1) found.label = `${found.label} (${n})`;
  }
  return parsed;
}

/**
 * Find cooking times in a recipe step: "10 min", "25–30 minuter",
 * "1 timme och 15 minuter", "1 ½ h", "en kvart", "half an hour".
 * Returns [{ index, length, seconds, maxSeconds, label }].
 */
function parseDurations(text) {
  const found = [];
  if (!text) return found;
  TIME_RE.lastIndex = 0;
  let match;
  while ((match = TIME_RE.exec(text))) {
    let seconds;
    let maxSeconds = null;
    if (match[5]) {
      seconds = /kvart/i.test(match[5]) ? 900 : 1800;
    } else {
      const unit = unitSeconds(match[3]);
      const low = parseTimeNumber(match[1]);
      const high = parseTimeNumber(match[2]);
      const extra = match[4] ? parseInt(match[4], 10) * 60 : 0;
      if (low === null) continue;
      seconds = Math.round(low * unit + extra);
      if (high !== null && high > low) maxSeconds = Math.round(high * unit + extra);
    }
    if (seconds < 5 || seconds > 86400) continue;
    found.push({
      index: match.index,
      length: match[0].length,
      seconds,
      maxSeconds,
      label: clauseAround(text, match.index, match.index + match[0].length),
      // Shorter, for when two times share a sentence ("bryn 3 min, sjud 15 min").
      short: clauseAround(text, match.index, match.index + match[0].length, /[.!?;:\n,]/),
    });
  }
  return found;
}

/** "10 min", "1 h 15 min", "30 s". */
function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  const parts = [];
  if (h) parts.push(`${h} h`);
  if (m) parts.push(`${m} min`);
  if (s && !h) parts.push(`${s} s`);
  return parts.join(" ") || "0 s";
}

/** "1:05:09" or "7:42". */
function formatCountdown(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/**
 * One subscription to the integration's timers per page, shared by the
 * timer bars and the recipe view. Counts down against the server's clock,
 * and rings on this device when a timer finishes while the page is open.
 */
const timerHub = {
  hass: null,
  timers: [],
  offset: 0,
  listeners: new Set(),
  _unsub: null,
  _subscribing: false,
  _statuses: null,
  _ringing: new Set(),
  _ticker: null,
  _audio: null,
  _ringLoop: null,

  _failedAt: 0,

  connect(hass) {
    if (!hass) return;
    this.hass = hass;
    // set hass runs on every state change; after a failure (integration
    // not loaded) wait a while before trying again.
    if (!this._unsub && !this._subscribing && Date.now() - this._failedAt > 30000) this._subscribe();
  },

  async _subscribe() {
    this._subscribing = true;
    try {
      this._unsub = await this.hass.connection.subscribeMessage(
        (msg) => this._receive(msg),
        { type: `${DOMAIN}/timers/subscribe` }
      );
    } catch (_err) {
      this._failedAt = Date.now(); // integration not loaded: no timers
    } finally {
      this._subscribing = false;
    }
  },

  _receive(msg) {
    const now = Date.parse(msg.now);
    if (Number.isFinite(now)) this.offset = now - Date.now();
    this.timers = msg.timers || [];
    const statuses = new Map(this.timers.map((timer) => [timer.id, timer.status]));
    if (this._statuses) {
      for (const timer of this.timers) {
        const before = this._statuses.get(timer.id);
        if (timer.status === "finished" && before && before !== "finished") this._ringing.add(timer.id);
      }
    }
    for (const id of [...this._ringing]) if (statuses.get(id) !== "finished") this._ringing.delete(id);
    this._statuses = statuses;
    this._updateTicker();
    this._updateRinging();
    this._notify();
  },

  _notify() {
    for (const listener of [...this.listeners]) listener();
  },

  subscribe(listener) {
    this.listeners.add(listener);
    this._updateTicker();
    return () => {
      this.listeners.delete(listener);
      this._updateTicker();
    };
  },

  _updateTicker() {
    const needed = this.listeners.size && this.timers.some((timer) => timer.status === "running");
    if (needed && !this._ticker) {
      this._ticker = setInterval(() => this._notify(), 1000);
    } else if (!needed && this._ticker) {
      clearInterval(this._ticker);
      this._ticker = null;
    }
  },

  remaining(timer) {
    if (timer.status === "paused") return timer.remaining || 0;
    if (timer.status !== "running" || !timer.ends_at) return 0;
    return Math.max(0, (Date.parse(timer.ends_at) - (Date.now() + this.offset)) / 1000);
  },

  isRinging(timer) {
    return this._ringing.has(timer.id);
  },

  /** Sorted for display: finished first, then soonest. */
  sorted() {
    return [...this.timers].sort(
      (a, b) =>
        (a.status === "finished" ? 0 : 1) - (b.status === "finished" ? 0 : 1) ||
        this.remaining(a) - this.remaining(b)
    );
  },

  async call(service, data) {
    this.unlockAudio();
    const result = await this.hass.callWS({
      type: "call_service",
      domain: DOMAIN,
      service,
      service_data: data,
      ...(service === "start_timer" ? { return_response: true } : {}),
    });
    return result?.response;
  },

  start(seconds, label, recipeUid) {
    return this.call("start_timer", {
      duration: { seconds: Math.round(seconds) },
      label,
      ...(recipeUid ? { recipe: recipeUid } : {}),
    });
  },

  silence(timer) {
    this._ringing.delete(timer.id);
    this._updateRinging();
  },

  // Browsers only allow sound after the user has touched the page.
  unlockAudio() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    try {
      if (!this._audio) this._audio = new Ctx();
      if (this._audio.state === "suspended") this._audio.resume();
    } catch (_err) {
      this._audio = null;
    }
  },

  _updateRinging() {
    if (this._ringing.size && !this._ringLoop) {
      const started = Date.now();
      const ring = () => {
        if (!this._ringing.size || Date.now() - started > 120000) {
          clearInterval(this._ringLoop);
          this._ringLoop = null;
          return;
        }
        this._beep();
      };
      ring();
      this._ringLoop = setInterval(ring, 2500);
    } else if (!this._ringing.size && this._ringLoop) {
      clearInterval(this._ringLoop);
      this._ringLoop = null;
    }
  },

  _beep() {
    if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
    const ctx = this._audio;
    if (!ctx || ctx.state !== "running") return;
    for (let i = 0; i < 3; i++) {
      const at = ctx.currentTime + i * 0.3;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.4, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.25);
    }
  },
};
document.addEventListener("pointerdown", () => timerHub.unlockAudio(), { capture: true });

/**
 * The running timers, with pause, +1 min and cancel. Hidden when there are
 * none. Used under the dashboard tabs and floating in the recipe view.
 */
class FoodPlanningTimers extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._rows = new Map();
    this._language = "sv";
  }

  set language(value) {
    this._language = value;
    this._render();
  }

  set hass(hass) {
    timerHub.connect(hass);
  }

  connectedCallback() {
    this._unsub = timerHub.subscribe(() => this._update());
    this._render();
  }

  disconnectedCallback() {
    if (this._unsub) this._unsub();
    this._unsub = null;
  }

  _update() {
    // Re-render when the set of timers or their states change; otherwise
    // only the countdowns (keeps buttons stable under the finger).
    const key = timerHub
      .sorted()
      .map((timer) => `${timer.id}:${timer.status}:${timerHub.isRinging(timer)}`)
      .join("|");
    if (key !== this._key) {
      this._render();
      return;
    }
    for (const timer of timerHub.timers) {
      const row = this._rows.get(timer.id);
      if (row && timer.status === "running") row.time.textContent = formatCountdown(timerHub.remaining(timer));
    }
  }

  _render() {
    const t = TIMER_STRINGS[this._language] || TIMER_STRINGS.sv;
    const timers = timerHub.sorted();
    this._key = timers.map((timer) => `${timer.id}:${timer.status}:${timerHub.isRinging(timer)}`).join("|");
    this._rows.clear();
    this.toggleAttribute("hidden", !timers.length);
    const list = el("div", { cls: "list", attrs: { role: "list", "aria-label": t.timers } });
    for (const timer of timers) {
      const finished = timer.status === "finished";
      const time = el("span", {
        cls: "time",
        text: finished ? t.finished : formatCountdown(timerHub.remaining(timer)),
      });
      const buttons = el("span", { cls: "buttons" });
      const button = (icon, fallback, label, onClick) => {
        const b = cornerButton(icon, fallback, label);
        b.addEventListener("click", async () => {
          b.disabled = true;
          try {
            await onClick();
          } catch (_err) {
            b.disabled = false;
          }
        });
        buttons.append(b);
      };
      if (timer.status === "running") {
        button("mdi:pause", "⏸", t.pause, () => timerHub.call("pause_timer", { timer: timer.id }));
      } else if (timer.status === "paused") {
        button("mdi:play", "▶", t.resume, () => timerHub.call("resume_timer", { timer: timer.id }));
      }
      const plus = el("button", { cls: "plus", text: t.addMinute, attrs: { type: "button" } });
      plus.addEventListener("click", () =>
        timerHub.call("extend_timer", { timer: timer.id, duration: { seconds: 60 } })
      );
      buttons.append(plus);
      button(
        finished ? "mdi:bell-off" : "mdi:close",
        finished ? "🔕" : "✕",
        finished ? t.dismiss : t.cancel,
        () => {
          timerHub.silence(timer);
          return timerHub.call("cancel_timer", { timer: timer.id });
        }
      );
      const row = el(
        "div",
        {
          cls: `row ${timer.status} ${timerHub.isRinging(timer) ? "ringing" : ""}`,
          attrs: { role: "listitem" },
        },
        el("span", { cls: "icon", text: finished ? "⏰" : timer.status === "paused" ? "⏸" : "⏱" }),
        el(
          "span",
          { cls: "what" },
          el("span", { cls: "label", text: timer.label }),
          timer.recipe && timer.recipe !== timer.label
            ? el("span", { cls: "recipe", text: timer.recipe })
            : null
        ),
        time,
        buttons
      );
      // Tapping a ringing timer silences it on this device.
      if (timerHub.isRinging(timer)) row.addEventListener("click", () => timerHub.silence(timer));
      this._rows.set(timer.id, { time });
      list.append(row);
    }
    const style = el("style", {
      text: `
      :host { display: block; }
      :host([hidden]) { display: none; }
      .list { display: flex; flex-direction: column; gap: 6px; }
      .row {
        display: flex; align-items: center; gap: 10px; padding: 8px 8px 8px 14px;
        border-radius: 999px; background: var(--card-background-color, #fff);
        color: var(--primary-text-color); border: 1px solid var(--divider-color);
        box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0, 0, 0, 0.15));
      }
      .row.paused { opacity: 0.75; }
      .row.finished { border-color: var(--primary-color); }
      .row.ringing { animation: pulse 1s ease-in-out infinite; background: var(--primary-color); color: var(--text-primary-color, #fff); }
      @keyframes pulse { 50% { transform: scale(1.02); filter: brightness(1.15); } }
      .icon { font-size: 18px; }
      .what { flex: 1; min-width: 0; display: flex; flex-direction: column; }
      .label { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .recipe { font-size: 12px; opacity: 0.7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .time { font-variant-numeric: tabular-nums; font-size: 20px; font-weight: 600; }
      .buttons { display: flex; gap: 4px; align-items: center; }
      button {
        font: inherit; cursor: pointer; border: none; color: inherit;
        background: rgba(127, 127, 127, 0.15);
      }
      .buttons button:not(.plus) {
        width: 36px; height: 36px; padding: 0; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
      }
      .plus { padding: 8px 10px; border-radius: 999px; font-size: 13px; white-space: nowrap; }
      button:disabled { opacity: 0.5; }
      ha-icon { --mdc-icon-size: 20px; }
      @media (max-width: 420px) { .plus { display: none; } }
    `,
    });
    this.shadowRoot.replaceChildren(style, list);
  }
}

if (!customElements.get("food-planning-timers")) {
  customElements.define("food-planning-timers", FoodPlanningTimers);
}

/** Round icon button for the recipe view's corner; HA's mdi icon if available. */
function cornerButton(icon, fallback, label) {
  const button = el("button", { attrs: { type: "button", "aria-label": label, title: label } });
  if (customElements.get("ha-icon")) {
    button.append(el("ha-icon", { attrs: { icon } }));
  } else {
    button.textContent = fallback;
  }
  return button;
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
    // Browsers drop the wake lock when the page is hidden; take it again
    // when it's visible while cooking mode is on.
    this._onVisibility = () => {
      if (this._cooking && !this._wakeLock && document.visibilityState === "visible") {
        this._requestWakeLock();
      }
    };
  }

  setup({ hass, t, uid, recipes, categories, week, onClose }) {
    this._hass = hass;
    this._t = t;
    this._o = OFFER_STRINGS[t.lang] || OFFER_STRINGS.sv;
    this._uid = uid;
    this._onClose = onClose;
    this._doneChips = new Set();
    this._openOffer = null;
    timerHub.connect(hass);
    this.update(recipes, categories, week);
  }

  connectedCallback() {
    document.addEventListener("keydown", this._onKey);
    document.addEventListener("visibilitychange", this._onVisibility);
    this._unsubTimers = timerHub.subscribe(() => this._updateChips());
  }

  disconnectedCallback() {
    document.removeEventListener("keydown", this._onKey);
    document.removeEventListener("visibilitychange", this._onVisibility);
    if (this._unsubTimers) this._unsubTimers();
    this._unsubTimers = null;
    this._stopCooking();
  }

  /** A step's text with each cooking time turned into a timer chip. */
  _stepNodes(text, durations) {
    const nodes = [];
    let pos = 0;
    for (const found of durations) {
      if (found.index > pos) nodes.push(document.createTextNode(text.slice(pos, found.index)));
      const original = text.slice(found.index, found.index + found.length);
      const label = found.label;
      const button = el("button", { cls: "chip", attrs: { type: "button" } });
      const chip = { button, label, original, seconds: found.seconds };
      button.addEventListener("click", () => this._chipClicked(chip));
      this._chips.push(chip);
      nodes.push(button);
      pos = found.index + found.length;
    }
    if (pos < text.length) nodes.push(document.createTextNode(text.slice(pos)));
    return nodes;
  }

  _chipTimer(chip) {
    return timerHub.timers.find((timer) => timer.recipe_uid === this._uid && timer.label === chip.label);
  }

  async _chipClicked(chip) {
    const timer = this._chipTimer(chip);
    try {
      if (!timer) {
        await timerHub.start(chip.seconds, chip.label, this._uid);
      } else if (timer.status === "running") {
        await timerHub.call("pause_timer", { timer: timer.id });
      } else if (timer.status === "paused") {
        await timerHub.call("resume_timer", { timer: timer.id });
      } else {
        timerHub.silence(timer);
        await timerHub.call("cancel_timer", { timer: timer.id });
      }
    } catch (err) {
      this._setStatus(errorMessage(err), true);
    }
  }

  /** Show each chip's timer: idle, counting down, paused or done. */
  _updateChips() {
    const tt = TIMER_STRINGS[this._t.lang] || TIMER_STRINGS.sv;
    for (const chip of this._chips || []) {
      const timer = this._chipTimer(chip);
      if (timer?.status === "finished") this._doneChips.add(chip.label);
      let text;
      let state = "";
      let label;
      if (!timer) {
        const done = this._doneChips.has(chip.label);
        text = `${done ? "✓" : "⏱"} ${chip.original}`;
        state = done ? "done" : "";
        label = tt.start(formatDuration(chip.seconds));
      } else if (timer.status === "running") {
        text = `⏱ ${formatCountdown(timerHub.remaining(timer))}`;
        state = "running";
        label = tt.pause;
      } else if (timer.status === "paused") {
        text = `⏸ ${formatCountdown(timerHub.remaining(timer))}`;
        state = "paused";
        label = tt.resume;
      } else {
        text = `⏰ ${tt.finished}`;
        state = "finished";
        label = tt.dismiss;
      }
      if (chip.button.textContent !== text) chip.button.textContent = text;
      chip.button.className = `chip ${state}`;
      chip.button.setAttribute("aria-label", `${label}: ${chip.label}`);
      chip.button.title = label;
    }
  }

  async _requestWakeLock() {
    try {
      const lock = await navigator.wakeLock.request("screen");
      lock.addEventListener("release", () => {
        if (this._wakeLock === lock) this._wakeLock = null;
      });
      this._wakeLock = lock;
      return true;
    } catch (err) {
      this._setStatus(errorMessage(err), true);
      return false;
    }
  }

  async _toggleCooking() {
    const t = this._t;
    if (this._cooking) {
      this._stopCooking();
      this._setStatus("");
    } else if (!("wakeLock" in navigator)) {
      this._setStatus(window.isSecureContext ? t.wakeUnsupported : t.wakeNeedsHttps, true);
      return;
    } else if (await this._requestWakeLock()) {
      this._cooking = true;
      this._setStatus(t.cookingActive);
    }
    this._render();
  }

  _stopCooking() {
    this._cooking = false;
    if (this._wakeLock) {
      this._wakeLock.release().catch(() => {});
      this._wakeLock = null;
    }
  }

  close() {
    this.remove();
    if (this._onClose) this._onClose();
  }

  update(recipes, categories, week) {
    if (categories) this._categories = categories;
    if (week) this._week = week;
    const recipe = recipes.find((r) => r.uid === this._uid);
    if (!recipe) {
      this.close();
      return;
    }
    // Any change elsewhere (a shopping list tick) re-sends every recipe;
    // only re-render when this one changed.
    const inWeek = Boolean(this._week?.uids?.has(recipe.uid));
    const key = JSON.stringify([recipe, this._categories, this._week?.enabled, inWeek]);
    const unchanged = key === this._recipeKey;
    this._recipe = recipe;
    this._recipeKey = key;
    // Don't throw away what the user is typing when data changes elsewhere.
    if (this._editing || unchanged) return;
    this._render();
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
      .backdrop { padding-bottom: 140px; }
      food-planning-timers.floating {
        position: fixed; z-index: 1; left: 50%; bottom: 16px; transform: translateX(-50%);
        width: min(560px, calc(100% - 32px));
      }
      button.chip {
        display: inline-flex; align-items: center; padding: 1px 10px; margin: 0 2px;
        border-radius: 999px; font-size: 0.95em; line-height: 1.5; white-space: nowrap;
        background: transparent; color: var(--primary-color);
        border: 1px solid var(--primary-color); font-variant-numeric: tabular-nums;
      }
      button.chip.running, button.chip.finished { background: var(--primary-color); color: var(--text-primary-color, #fff); }
      button.chip.paused { border-style: dashed; }
      button.chip.done { color: var(--success-color, #43a047); border-color: var(--success-color, #43a047); }
      button.chip.finished { animation: chip-pulse 1s ease-in-out infinite; }
      @keyframes chip-pulse { 50% { filter: brightness(1.2); } }
      .hero { width: 100%; max-height: 360px; aspect-ratio: 16 / 9; object-fit: cover; display: block; }
      .corner { position: absolute; top: 12px; right: 12px; display: flex; gap: 8px; }
      .corner button {
        width: 40px; height: 40px; padding: 0; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        background: rgba(0, 0, 0, 0.45); color: #fff; font-size: 18px;
        backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
        transition: background 0.15s;
      }
      .corner button:hover { background: rgba(0, 0, 0, 0.65); }
      .corner button.on { background: var(--primary-color); color: var(--text-primary-color, #fff); }
      .corner ha-icon { --mdc-icon-size: 22px; }
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
      ul.ingredients li { padding: 6px 0; border-bottom: 1px solid var(--divider-color); line-height: 1.35; }
      ul.ingredients label { display: flex; align-items: baseline; gap: 10px; cursor: pointer; }
      ul.ingredients input { width: 18px; height: 18px; flex: none; margin: 0; position: relative; top: 3px; accent-color: var(--primary-color); }
      ul.ingredients .note { margin-left: auto; padding-left: 8px; white-space: nowrap; color: var(--warning-color, #ffa600); font-size: 12px; }
      ul.ingredients .offer-tag { margin-left: auto; position: relative; top: -1px; }
      ul.ingredients .note + .offer-tag { margin-left: 6px; }
      ul.ingredients .offer-pop { margin-left: 28px; }
      .offers-line { font-size: 12px; color: var(--secondary-text-color); margin: 0 0 6px; }
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
      .row { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; }
      .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
      .pick { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
      .pick button {
        padding: 6px 12px; font-size: 13px; background: transparent;
        color: var(--primary-text-color); border: 1px solid var(--divider-color);
      }
      .pick button.on { background: var(--primary-color); color: var(--text-primary-color, #fff); border-color: transparent; }
      .pick button.cat { padding: 6px 12px; font-size: 13px; opacity: 0.7; }
      .pick button.cat.on { background: var(--cat); color: #fff; opacity: 1; }
      .pick button.cat.on.dot::before { background: #fff; }
      .hint { font-size: 12px; color: var(--secondary-text-color); margin: 6px 0 0; }
      @media (max-width: 640px) {
        .row { grid-template-columns: 1fr 1fr; }
        .row > :first-child { grid-column: 1 / -1; }
      }
    `,
    });
  }

  _render() {
    // Keep a status message across re-renders (data updates, toggles).
    const status = this._statusText;
    if (this._editing) this._renderEdit();
    else this._renderView();
    if (status) this._setStatus(status.text, status.isError);
  }

  _shell(...content) {
    const t = this._t;
    const corner = el("div", { cls: "corner" });
    if (!this._editing) {
      const cookingButton = cornerButton(
        "mdi:chef-hat",
        "🍳",
        this._cooking ? t.cookingOn : t.cookingMode
      );
      cookingButton.classList.toggle("on", Boolean(this._cooking));
      cookingButton.setAttribute("aria-pressed", String(Boolean(this._cooking)));
      cookingButton.addEventListener("click", () => this._toggleCooking());
      corner.append(cookingButton);
      const editButton = cornerButton("mdi:pencil", "✎", t.edit);
      editButton.addEventListener("click", () => {
        this._editing = true;
        this._confirmingDelete = false;
        this._setStatus("");
        this._render();
      });
      corner.append(editButton);
    }
    const closeButton = cornerButton("mdi:close", "✕", t.close);
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
    // Keep the scroll position when re-rendering (e.g. while cooking).
    const scrollTop = this.shadowRoot.querySelector(".backdrop")?.scrollTop || 0;
    const backdrop = el("div", { cls: "backdrop" }, panel);
    if (!this._editing) {
      const timers = document.createElement("food-planning-timers");
      timers.className = "floating";
      timers.language = t.lang || "sv";
      backdrop.append(timers);
    }
    backdrop.addEventListener("click", (ev) => {
      if (ev.target === backdrop && !this._editing) this.close();
    });
    this.shadowRoot.replaceChildren(this._style(), backdrop);
    if (scrollTop) backdrop.scrollTop = scrollTop;
  }

  _renderView() {
    const t = this._t;
    const recipe = this._recipe;

    const meta = el("p", { cls: "meta" });
    const metaParts = [];
    if (recipe.total_minutes) metaParts.push(el("span", { cls: "time", text: `⏱ ${formatMinutes(recipe.total_minutes)}` }));
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

    // Ingredients to put on the shopping list. Starts as what's missing at
    // home and follows new checks until the user changes the selection.
    const missingKey = JSON.stringify(recipe.missing || []);
    if (!this._selectionTouched && this._selectionKey !== missingKey) {
      this._selected = new Set(recipe.missing || []);
      this._selectionKey = missingKey;
    }
    const ingredients = el("ul", { cls: "ingredients" });
    const addButton = el("button");
    const updateAddButton = () => {
      const n = recipe.ingredients.filter((i) => this._selected.has(i)).length;
      addButton.textContent = `🛒 ${t.addSelected(n)}`;
      addButton.disabled = n === 0;
    };
    const offers = this._week?.offers ? recipe.offers || {} : {};
    recipe.ingredients.forEach((text, index) => {
      const box = el("input", { attrs: { type: "checkbox" } });
      box.checked = this._selected.has(text);
      const label = el("label", {}, box, el("span", { text }));
      if (missingSet.has(text)) label.append(el("span", { cls: "note", text: t.notAtHome }));
      box.addEventListener("change", () => {
        this._selectionTouched = true;
        if (box.checked) this._selected.add(text);
        else this._selected.delete(text);
        updateAddButton();
      });
      const li = el("li", { cls: missingSet.has(text) ? "missing" : "" }, label);
      const found = offers[String(index)];
      if (found) {
        const tag = offerTag(found[0], this._o);
        tag.addEventListener("click", (ev) => {
          ev.preventDefault();
          this._openOffer = this._openOffer === index ? null : index;
          this._render();
        });
        label.append(tag);
        if (this._openOffer === index) li.append(offerDetails(found, this._o));
      }
      ingredients.append(li);
    });
    const onOffer = Object.values(offers);
    updateAddButton();
    const left = el(
      "section",
      {},
      el("h3", { text: t.ingredients }),
      el("p", { cls: "hint", text: t.selectHint }),
      onOffer.length ? el("p", { cls: "offers-line", text: this._o.onOffer(onOffer.length) }) : null,
      ingredients
    );
    const right = el("section", {});
    this._chips = [];
    if (recipe.steps.length) {
      const durations = recipeDurations(recipe.steps);
      right.append(
        el("h3", { text: t.steps }),
        el(
          "ol",
          { cls: "steps" },
          ...recipe.steps.map((step, i) => el("li", {}, ...this._stepNodes(step, durations[i])))
        )
      );
    }
    if (recipe.notes) {
      right.append(el("h3", { text: t.notes }), el("div", { cls: "notes", text: recipe.notes }));
    }

    addButton.addEventListener("click", () =>
      this._addToList(addButton, recipe.ingredients.filter((i) => this._selected.has(i)))
    );
    const cookedButton = el("button", { cls: "secondary", text: `✓ ${t.cooked}` });
    cookedButton.addEventListener("click", () => this._markCooked(cookedButton));
    let weekButton = null;
    if (this._week?.enabled) {
      const inWeek = this._week.uids?.has(recipe.uid);
      weekButton = el("button", { cls: "secondary", text: inWeek ? t.weekIn : t.weekAdd });
      weekButton.disabled = Boolean(inWeek);
      weekButton.addEventListener("click", async () => {
        weekButton.disabled = true;
        try {
          await this._hass.callWS({ type: `${DOMAIN}/week/update`, action: "add", uid: recipe.uid });
          this._setStatus(t.weekAddedToast);
        } catch (err) {
          this._setStatus(errorMessage(err), true);
          weekButton.disabled = false;
        }
      });
    }
    const actions = el(
      "div",
      { cls: "actions" },
      addButton,
      cookedButton,
      weekButton,
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
      ? el("div", { cls: "tags" }, ...recipe.categories.map((c) => categoryLabel(c)))
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
    this._updateChips();
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
    const time = el("input", { attrs: { type: "number", min: "1", max: "10080", step: "1", inputmode: "numeric" } });
    time.value = recipe.total_minutes || "";
    const ingredients = area(recipe.ingredients.join("\n"), Math.min(14, recipe.ingredients.length + 2));
    const steps = area(recipe.steps.join("\n"), Math.min(14, recipe.steps.length + 3));
    const notes = area(recipe.notes, 3);
    const source = input(recipe.source_url);
    const selected = new Set(recipe.categories || []);
    const picker = el("div", { cls: "pick" });
    for (const name of this._categories || []) {
      const b = categoryLabel(name, "button");
      b.type = "button";
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
      el("div", { cls: "row" }, field(t.fieldTitle, title), field(t.fieldServings, servings), field(t.fieldTime, time)),
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
          total_minutes: Math.round(Number(time.value)) > 0 ? Math.min(10080, Math.round(Number(time.value))) : null,
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
        this._setStatus(this._errorText(err), true);
        save.disabled = false;
      }
    });

    this._shell(el("h2", { text: t.edit }), form);
    title.focus();
  }

  _errorText(err) {
    return err?.code === "unauthorized" ? this._t.adminOnly : errorMessage(err);
  }

  async _addToList(button, ingredients) {
    button.disabled = true;
    try {
      const result = await this._hass.callWS({
        type: "call_service",
        domain: DOMAIN,
        service: "add_recipe_to_shopping_list",
        service_data: { recipe: this._uid, ingredients },
        return_response: true,
      });
      this._setStatus(this._t.added(result?.response?.added ?? 0));
    } catch (err) {
      this._setStatus(errorMessage(err), true);
    } finally {
      button.disabled = !ingredients.length;
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
      this._setStatus(this._errorText(err), true);
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
  sv: { shopping: "Inköpslista", pantry: "Hemma", recipes: "Recept", offers: "Erbjudanden" },
  en: { shopping: "Shopping list", pantry: "At home", recipes: "Recipes", offers: "Offers" },
};
const NAV_ITEMS = [
  { key: "shopping", path: "inkopslista", icon: "🛒" },
  { key: "pantry", path: "hemma", icon: "🏠" },
  { key: "recipes", path: "recept", icon: "📖" },
  { key: "offers", path: "erbjudanden", icon: "🏷", offers: true },
];

/** Whether the offers module is on: it adds its source sensor. */
function offersEnabled(hass) {
  return Object.values(hass?.entities || {}).some(
    (e) => e.platform === DOMAIN && e.translation_key === "offers_source"
  );
}

// Opening the dashboard lands on its first view; send it on to the tab this
// device used last instead. Only on entering the dashboard, not when a tab
// is clicked, and a link straight to another tab is left alone.
const LAST_VIEW_KEY = "food_planning.last_view:";
let navSwitching = false;

function navLocation() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  if (NAV_ITEMS.some((item) => item.path === last)) {
    return { base: "/" + parts.slice(0, -1).join("/"), current: last };
  }
  // The dashboard's own URL without a view shows the first view.
  return { base: "/" + parts.join("/"), current: NAV_ITEMS[0].path };
}

function navigateTo(path) {
  window.history.replaceState(window.history.state, "", path);
  window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: true } }));
}

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

  set hass(hass) {
    this._hass = hass;
    if (this._timers) this._timers.hass = hass;
    const offers = offersEnabled(hass);
    if (offers !== this._offers) {
      this._offers = offers;
      this._render();
    }
  }

  connectedCallback() {
    const switching = navSwitching;
    navSwitching = false;
    if (this._config?.active && this._config.active !== navLocation().current) return; // e.g. edit-mode preview
    const { base, current } = navLocation();
    const key = LAST_VIEW_KEY + base;
    let last = null;
    try {
      last = window.localStorage.getItem(key);
    } catch (_err) {
      /* storage blocked */
    }
    // The offers view only exists while offers are on.
    const known = NAV_ITEMS.some((i) => i.path === last && (!i.offers || offersEnabled(this._hass)));
    if (!switching && current === NAV_ITEMS[0].path && last && last !== current && known) {
      navSwitching = true;
      navigateTo(`${base}/${last}`);
      return;
    }
    try {
      window.localStorage.setItem(key, current);
    } catch (_err) {
      /* storage blocked */
    }
  }

  getCardSize() {
    return 1;
  }

  getGridOptions() {
    // Grows with the running timers shown under the tabs.
    return { columns: "full", rows: "auto" };
  }

  _render() {
    const { base, current } = navLocation();
    const nav = el("nav", { attrs: { role: "tablist" } });
    for (const item of NAV_ITEMS) {
      if (item.offers && !this._offers) continue;
      const active = item.path === (this._config.active || current);
      const tab = el("button", {
        cls: active ? "active" : "",
        attrs: { role: "tab", "aria-selected": String(active) },
      }, el("span", { cls: "icon", text: item.icon }), el("span", { text: this._t[item.key] }));
      tab.addEventListener("click", () => {
        if (active) return;
        navSwitching = true;
        navigateTo(`${base}/${item.path}`);
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
      food-planning-timers { margin-top: 8px; }
      @media (max-width: 560px) {
        .icon { display: none; }
        button { padding: 10px 4px; font-size: 13px; }
      }
    `,
    });
    this._timers = document.createElement("food-planning-timers");
    this._timers.language = this._config.language || "sv";
    if (this._hass) this._timers.hass = this._hass;
    this.shadowRoot.replaceChildren(style, nav, this._timers);
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
    this._offers = null;
    this._offersUnsub = null;
    this._openOffer = null;
  }

  setConfig(config) {
    if (!config || !["shopping", "pantry"].includes(config.list)) {
      throw new Error("list must be 'shopping' or 'pantry'");
    }
    this._config = config;
    const strings = LIST_STRINGS[config.language] || LIST_STRINGS.sv;
    this._t = { ...strings, ...strings[config.list] };
    this._o = OFFER_STRINGS[config.language] || OFFER_STRINGS.sv;
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
    for (const key of ["_unsub", "_offersUnsub"]) {
      const unsub = this[key];
      this[key] = null;
      if (unsub) unsub.then((fn) => fn()).catch(() => {});
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
    // Offers are optional: an older integration or offers turned off
    // just means no tags.
    this._offersUnsub = this._hass.connection.subscribeMessage(
      (msg) => {
        this._offers = msg.enabled ? msg : null;
        this._render();
      },
      { type: `${DOMAIN}/offers/items/subscribe` }
    );
    this._offersUnsub.catch(() => {});
  }

  /** At home items hidden from the stock-up strip, until next week. */
  _hiddenRefill() {
    const week = isoWeek(new Date());
    try {
      const saved = JSON.parse(localStorage.getItem("food_planning.refill_hidden") || "{}");
      return saved.week === week ? new Set(saved.keys) : new Set();
    } catch (_err) {
      return new Set();
    }
  }

  _hideRefill(key) {
    const keys = this._hiddenRefill();
    keys.add(key);
    try {
      localStorage.setItem("food_planning.refill_hidden", JSON.stringify({ week: isoWeek(new Date()), keys: [...keys] }));
    } catch (_err) {
      /* private mode: hidden until reload */
    }
    this._render();
  }

  _refillStrip() {
    const o = this._o;
    const hidden = this._hiddenRefill();
    const refill = (this._offers?.refill || []).filter((r) => !hidden.has(nameKey(r.summary)));
    if (!refill.length) return null;
    const rows = refill.map((r) => {
      const add = el("button", { cls: "icon-button add", text: "+", attrs: { title: o.refillAdd, "aria-label": o.refillAdd } });
      add.addEventListener("click", async () => {
        add.disabled = true;
        const shopping = findListEntity(this._hass, "shopping_list", "todo.food_planning_shopping_list");
        try {
          await this._hass.callWS({
            type: "call_service",
            domain: "todo",
            service: "add_item",
            service_data: { item: r.summary },
            target: { entity_id: shopping },
          });
          this._setStatus(o.added(r.summary));
          this._hideRefill(nameKey(r.summary));
        } catch (err) {
          this._setStatus(errorMessage(err), true);
          add.disabled = false;
        }
      });
      const hide = el("button", { cls: "icon-button", text: "✕", attrs: { title: o.refillHide, "aria-label": o.refillHide } });
      hide.addEventListener("click", () => this._hideRefill(nameKey(r.summary)));
      return el("li", {}, el("span", { cls: "text", text: r.summary }), offerTag(r.offer, o, { chain: true }), add, hide);
    });
    return el("div", { cls: "refill" }, el("h2", {}, el("span", { text: o.refill })), el("ul", {}, ...rows));
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
      li.has-offer { flex-wrap: wrap; }
      li .offer-pop { flex-basis: 100%; margin-left: 30px; }
      .refill { margin-top: 8px; padding: 4px 12px 8px; border-radius: var(--fp-radius); background: color-mix(in srgb, #ffd21f 10%, transparent); }
      .refill h2 { margin-top: 8px; }
      .refill li { border-bottom: none; padding: 3px 0; }
      .refill li .text { cursor: default; }
      .refill .icon-button.add { color: var(--primary-color); font-size: 20px; }
      .refill .icon-button.add:hover { color: var(--primary-color); }
      .savings { font-size: 12px; color: var(--secondary-text-color); margin: 8px 0 0; }
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
    if (this._config.list === "pantry" && this._offers) {
      const strip = this._refillStrip();
      if (strip) content.push(strip);
    }
    if (this._items !== null && !items.length) content.push(el("p", { cls: "empty", text: t.empty }));
    if (open.length) {
      content.push(el("h2", {}, el("span", { text: `${t.open} (${open.length})` })));
      content.push(el("ul", {}, ...open.map((item) => this._row(item))));
      if (this._config.list === "shopping" && this._offers) {
        const seen = new Set();
        let saving = 0;
        for (const item of open) {
          const found = this._offers.items?.[nameKey(item.summary)];
          const key = found && `${found[0].store}|${found[0].heading}`;
          if (found && !seen.has(key)) {
            seen.add(key);
            saving += found[0].saving || 0;
          }
        }
        if (saving > 0) content.push(el("p", { cls: "savings", text: this._o.listSavings(formatKr(saving)) }));
      }
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
    // Updates arrive while typing (another device, a merge); keep the text.
    const focused = this.shadowRoot.activeElement;
    const keepAdd = focused && focused.closest && focused.closest("form.add") ? this.shadowRoot.querySelector("form.add input")?.value : null;
    const oldEdit = this.shadowRoot.querySelector("li.editing input[type=text]");
    const keepEdit = oldEdit && oldEdit.dataset.uid === this._editing ? oldEdit.value : null;
    this.shadowRoot.replaceChildren(style, card);
    if (keepAdd !== null && keepAdd !== undefined) {
      addInput.value = keepAdd;
      addInput.focus();
    }
    if (this._statusText) this._setStatus(this._statusText.text, this._statusText.isError);
    const editInput = this.shadowRoot.querySelector("li.editing input[type=text]");
    if (editInput) {
      if (keepEdit !== null) editInput.value = keepEdit;
      editInput.focus();
    } else if (this._editing && this._items && !this._items.some((i) => i.uid === this._editing)) {
      this._editing = null; // removed elsewhere
    }
  }

  _row(item) {
    const t = this._t;
    const isDone = item.status === "completed";
    if (this._editing === item.uid) {
      const input = el("input", { attrs: { type: "text", "data-uid": item.uid } });
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
    // At home items on offer show in the stock-up strip instead.
    const found = !isDone && this._config.list === "shopping" && this._offers?.items?.[nameKey(item.summary)];
    if (!found) return el("li", { cls: isDone ? "done" : "" }, check, text, remove);
    const tag = offerTag(found[0], this._o, { chain: true });
    tag.addEventListener("click", () => {
      this._openOffer = this._openOffer === item.uid ? null : item.uid;
      this._render();
    });
    const li = el("li", { cls: "has-offer" }, check, text, tag, remove);
    if (this._openOffer === item.uid) li.append(offerDetails(found, this._o));
    return li;
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

/* ------------------------------------------------------------------ */
/* Erbjudanden: every current offer at the selected stores             */
/* ------------------------------------------------------------------ */

const OFFERS_VIEW_STRINGS = {
  sv: {
    title: "Erbjudanden",
    summary: (offers, stores, until) => `${offers} erbjudanden i ${stores} ${stores === 1 ? "butik" : "butiker"}${until ? ` · t.o.m. ${until}` : ""}`,
    search: "Sök vara, t.ex. kyckling",
    allStores: "Alla butiker",
    onlyDiscount: "Bara rabatt",
    onlyYours: "⭐ Era varor",
    yours: "⭐ Ni brukar köpa",
    none: "Inga erbjudanden matchar.",
    off: "Erbjudanden är avstängt. Slå på det under Food Planning → Konfigurera.",
    loading: "Hämtar erbjudanden…",
    showMore: (n) => `Visa fler (${n} till)`,
    addToList: "Lägg på inköpslistan",
    added: (name) => `”${name}” lades på inköpslistan.`,
    storeFailed: "kunde inte hämtas, visar senaste",
  },
  en: {
    title: "Offers",
    summary: (offers, stores, until) => `${offers} offers at ${stores} ${stores === 1 ? "store" : "stores"}${until ? ` · until ${until}` : ""}`,
    search: "Search, e.g. chicken",
    allStores: "All stores",
    onlyDiscount: "Discount only",
    onlyYours: "⭐ Your products",
    yours: "⭐ You usually buy",
    none: "No offers match.",
    off: "Offers are turned off. Turn them on under Food Planning → Configure.",
    loading: "Fetching offers…",
    showMore: (n) => `Show more (${n} left)`,
    addToList: "Add to shopping list",
    added: (name) => `“${name}” was added to the shopping list.`,
    storeFailed: "couldn't be fetched, showing the last",
  },
};
const OFFERS_PAGE = 60;

/**
 * Browse all current offers: search, filter by store, discount first.
 *
 *   type: custom:food-planning-offers-card
 */
class FoodPlanningOffersCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._data = null;
    this._search = "";
    this._store = null;
    this._onlyDiscount = false;
    this._onlyYours = false;
    this._limit = OFFERS_PAGE;
    this._unsub = null;
  }

  setConfig(config) {
    this._config = config || {};
    this._t = OFFERS_VIEW_STRINGS[this._config.language] || OFFERS_VIEW_STRINGS.sv;
    this._o = OFFER_STRINGS[this._config.language] || OFFER_STRINGS.sv;
    this._build();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._unsub && this.isConnected) this._subscribe();
  }

  connectedCallback() {
    if (this._hass && !this._unsub) this._subscribe();
  }

  disconnectedCallback() {
    if (this._unsub) {
      this._unsub.then((fn) => fn()).catch(() => {});
      this._unsub = null;
    }
  }

  getCardSize() {
    return 8;
  }

  getGridOptions() {
    return { columns: "full", min_rows: 4 };
  }

  _subscribe() {
    this._unsub = this._hass.connection.subscribeMessage(
      (msg) => {
        this._data = msg;
        this._renderList();
      },
      { type: `${DOMAIN}/offers/subscribe` }
    );
    this._unsub.catch((err) => this._setStatus(errorMessage(err), true));
  }

  _setStatus(text, isError = false) {
    this._status.textContent = text || "";
    this._status.classList.toggle("error", isError);
    this._status.toggleAttribute("hidden", !text);
  }

  _build() {
    const t = this._t;
    const style = el("style", {
      text:
        SHARED_CSS +
        `
      ha-card { padding: 16px; }
      h1 { margin: 0; font-size: 20px; font-weight: 500; }
      .summary { margin: 4px 0 12px; font-size: 13px; color: var(--secondary-text-color); }
      .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
      .chip {
        padding: 6px 12px; font-size: 13px; background: transparent;
        color: var(--primary-text-color); border: 1px solid var(--divider-color);
      }
      .chip.active { background: var(--primary-color); color: var(--text-primary-color, #fff); border-color: transparent; }
      .chip.discount.active { background: #ffd21f; color: #2a2100; }
      .grid { display: grid; gap: 10px; margin-top: 14px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
      .offer {
        display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 12px; padding: 10px;
        border-radius: var(--fp-radius); background: var(--secondary-background-color); align-items: start;
      }
      .offer.yours { box-shadow: inset 0 0 0 2px color-mix(in srgb, #ffd21f 70%, transparent); }
      .offer img, .offer .placeholder {
        width: 72px; height: 72px; object-fit: contain; border-radius: 8px; background: #fff; font-size: 28px;
      }
      .offer .body { min-width: 0; display: grid; gap: 3px; }
      .offer .head { font-weight: 500; line-height: 1.25; overflow-wrap: anywhere; }
      .offer .desc { font-size: 12px; color: var(--secondary-text-color); line-height: 1.35;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .offer .price { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 2px; }
      .offer .ord { font-size: 12px; color: var(--secondary-text-color); }
      .offer .where { font-size: 12px; color: var(--secondary-text-color); }
      .offer .mine { font-size: 12px; color: var(--primary-color); }
      .offer .row { display: flex; align-items: center; gap: 6px; justify-content: space-between; }
      .offer .add {
        width: 30px; height: 30px; padding: 0; border-radius: 50%; flex: none;
        background: transparent; color: var(--primary-color); border: 1px solid var(--divider-color); font-size: 18px;
      }
      .more { margin-top: 12px; }
      .empty { margin: 16px 0 0; color: var(--secondary-text-color); }
    `,
    });
    this._summary = el("p", { cls: "summary", text: t.loading });
    this._searchInput = el("input", { attrs: { type: "search", placeholder: t.search } });
    this._searchInput.addEventListener("input", () => {
      this._search = this._searchInput.value.trim().toLowerCase();
      this._limit = OFFERS_PAGE;
      this._renderList();
    });
    this._chips = el("div", { cls: "chips" });
    this._status = el("p", { cls: "status", attrs: { hidden: "" } });
    this._grid = el("div", { cls: "grid" });
    this._more = el("button", { cls: "secondary more", attrs: { hidden: "" } });
    this._more.addEventListener("click", () => {
      this._limit += OFFERS_PAGE;
      this._renderList();
    });
    this._empty = el("p", { cls: "empty", attrs: { hidden: "" } });
    const card = el(
      "ha-card",
      {},
      el("h1", { text: this._config.title || t.title }),
      this._summary,
      this._searchInput,
      this._chips,
      this._status,
      this._grid,
      this._more,
      this._empty
    );
    this.shadowRoot.replaceChildren(style, card);
  }

  _renderChips(stores) {
    const t = this._t;
    const chip = (label, active, onClick, cls = "") => {
      const node = el("button", { cls: `chip ${cls}`, text: label });
      node.classList.toggle("active", active);
      node.addEventListener("click", () => {
        onClick();
        this._limit = OFFERS_PAGE;
        this._renderList();
      });
      return node;
    };
    this._chips.replaceChildren(
      chip(t.allStores, this._store === null, () => (this._store = null)),
      ...stores.map((s) => chip(s.title, this._store === s.id, () => (this._store = s.id))),
      chip(`🏷 ${t.onlyDiscount}`, this._onlyDiscount, () => (this._onlyDiscount = !this._onlyDiscount), "discount"),
      chip(t.onlyYours, this._onlyYours, () => (this._onlyYours = !this._onlyYours))
    );
  }

  _renderList() {
    const t = this._t;
    const data = this._data;
    if (!data) return;
    if (!data.enabled) {
      this._summary.textContent = "";
      this._chips.replaceChildren();
      this._grid.replaceChildren();
      this._more.toggleAttribute("hidden", true);
      this._empty.textContent = t.off;
      this._empty.toggleAttribute("hidden", false);
      return;
    }
    const stores = data.stores || [];
    if (this._store && !stores.some((s) => s.id === this._store)) this._store = null;
    const until = stores.map((s) => s.valid_until).filter(Boolean).sort()[0];
    this._summary.textContent = t.summary(data.offers.length, stores.length, until ? formatOfferDate(until, this._o.lang) : "");
    this._renderChips(stores);
    const minDiscount = data.min_discount ?? 10;
    const shown = data.offers
      .filter((o) => {
        if (this._store && o.store_id !== this._store) return false;
        if (this._onlyDiscount && !(o.discount_percent >= minDiscount)) return false;
        if (this._onlyYours && !(o.products || []).length) return false;
        if (!this._search) return true;
        return `${o.heading} ${o.description} ${(o.products || []).join(" ")}`.toLowerCase().includes(this._search);
      })
      .sort(
        (a, b) =>
          (b.products?.length ? 1 : 0) - (a.products?.length ? 1 : 0) ||
          (b.discount_percent || 0) - (a.discount_percent || 0) ||
          a.unit_price - b.unit_price
      );
    this._grid.replaceChildren(...shown.slice(0, this._limit).map((o) => this._offer(o, minDiscount)));
    const left = shown.length - this._limit;
    this._more.textContent = t.showMore(left);
    this._more.toggleAttribute("hidden", left <= 0);
    this._empty.textContent = shown.length ? "" : t.none;
    this._empty.toggleAttribute("hidden", Boolean(shown.length));
  }

  _offer(o, minDiscount) {
    const t = this._t;
    const offer = { ...o, deal: o.discount_percent >= minDiscount };
    const src = safeUrl(o.image);
    const image = src
      ? el("img", { attrs: { src, alt: "", loading: "lazy", referrerpolicy: "no-referrer" } })
      : el("div", { cls: "placeholder", text: "🏷" });
    if (src) image.addEventListener("error", () => image.replaceWith(el("div", { cls: "placeholder", text: "🏷" })), { once: true });
    const price = el("div", { cls: "price" }, offerTag(offer, this._o));
    if (o.discount_source === "stated" && o.ordinary_price) {
      price.append(el("span", { cls: "ord", text: `${this._o.ordinary.toLowerCase()} ${formatKr(o.ordinary_price)}` }));
    } else if (o.discount_source === "lowest_30d" && o.ordinary_price) {
      price.append(el("span", { cls: "ord", text: `${this._o.lowest.toLowerCase()} ${formatKr(o.ordinary_price)}` }));
    }
    const extras = [o.quantity, o.comparison, o.max_per_household ? this._o.max(o.max_per_household) : null].filter(Boolean);
    const where = `${o.store} · ${this._o.until.toLowerCase()} ${formatOfferDate(o.valid_until, this._o.lang)}`;
    const add = el("button", { cls: "add", text: "+", attrs: { title: t.addToList, "aria-label": t.addToList } });
    add.addEventListener("click", async () => {
      add.disabled = true;
      const name = (o.products || [])[0] || o.heading.charAt(0) + o.heading.slice(1).toLowerCase();
      const item = name.charAt(0).toUpperCase() + name.slice(1);
      try {
        await this._hass.callWS({
          type: "call_service",
          domain: "todo",
          service: "add_item",
          service_data: { item },
          target: { entity_id: findListEntity(this._hass, "shopping_list", "todo.food_planning_shopping_list") },
        });
        this._setStatus(t.added(item));
      } catch (err) {
        this._setStatus(errorMessage(err), true);
        add.disabled = false;
      }
    });
    const body = el(
      "div",
      { cls: "body" },
      el("div", { cls: "row" }, el("span", { cls: "head", text: o.heading }), add),
      o.description ? el("div", { cls: "desc", text: o.description }) : null,
      price,
      extras.length ? el("div", { cls: "where", text: extras.join(" · ") }) : null,
      el("div", { cls: "where", text: where }),
      (o.products || []).length ? el("div", { cls: "mine", text: `${t.yours}: ${o.products.join(", ")}` }) : null
    );
    return el("div", { cls: `offer${(o.products || []).length ? " yours" : ""}` }, image, body);
  }
}

if (!customElements.get("food-planning-offers-card")) {
  customElements.define("food-planning-offers-card", FoodPlanningOffersCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "food-planning-offers-card",
    name: "Food Planning offers",
    description: "All current offers at the selected stores.",
  });
}

/* ------------------------------------------------------------------ */
/* "What can we cook?" box for the At home view                        */
/* ------------------------------------------------------------------ */

const COOK_STRINGS = {
  sv: {
    title: "🍳 Det här kan ni laga",
    ready: "Allt finns hemma",
    almost: "Nästan – saknar lite",
    missing: (items) => `saknar ${items.join(", ")}`,
    shop: "+ Handla",
    added: (title, n) => `${n} ${n === 1 ? "vara" : "varor"} till ”${title}” lades på inköpslistan.`,
    none: "Inget recept kan lagas med det som finns hemma just nu.",
    checking: "Kollar recepten mot det som finns hemma…",
    noRecipes: "Lägg till recept under Recept så visas här vad ni kan laga.",
  },
  en: {
    title: "🍳 What you can cook",
    ready: "Everything is at home",
    almost: "Almost – missing a little",
    missing: (items) => `missing ${items.join(", ")}`,
    shop: "+ Shop",
    added: (title, n) => `${n} ${n === 1 ? "item" : "items"} for “${title}” added to the shopping list.`,
    none: "Nothing can be cooked with what's at home right now.",
    checking: "Checking the recipes against what's at home…",
    noRecipes: "Add recipes under Recipes to see what you can cook here.",
  },
};

/**
 * Which recipes can be cooked with what's at home, and which are close.
 *
 *   type: custom:food-planning-cook-card
 *   almost: 2   # show recipes missing at most this many ingredients
 */
class FoodPlanningCookCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._recipes = null;
    this._categories = [];
    this._unsub = null;
    this._subscribing = false;
  }

  setConfig(config) {
    this._config = config || {};
    this._t = COOK_STRINGS[this._config.language] || COOK_STRINGS.sv;
    this._recipeStrings = STRINGS[this._config.language] || STRINGS.sv;
    this._render();
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
    return 3;
  }

  getGridOptions() {
    return { columns: "full" };
  }

  async _subscribe() {
    this._subscribing = true;
    try {
      this._unsub = await this._hass.connection.subscribeMessage(
        (msg) => {
          this._recipes = msg.recipes;
          this._categories = msg.categories || [];
          this._render();
          if (this._dialog) this._dialog.update(this._recipes, this._categories);
        },
        { type: `${DOMAIN}/recipes/subscribe` }
      );
      if (!this.isConnected) this.disconnectedCallback();
    } catch (_err) {
      /* the recipe card shows the error; keep this box quiet */
    } finally {
      this._subscribing = false;
    }
  }

  _render() {
    if (!this._config) return;
    const t = this._t;
    const limit = Number(this._config.almost ?? 2);
    const recipes = this._recipes || [];
    const ready = recipes.filter((r) => r.status === "ready");
    const almost = recipes
      .filter((r) => r.status === "missing" && r.missing.length <= limit)
      .sort((a, b) => a.missing.length - b.missing.length);
    const unchecked = recipes.some((r) => r.status === null && r.ingredients.length);

    const style = el("style", {
      text:
        SHARED_CSS +
        `
      ha-card { padding: 16px; }
      h1 { margin: 0 0 4px; font-size: 18px; font-weight: 500; }
      h2 {
        margin: 14px 0 6px; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase;
        color: var(--secondary-text-color); font-weight: 600;
      }
      .ready { display: flex; flex-wrap: wrap; gap: 8px; }
      .pill {
        all: unset; cursor: pointer; display: flex; align-items: center; gap: 8px;
        padding: 4px 12px 4px 4px; border-radius: 999px; background: var(--secondary-background-color);
      }
      .pill img, .pill .placeholder { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; font-size: 16px; }
      .pill:focus-visible { outline: 2px solid var(--primary-color); }
      .pill .time, li .name .time { font-size: 12px; font-weight: 400; color: var(--secondary-text-color); }
      ul { list-style: none; margin: 0; padding: 0; }
      li { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--divider-color); }
      li .what { flex: 1; min-width: 0; cursor: pointer; }
      li .name { font-weight: 500; }
      li .miss { font-size: 13px; color: var(--secondary-text-color); }
      li button { padding: 6px 12px; font-size: 13px; flex: none; }
      .muted { color: var(--secondary-text-color); margin: 8px 0 0; }
    `,
    });

    const content = [el("h1", { text: t.title })];
    if (this._recipes === null) {
      // waiting for data
    } else if (!recipes.length) {
      content.push(el("p", { cls: "muted", text: t.noRecipes }));
    } else {
      if (ready.length) {
        content.push(el("h2", { text: t.ready }));
        const row = el("div", { cls: "ready" });
        for (const recipe of ready) {
          const pill = el("button", { cls: "pill" }, recipeImage(recipe), el("span", { text: recipe.title }));
          if (recipe.total_minutes) pill.append(el("span", { cls: "time", text: formatMinutes(recipe.total_minutes) }));
          pill.addEventListener("click", () => this._open(recipe.uid));
          row.append(pill);
        }
        content.push(row);
      }
      if (almost.length) {
        content.push(el("h2", { text: t.almost }));
        const list = el("ul");
        for (const recipe of almost) {
          const what = el(
            "div",
            { cls: "what" },
            el(
              "div",
              { cls: "name", text: recipe.title },
              ...(recipe.total_minutes ? [el("span", { cls: "time", text: ` · ${formatMinutes(recipe.total_minutes)}` })] : [])
            ),
            el("div", { cls: "miss", text: t.missing(recipe.missing) })
          );
          what.addEventListener("click", () => this._open(recipe.uid));
          const shop = el("button", { cls: "secondary", text: t.shop });
          shop.addEventListener("click", () => this._shop(recipe, shop));
          list.append(el("li", {}, what, shop));
        }
        content.push(list);
      }
      if (!ready.length && !almost.length) {
        content.push(el("p", { cls: "muted", text: unchecked ? t.checking : t.none }));
      } else if (unchecked) {
        content.push(el("p", { cls: "muted", text: t.checking }));
      }
    }
    this._status = el("p", { cls: "status", attrs: { hidden: "" } });
    content.push(this._status);
    this.shadowRoot.replaceChildren(style, el("ha-card", {}, ...content));
    if (this._statusText) this._setStatus(this._statusText.text, this._statusText.isError);
  }

  _setStatus(text, isError = false) {
    this._statusText = text ? { text, isError } : null;
    if (!this._status) return;
    this._status.textContent = text || "";
    this._status.classList.toggle("error", isError);
    this._status.toggleAttribute("hidden", !text);
  }

  async _shop(recipe, button) {
    button.disabled = true;
    try {
      const result = await this._hass.callWS({
        type: "call_service",
        domain: DOMAIN,
        service: "add_recipe_to_shopping_list",
        service_data: { recipe: recipe.uid, ingredients: recipe.missing },
        return_response: true,
      });
      this._setStatus(this._t.added(recipe.title, result?.response?.added ?? 0));
    } catch (err) {
      this._setStatus(errorMessage(err), true);
      button.disabled = false;
    }
  }

  _open(uid) {
    if (this._dialog) this._dialog.close();
    const dialog = document.createElement("food-planning-recipe-dialog");
    dialog.setup({
      hass: this._hass,
      t: this._recipeStrings,
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

if (!customElements.get("food-planning-cook-card")) {
  customElements.define("food-planning-cook-card", FoodPlanningCookCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "food-planning-cook-card",
    name: "Food Planning: what can we cook",
    description: "Recipes you can cook with what's at home, and those that are close.",
  });
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
    offers: "Erbjudanden",
    moveHome: "Flytta inhandlat till Hemma",
    moveHomeConfirm: "Flytta allt som är avbockat till Hemma?",
  },
  en: {
    shopping: "Shopping list",
    pantry: "At home",
    recipes: "Recipes",
    offers: "Offers",
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
  static async generate(config, hass) {
    const t = DASHBOARD_STRINGS[config?.language] || DASHBOARD_STRINGS.sv;
    const lang = config?.language ? { language: config.language } : {};
    // Subviews: the header shows a back arrow to wherever the dashboard was
    // opened from (or back_path), and the nav card switches between views.
    const view = (title, path, cards) => ({
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
          cards: [{ type: "custom:food-planning-nav", active: path, ...lang }, ...[].concat(cards)],
        },
      ],
    });
    return {
      views: [
        view(t.shopping, "inkopslista", { type: "custom:food-planning-list-card", list: "shopping", ...lang }),
        view(t.pantry, "hemma", [
          { type: "custom:food-planning-list-card", list: "pantry", ...lang },
          { type: "custom:food-planning-cook-card", ...lang },
        ]),
        view(t.recipes, "recept", { type: "custom:food-planning-card", title: t.recipes, ...lang }),
        ...(offersEnabled(hass) ? [view(t.offers, "erbjudanden", { type: "custom:food-planning-offers-card", ...lang })] : []),
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
