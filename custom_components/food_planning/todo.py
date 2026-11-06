"""To-do lists: the food shopping list and what's at home (pantry)."""

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
from .store import (
    PANTRY,
    SHOPPING,
    STATUS_COMPLETED,
    STATUS_NEEDS_ACTION,
    ShoppingItem,
)

PARALLEL_UPDATES = 0


async def async_setup_entry(
    hass: HomeAssistant,
    entry: FoodPlanningConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the shopping list and the pantry."""
    async_add_entities(
        [FoodList(entry, "shopping_list", SHOPPING), FoodList(entry, "pantry", PANTRY)]
    )


def _item_not_found(uid: str) -> ServiceValidationError:
    return ServiceValidationError(
        translation_domain=DOMAIN,
        translation_key="item_not_found",
        translation_placeholders={"uid": uid},
    )


class FoodList(FoodPlanningEntity, TodoListEntity):
    """A list of food items. Works with the to-do card and Assist.

    On the shopping list, ticking an item means bought; in the pantry, it
    means used up. New items are checked for duplicates by the AI.
    """

    _attr_supported_features = (
        TodoListEntityFeature.CREATE_TODO_ITEM
        | TodoListEntityFeature.UPDATE_TODO_ITEM
        | TodoListEntityFeature.DELETE_TODO_ITEM
        | TodoListEntityFeature.MOVE_TODO_ITEM
        | TodoListEntityFeature.SET_DESCRIPTION_ON_ITEM
    )

    def __init__(
        self, entry: FoodPlanningConfigEntry, key: str, list_name: str
    ) -> None:
        """Initialize the list."""
        super().__init__(entry, "todo", key)
        self._list_name = list_name

    @property
    def _items(self) -> list[ShoppingItem]:
        return self._data.store.lists[self._list_name]

    @property
    def todo_items(self) -> list[TodoItem]:
        """Return the items."""
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
            for item in self._items
        ]

    async def async_create_todo_item(self, item: TodoItem) -> None:
        """Add an item by hand or by voice, then merge any duplicate."""
        new = ShoppingItem(summary=item.summary or "", description=item.description)
        self._items.append(new)
        await self._data.store.async_save()
        self._data.mergers[self._list_name].async_schedule([new.uid])

    async def async_update_todo_item(self, item: TodoItem) -> None:
        """Rename, tick off or describe an item."""
        store = self._data.store
        existing = store.get_item(self._list_name, item.uid or "")
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
        self._data.store.delete_items(self._list_name, set(uids))
        await self._data.store.async_save()

    async def async_move_todo_item(
        self, uid: str, previous_uid: str | None = None
    ) -> None:
        """Reorder an item."""
        if not self._data.store.move_item(self._list_name, uid, previous_uid):
            raise _item_not_found(uid)
        await self._data.store.async_save()
