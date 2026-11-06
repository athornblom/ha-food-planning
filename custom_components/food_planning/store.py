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
    uid: str = field(default_factory=_new_uid)
    created: str = field(default_factory=lambda: dt_util.utcnow().isoformat())


@dataclass
class ShoppingItem:
    """An item on the shopping list."""

    summary: str
    status: str = STATUS_NEEDS_ACTION
    # Which recipe(s) the item is for, shown under the item.
    description: str | None = None
    recipe_uid: str | None = None
    uid: str = field(default_factory=_new_uid)


class FoodPlanningStore:
    """Holds recipes and shopping items and persists them to .storage."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the store."""
        self._store: Store[dict[str, Any]] = Store(
            hass, STORAGE_VERSION, STORAGE_KEY, private=True
        )
        self.recipes: list[Recipe] = []
        self.shopping: list[ShoppingItem] = []
        self._listeners: list[Callable[[], None]] = []

    @classmethod
    async def async_create(cls, hass: HomeAssistant) -> Self:
        """Create a store and load its saved data."""
        store = cls(hass)
        data = await store._store.async_load() or {}
        store.recipes = [_from_dict(Recipe, r) for r in data.get("recipes", [])]
        store.shopping = [_from_dict(ShoppingItem, s) for s in data.get("shopping", [])]
        return store

    async def async_save(self) -> None:
        """Persist all data and notify listeners."""
        await self._store.async_save(
            {
                "recipes": [asdict(r) for r in self.recipes],
                "shopping": [asdict(s) for s in self.shopping],
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

    def delete_recipe(self, uid: str) -> Recipe | None:
        """Delete a recipe and return it, or None if it didn't exist."""
        recipe = self.get_recipe(uid)
        if recipe is not None:
            self.recipes.remove(recipe)
        return recipe

    # Shopping list

    def get_shopping_item(self, uid: str) -> ShoppingItem | None:
        """Return the shopping item with this uid."""
        return next((s for s in self.shopping if s.uid == uid), None)

    def open_shopping_items(self) -> list[ShoppingItem]:
        """Return items that haven't been ticked off."""
        return [s for s in self.shopping if s.status == STATUS_NEEDS_ACTION]

    def add_recipe_to_shopping(self, recipe: Recipe) -> list[ShoppingItem]:
        """Add a recipe's ingredients, skipping exact copies of open items.

        Near-duplicates ("2 msk olivolja" vs "15 ml olivolja") are merged
        afterwards by the AI, see merge.py. Returns the items added.
        """
        open_items = {s.summary.casefold() for s in self.open_shopping_items()}
        added: list[ShoppingItem] = []
        for ingredient in recipe.ingredients:
            if ingredient.casefold() in open_items:
                continue
            item = ShoppingItem(
                summary=ingredient, description=recipe.title, recipe_uid=recipe.uid
            )
            self.shopping.append(item)
            added.append(item)
            open_items.add(ingredient.casefold())
        return added

    def delete_shopping_items(self, uids: set[str]) -> None:
        """Delete shopping items."""
        self.shopping = [s for s in self.shopping if s.uid not in uids]

    def move_shopping_item(self, uid: str, previous_uid: str | None) -> bool:
        """Move an item to just after previous_uid, or first if None.

        Returns False if the item does not exist.
        """
        item = self.get_shopping_item(uid)
        if item is None:
            return False
        self.shopping.remove(item)
        index = next(
            (
                i + 1
                for i, other in enumerate(self.shopping)
                if other.uid == previous_uid
            ),
            0 if previous_uid is None else len(self.shopping),
        )
        self.shopping.insert(index, item)
        return True
