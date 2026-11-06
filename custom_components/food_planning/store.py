"""Persistent storage for recipes and the shopping list."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import asdict, dataclass, field, fields
import re
from typing import Any, Self
from uuid import uuid4

from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import (
    HEADING_INGREDIENTS,
    HEADING_STEPS,
    INGREDIENT_HEADINGS,
    LABEL_SOURCE,
    STEP_HEADINGS,
    STORAGE_KEY,
    STORAGE_VERSION,
)

STATUS_NEEDS_ACTION = "needs_action"
STATUS_COMPLETED = "completed"

_HEADING_RE = re.compile(r"^#{1,6}\s*(.+?)\s*:?\s*$")
_BULLET_RE = re.compile(r"^\s*(?:[-*•]|\d+[.)])\s+")
_SERVINGS_RE = re.compile(r"^\*\*(.+)\*\*$")
_SOURCE_RE = re.compile(rf"^\[{LABEL_SOURCE}\]\((\S+)\)$")


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
    image_url: str | None = None
    cooked: bool = False
    uid: str = field(default_factory=_new_uid)
    created: str = field(default_factory=lambda: dt_util.utcnow().isoformat())

    def to_markdown(self) -> str:
        """Render the recipe as the description of a to-do item."""
        parts: list[str] = []
        if self.servings:
            parts.append(f"**{self.servings}**")
        if self.ingredients:
            lines = "\n".join(f"- {i}" for i in self.ingredients)
            parts.append(f"### {HEADING_INGREDIENTS}\n{lines}")
        if self.steps:
            lines = "\n".join(f"{n}. {s}" for n, s in enumerate(self.steps, 1))
            parts.append(f"### {HEADING_STEPS}\n{lines}")
        if self.notes:
            parts.append(self.notes)
        if self.source_url:
            parts.append(f"[{LABEL_SOURCE}]({self.source_url})")
        return "\n\n".join(parts)

    def apply_markdown(self, text: str) -> None:
        """Update the recipe from a hand-edited description.

        Lines under an ingredients heading become ingredients, lines under a
        steps heading become steps, and everything else becomes notes. Free
        text without headings therefore ends up in notes.
        """
        servings: str | None = None
        source: str | None = None
        ingredients: list[str] = []
        steps: list[str] = []
        notes: list[str] = []
        section: str | None = None
        # A section ends at a blank line followed by a line that is not a
        # list item, so notes written after the steps stay notes.
        blank_in_section = False

        for raw in text.splitlines():
            line = raw.strip()
            if heading := _HEADING_RE.match(line):
                name = heading.group(1).strip().casefold()
                blank_in_section = False
                if name in INGREDIENT_HEADINGS:
                    section = "ingredients"
                    continue
                if name in STEP_HEADINGS:
                    section = "steps"
                    continue
                section = None
            if not line:
                if section is not None:
                    blank_in_section = True
                elif notes and notes[-1]:
                    notes.append("")
                continue
            if source_match := _SOURCE_RE.match(line):
                source = source_match.group(1)
                continue
            if section and blank_in_section and not _BULLET_RE.match(line):
                section = None
            blank_in_section = False
            if section == "ingredients":
                ingredients.append(_BULLET_RE.sub("", line))
            elif section == "steps":
                steps.append(_BULLET_RE.sub("", line))
            elif (
                servings is None
                and not notes
                and not ingredients
                and (m := _SERVINGS_RE.match(line))
            ):
                servings = m.group(1)
            else:
                notes.append(line)

        self.servings = servings
        self.ingredients = ingredients
        self.steps = steps
        self.notes = "\n".join(notes).strip() or None
        self.source_url = source


@dataclass
class ShoppingItem:
    """An item on the shopping list."""

    summary: str
    status: str = STATUS_NEEDS_ACTION
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
        """Persist all data and notify listening entities."""
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

    def delete_recipes(self, uids: set[str]) -> None:
        """Delete recipes."""
        self.recipes = [r for r in self.recipes if r.uid not in uids]

    # Shopping list

    def get_shopping_item(self, uid: str) -> ShoppingItem | None:
        """Return the shopping item with this uid."""
        return next((s for s in self.shopping if s.uid == uid), None)

    def add_recipe_to_shopping(self, recipe: Recipe) -> int:
        """Add a recipe's ingredients, skipping ones already open on the list.

        Returns the number of items added.
        """
        open_items = {
            s.summary.casefold()
            for s in self.shopping
            if s.status == STATUS_NEEDS_ACTION
        }
        added = 0
        for ingredient in recipe.ingredients:
            if ingredient.casefold() in open_items:
                continue
            self.shopping.append(
                ShoppingItem(
                    summary=ingredient,
                    description=recipe.title,
                    recipe_uid=recipe.uid,
                )
            )
            open_items.add(ingredient.casefold())
            added += 1
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
