"""To-do lists: one for recipes, one for shopping."""

from __future__ import annotations

from homeassistant.components.todo import (
    TodoItem,
    TodoItemStatus,
    TodoListEntity,
    TodoListEntityFeature,
)
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .const import DOMAIN
from .data import FoodPlanningConfigEntry
from .entity import FoodPlanningEntity
from .store import STATUS_COMPLETED, STATUS_NEEDS_ACTION, Recipe, ShoppingItem

PARALLEL_UPDATES = 0


async def async_setup_entry(
    hass: HomeAssistant,
    entry: FoodPlanningConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the recipe and shopping lists."""
    async_add_entities([RecipeList(entry), ShoppingList(entry)])


def _status(done: bool) -> TodoItemStatus:
    return TodoItemStatus.COMPLETED if done else TodoItemStatus.NEEDS_ACTION


def _item_not_found(uid: str) -> ServiceValidationError:
    return ServiceValidationError(
        translation_domain=DOMAIN,
        translation_key="item_not_found",
        translation_placeholders={"uid": uid},
    )


class RecipeList(FoodPlanningEntity, TodoListEntity):
    """Recipes as to-do items. Ticking one off marks it as cooked."""

    _attr_supported_features = (
        TodoListEntityFeature.CREATE_TODO_ITEM
        | TodoListEntityFeature.UPDATE_TODO_ITEM
        | TodoListEntityFeature.DELETE_TODO_ITEM
        | TodoListEntityFeature.SET_DESCRIPTION_ON_ITEM
    )

    def __init__(self, entry: FoodPlanningConfigEntry) -> None:
        """Initialize the list."""
        super().__init__(entry, "todo", "recipes")

    @property
    def todo_items(self) -> list[TodoItem]:
        """Return the recipes."""
        return [
            TodoItem(
                uid=recipe.uid,
                summary=recipe.title,
                status=_status(recipe.cooked),
                description=recipe.to_markdown() or None,
            )
            for recipe in self._data.store.recipes
        ]

    async def async_create_todo_item(self, item: TodoItem) -> None:
        """Add a recipe by hand."""
        recipe = Recipe(title=item.summary or "")
        if item.description:
            recipe.apply_markdown(item.description)
        self._data.store.add_recipe(recipe)
        await self._data.store.async_save()

    async def async_update_todo_item(self, item: TodoItem) -> None:
        """Rename a recipe, edit it, or mark it as cooked."""
        store = self._data.store
        recipe = store.get_recipe(item.uid or "")
        if recipe is None:
            raise _item_not_found(item.uid or "")
        if item.summary is not None:
            recipe.title = item.summary
        if item.status is not None:
            recipe.cooked = item.status == TodoItemStatus.COMPLETED
        # Only re-parse when the text actually changed, so an untouched
        # description round-trips without losing structure.
        if item.description is not None and item.description != recipe.to_markdown():
            recipe.apply_markdown(item.description)
        await store.async_save()

    async def async_delete_todo_items(self, uids: list[str]) -> None:
        """Delete recipes."""
        self._data.store.delete_recipes(set(uids))
        await self._data.store.async_save()


class ShoppingList(FoodPlanningEntity, TodoListEntity):
    """The food shopping list."""

    _attr_supported_features = (
        TodoListEntityFeature.CREATE_TODO_ITEM
        | TodoListEntityFeature.UPDATE_TODO_ITEM
        | TodoListEntityFeature.DELETE_TODO_ITEM
        | TodoListEntityFeature.MOVE_TODO_ITEM
        | TodoListEntityFeature.SET_DESCRIPTION_ON_ITEM
    )

    def __init__(self, entry: FoodPlanningConfigEntry) -> None:
        """Initialize the list."""
        super().__init__(entry, "todo", "shopping_list")

    @property
    def todo_items(self) -> list[TodoItem]:
        """Return the shopping items."""
        return [
            TodoItem(
                uid=item.uid,
                summary=item.summary,
                status=_status(item.status == STATUS_COMPLETED),
                description=item.description,
            )
            for item in self._data.store.shopping
        ]

    async def async_create_todo_item(self, item: TodoItem) -> None:
        """Add an item by hand or by voice."""
        self._data.store.shopping.append(
            ShoppingItem(summary=item.summary or "", description=item.description)
        )
        await self._data.store.async_save()

    async def async_update_todo_item(self, item: TodoItem) -> None:
        """Rename, tick off or describe an item."""
        store = self._data.store
        existing = store.get_shopping_item(item.uid or "")
        if existing is None:
            raise _item_not_found(item.uid or "")
        if item.summary is not None:
            existing.summary = item.summary
        if item.status is not None:
            existing.status = (
                STATUS_COMPLETED
                if item.status == TodoItemStatus.COMPLETED
                else STATUS_NEEDS_ACTION
            )
        existing.description = item.description
        await store.async_save()

    async def async_delete_todo_items(self, uids: list[str]) -> None:
        """Delete items, e.g. when clearing ticked-off items."""
        self._data.store.delete_shopping_items(set(uids))
        await self._data.store.async_save()

    async def async_move_todo_item(
        self, uid: str, previous_uid: str | None = None
    ) -> None:
        """Reorder an item."""
        if not self._data.store.move_shopping_item(uid, previous_uid):
            raise _item_not_found(uid)
        await self._data.store.async_save()
