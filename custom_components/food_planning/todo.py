"""The food shopping list."""

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
from .store import STATUS_COMPLETED, STATUS_NEEDS_ACTION, ShoppingItem

PARALLEL_UPDATES = 0


async def async_setup_entry(
    hass: HomeAssistant,
    entry: FoodPlanningConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the shopping list."""
    async_add_entities([ShoppingList(entry)])


def _item_not_found(uid: str) -> ServiceValidationError:
    return ServiceValidationError(
        translation_domain=DOMAIN,
        translation_key="item_not_found",
        translation_placeholders={"uid": uid},
    )


class ShoppingList(FoodPlanningEntity, TodoListEntity):
    """The food shopping list. Works with the to-do card and Assist."""

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
                status=(
                    TodoItemStatus.COMPLETED
                    if item.status == STATUS_COMPLETED
                    else TodoItemStatus.NEEDS_ACTION
                ),
                description=item.description,
            )
            for item in self._data.store.shopping
        ]

    async def async_create_todo_item(self, item: TodoItem) -> None:
        """Add an item by hand or by voice, then merge any duplicate."""
        new = ShoppingItem(summary=item.summary or "", description=item.description)
        self._data.store.shopping.append(new)
        await self._data.store.async_save()
        self._data.merger.async_schedule([new.uid])

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
