"""Persistent storage for recipes and the shopping list."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import asdict, dataclass, field, fields
from typing import Any, Self
from uuid import uuid4

from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import STORAGE_KEY, STORAGE_VERSION

STATUS_NEEDS_ACTION = "needs_action"
STATUS_COMPLETED = "completed"
# Recipe categories a new install starts with; users add and remove their own.
DEFAULT_CATEGORIES = {
    "sv": [
        "Frukost",
        "Lunch",
        "Middag",
        "Förrätt",
        "Efterrätt",
        "Bakning",
        "Mellanmål",
        "Vegetariskt",
        "Snabbt",
    ],
    "en": [
        "Breakfast",
        "Lunch",
        "Dinner",
        "Starter",
        "Dessert",
        "Baking",
        "Snack",
        "Vegetarian",
        "Quick",
    ],
}

# The two item lists: what to buy, and what's at home.
SHOPPING = "shopping"
PANTRY = "pantry"
LISTS = (SHOPPING, PANTRY)
# Joins the recipe names shown under a shopping item.
RECIPE_SEPARATOR = " · "


def name_key(text: str) -> str:
    """How an item's text is looked up in the product names (see names)."""
    return " ".join(text.casefold().split())


# Product name for ingredients that never need to be at home: water, salt,
# pepper and optional ones ("till servering", "efter smak").
ALWAYS_AVAILABLE = "-"


def _new_uid() -> str:
    return uuid4().hex


def _from_dict[T](cls: type[T], data: dict[str, Any]) -> T:
    """Build a dataclass from stored data, ignoring unknown keys."""
    names = {f.name for f in fields(cls)}  # type: ignore[arg-type]
    return cls(**{k: v for k, v in data.items() if k in names})


@dataclass
class Recipe:
    """A stored recipe."""

    title: str
    ingredients: list[str] = field(default_factory=list)
    steps: list[str] = field(default_factory=list)
    servings: str | None = None
    notes: str | None = None
    source_url: str | None = None
    # Remote image the recipe came with, and the local copy saved at import
    # (a file name in the images folder). The local copy is preferred:
    # remote links, e.g. TikTok's, can expire.
    image_url: str | None = None
    image: str | None = None
    # Set when the ingredients are added to the shopping list, cleared when
    # the recipe is marked as cooked. Drives "ready to cook".
    on_shopping_list: bool = False
    categories: list[str] = field(default_factory=list)
    # Indexes of ingredients not at home, worked out from the product names
    # after the pantry or the recipe changed; None until checked. See
    # pantry_match.py.
    missing: list[int] | None = None
    uid: str = field(default_factory=_new_uid)
    created: str = field(default_factory=lambda: dt_util.utcnow().isoformat())


@dataclass
class ShoppingItem:
    """An item on the shopping list."""

    summary: str
    status: str = STATUS_NEEDS_ACTION
    # Which recipe(s) the item is for: names shown under the item, and uids
    # used to tell when everything for a recipe has been bought.
    description: str | None = None
    recipe_uids: list[str] = field(default_factory=list)
    uid: str = field(default_factory=_new_uid)


def _shopping_item_from_dict(data: dict[str, Any]) -> ShoppingItem:
    item = _from_dict(ShoppingItem, data)
    # Version 0.3 and earlier stored a single recipe_uid.
    if not item.recipe_uids and data.get("recipe_uid"):
        item.recipe_uids = [data["recipe_uid"]]
    return item


class FoodPlanningStore:
    """Holds recipes, the shopping list and the pantry; persists to .storage."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the store."""
        self._store: Store[dict[str, Any]] = Store(
            hass, STORAGE_VERSION, STORAGE_KEY, private=True
        )
        self.recipes: list[Recipe] = []
        self.categories: list[str] = []
        # Item text (see name_key) -> product name, e.g. "2 finhackade
        # schalottenlökar" -> "schalottenlök". Filled by the AI once per new
        # text; recipes are matched against At home by product name.
        self.names: dict[str, str] = {}
        self.lists: dict[str, list[ShoppingItem]] = {SHOPPING: [], PANTRY: []}
        self._listeners: list[Callable[[], None]] = []

    @property
    def shopping(self) -> list[ShoppingItem]:
        """The shopping list."""
        return self.lists[SHOPPING]

    @property
    def pantry(self) -> list[ShoppingItem]:
        """What's at home."""
        return self.lists[PANTRY]

    @classmethod
    async def async_create(
        cls, hass: HomeAssistant, default_language: str = "sv"
    ) -> Self:
        """Create a store and load its saved data."""
        store = cls(hass)
        data = await store._store.async_load() or {}
        store.categories = list(
            data.get("categories")
            or DEFAULT_CATEGORIES.get(default_language, DEFAULT_CATEGORIES["sv"])
        )
        store.recipes = [_from_dict(Recipe, r) for r in data.get("recipes", [])]
        store.names = {
            k: v
            for k, v in (data.get("names") or {}).items()
            if isinstance(k, str) and isinstance(v, str)
        }
        for list_name in LISTS:
            store.lists[list_name] = [
                _shopping_item_from_dict(i) for i in data.get(list_name, [])
            ]
        store._link_items_by_name()
        return store

    def _link_items_by_name(self) -> None:
        """Link items to recipes named in their description.

        Items from version 0.3 and earlier only remember one recipe, even
        after duplicates from several recipes were merged into them.
        """
        by_title = {r.title: r for r in self.recipes}
        # 0.5–0.8 moved items home with their recipe names; At home is now
        # just what's in the house.
        for item in self.pantry:
            item.recipe_uids = []
            names = [
                n.strip() for n in (item.description or "").split(RECIPE_SEPARATOR)
            ]
            if item.description and all(n in by_title for n in names):
                item.description = None
        for item in self.shopping:
            for name in (item.description or "").split(RECIPE_SEPARATOR):
                recipe = by_title.get(name.strip())
                if recipe and recipe.uid not in item.recipe_uids:
                    item.recipe_uids.append(recipe.uid)
        linked = {uid for item in self.shopping for uid in item.recipe_uids}
        for recipe in self.recipes:
            if recipe.uid in linked:
                recipe.on_shopping_list = True

    async def async_save(self) -> None:
        """Persist all data and notify listeners."""
        await self._store.async_save(
            {
                "recipes": [asdict(r) for r in self.recipes],
                "categories": self.categories,
                "names": self.names,
                **{
                    name: [asdict(i) for i in items]
                    for name, items in self.lists.items()
                },
            }
        )
        for listener in list(self._listeners):
            listener()

    async def async_remove(self) -> None:
        """Delete the storage file."""
        await self._store.async_remove()

    @callback
    def async_add_listener(self, listener: Callable[[], None]) -> CALLBACK_TYPE:
        """Call listener after every save. Returns a function that unsubscribes."""
        self._listeners.append(listener)

        @callback
        def _remove() -> None:
            if listener in self._listeners:
                self._listeners.remove(listener)

        return _remove

    # Product names

    def product_name(self, text: str) -> str | None:
        """The product name for an item's text, if known."""
        return self.names.get(name_key(text))

    def prune_names(self) -> None:
        """Forget names of texts no longer on any recipe or list."""
        used = {name_key(t) for r in self.recipes for t in r.ingredients}
        used.update(name_key(i.summary) for items in self.lists.values() for i in items)
        self.names = {k: v for k, v in self.names.items() if k in used}

    # Recipes

    def get_recipe(self, uid: str) -> Recipe | None:
        """Return the recipe with this uid."""
        return next((r for r in self.recipes if r.uid == uid), None)

    def find_recipe(self, key: str) -> Recipe | None:
        """Find a recipe by uid or, case-insensitively, by title."""
        if recipe := self.get_recipe(key):
            return recipe
        wanted = key.strip().casefold()
        return next((r for r in self.recipes if r.title.casefold() == wanted), None)

    def add_recipe(self, recipe: Recipe) -> None:
        """Add a recipe at the top of the list."""
        self.recipes.insert(0, recipe)

    def update_recipe(self, uid: str, changes: dict[str, Any]) -> Recipe | None:
        """Apply edited fields to a recipe. Returns None if it doesn't exist."""
        recipe = self.get_recipe(uid)
        if recipe is None:
            return None
        old_title = recipe.title
        for key in ("title", "servings", "ingredients", "steps", "notes", "source_url"):
            if key in changes:
                setattr(recipe, key, changes[key])
        if "categories" in changes:
            recipe.categories = self.normalize_categories(changes["categories"])
        if recipe.title != old_title:
            # Keep the recipe names under list items in step.
            for item in self.shopping + self.pantry:
                if recipe.uid in item.recipe_uids and item.description:
                    item.description = RECIPE_SEPARATOR.join(
                        recipe.title if name == old_title else name
                        for name in item.description.split(RECIPE_SEPARATOR)
                    )
        return recipe

    def normalize_categories(self, names: list[str], *, add: bool = False) -> list[str]:
        """Map names to known categories (case-insensitively), in list order.

        Unknown names are added to the category list when add is True and
        dropped otherwise (e.g. ones the AI made up).
        """
        known = {c.casefold(): c for c in self.categories}
        result: list[str] = []
        for name in names:
            name = name.strip()
            if not name:
                continue
            if (match := known.get(name.casefold())) is None:
                if not add:
                    continue
                self.categories.append(name)
                match = known[name.casefold()] = name
            if match not in result:
                result.append(match)
        return result

    def set_categories(self, names: list[str]) -> None:
        """Replace the category list; removed ones are taken off recipes.

        A name that only changes case keeps its recipes.
        """
        new: list[str] = []
        for name in names:
            if (name := name.strip()) and name.casefold() not in {
                n.casefold() for n in new
            }:
                new.append(name)
        by_folded = {n.casefold(): n for n in new}
        for recipe in self.recipes:
            recipe.categories = [
                by_folded[c.casefold()]
                for c in recipe.categories
                if c.casefold() in by_folded
            ]
        self.categories = new

    def delete_recipe(self, uid: str) -> Recipe | None:
        """Delete a recipe and return it, or None if it didn't exist."""
        recipe = self.get_recipe(uid)
        if recipe is not None:
            self.recipes.remove(recipe)
        return recipe

    # Shopping list and pantry

    def get_item(self, list_name: str, uid: str) -> ShoppingItem | None:
        """Return the item with this uid from a list."""
        return next((i for i in self.lists[list_name] if i.uid == uid), None)

    def open_items(self, list_name: str) -> list[ShoppingItem]:
        """Return a list's items that haven't been ticked off."""
        return [i for i in self.lists[list_name] if i.status == STATUS_NEEDS_ACTION]

    def delete_items(self, list_name: str, uids: set[str]) -> None:
        """Delete items from a list."""
        self.lists[list_name][:] = [
            i for i in self.lists[list_name] if i.uid not in uids
        ]

    def move_item(self, list_name: str, uid: str, previous_uid: str | None) -> bool:
        """Move an item to just after previous_uid, or first if None.

        Returns False if the item does not exist.
        """
        items = self.lists[list_name]
        item = self.get_item(list_name, uid)
        if item is None:
            return False
        items.remove(item)
        index = next(
            (i + 1 for i, other in enumerate(items) if other.uid == previous_uid),
            0 if previous_uid is None else len(items),
        )
        items.insert(index, item)
        return True

    def add_recipe_to_shopping(
        self,
        recipe: Recipe,
        *,
        only_missing: bool = False,
        ingredients: list[str] | None = None,
    ) -> list[ShoppingItem]:
        """Add a recipe's ingredients, skipping exact copies of open items.

        Near-duplicates ("2 msk olivolja" vs "15 ml olivolja") are merged
        afterwards by the AI, see merge.py. Returns the items added.
        """
        recipe.on_shopping_list = True
        added: list[ShoppingItem] = []
        open_items: dict[str, ShoppingItem] = {
            s.summary.casefold(): s for s in self.open_items(SHOPPING)
        }
        if ingredients is not None:
            # A chosen subset; only the recipe's own ingredients count.
            own = set(recipe.ingredients)
            ingredients = [i for i in ingredients if i in own]
        elif only_missing and recipe.missing is not None:
            ingredients = [
                recipe.ingredients[i]
                for i in recipe.missing
                if i < len(recipe.ingredients)
            ]
        else:
            ingredients = recipe.ingredients
        for ingredient in ingredients:
            if existing := open_items.get(ingredient.casefold()):
                if recipe.uid not in existing.recipe_uids:
                    existing.recipe_uids.append(recipe.uid)
                    existing.description = RECIPE_SEPARATOR.join(
                        filter(None, [existing.description, recipe.title])
                    )
                continue
            item = ShoppingItem(
                summary=ingredient, description=recipe.title, recipe_uids=[recipe.uid]
            )
            self.shopping.append(item)
            added.append(item)
            open_items[ingredient.casefold()] = item
        return added

    def recipe_shopping_status(self, recipe: Recipe) -> tuple[int, int]:
        """Return (open, bought) shopping items for a recipe."""
        open_count = bought = 0
        for item in self.shopping:
            if recipe.uid not in item.recipe_uids:
                continue
            if item.status == STATUS_NEEDS_ACTION:
                open_count += 1
            else:
                bought += 1
        return open_count, bought

    def move_bought_to_pantry(self) -> list[ShoppingItem]:
        """Move ticked-off shopping items to the pantry. Returns the moved items.

        At home is just what's in the house, so the items drop the recipe
        names and links they had on the shopping list.
        """
        bought = [i for i in self.shopping if i.status == STATUS_COMPLETED]
        self.delete_items(SHOPPING, {i.uid for i in bought})
        for item in bought:
            item.status = STATUS_NEEDS_ACTION
            item.description = None
            item.recipe_uids = []
        self.pantry.extend(bought)
        return bought
