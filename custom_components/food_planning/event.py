"""Events for automations: cooking timers and Veckans middagar."""

from __future__ import annotations

from typing import Any

from homeassistant.components.event import EventEntity
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .data import FoodPlanningConfigEntry
from .entity import FoodPlanningEntity
from .timers import EVENT_TYPES, Timer
from .weekly import EVENT_TYPES as WEEKLY_EVENT_TYPES

PARALLEL_UPDATES = 0


async def async_setup_entry(
    hass: HomeAssistant,
    entry: FoodPlanningConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the cooking timer and weekly dinner events."""
    async_add_entities([CookingTimerEvent(entry), WeeklyDinnersEvent(entry)])


class CookingTimerEvent(FoodPlanningEntity, EventEntity):
    """Fires when any cooking timer starts, pauses, finishes or is cancelled.

    One entity for all timers: the event's attributes say which timer
    (timer_id, label, recipe, duration).
    """

    _attr_event_types = EVENT_TYPES

    def __init__(self, entry: FoodPlanningConfigEntry) -> None:
        """Initialize the event entity."""
        super().__init__(entry, "event", "timer")

    async def async_added_to_hass(self) -> None:
        """Listen for timer events (not for store changes)."""
        self.async_on_remove(
            self._data.timers.async_add_event_listener(self._on_timer_event)
        )

    @callback
    def _on_timer_event(self, event_type: str, timer: Timer) -> None:
        self._trigger_event(event_type, timer.as_event_data())
        self.async_write_ha_state()


class WeeklyDinnersEvent(FoodPlanningEntity, EventEntity):
    """Fires when the week's dinners are planned and when a recipe is cooked."""

    _attr_event_types = WEEKLY_EVENT_TYPES

    def __init__(self, entry: FoodPlanningConfigEntry) -> None:
        """Initialize the event entity."""
        super().__init__(entry, "event", "weekly_dinners")

    async def async_added_to_hass(self) -> None:
        """Listen for planner events (not for store changes)."""
        self.async_on_remove(
            self._data.planner.async_add_event_listener(self._on_event)
        )

    @callback
    def _on_event(self, event_type: str, data: dict[str, Any]) -> None:
        self._trigger_event(event_type, data)
        self.async_write_ha_state()
