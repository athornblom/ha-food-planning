"""When the next cooking timer ends."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.util import dt as dt_util

from .data import FoodPlanningConfigEntry
from .entity import FoodPlanningEntity
from .timers import STATUS_FINISHED, STATUS_RUNNING

PARALLEL_UPDATES = 0


async def async_setup_entry(
    hass: HomeAssistant,
    entry: FoodPlanningConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the next timer sensor."""
    async_add_entities([NextTimerSensor(entry)])


class NextTimerSensor(FoodPlanningEntity, SensorEntity):
    """The end time of the running timer that ends first.

    Unknown when no timer is running. The "timers" attribute lists all
    timers (running, paused and finished-but-not-dismissed).
    """

    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(self, entry: FoodPlanningConfigEntry) -> None:
        """Initialize the sensor."""
        super().__init__(entry, "sensor", "next_timer")

    async def async_added_to_hass(self) -> None:
        """Update whenever the timers change."""
        self.async_on_remove(
            self._data.timers.async_add_listener(self.async_write_ha_state)
        )

    @property
    def native_value(self) -> datetime | None:
        """Return when the next timer ends."""
        return self._data.timers.next_end()

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return all timers, soonest first."""
        now = dt_util.utcnow()
        timers = sorted(
            self._data.timers.timers,
            key=lambda t: (t.status != STATUS_FINISHED, t.seconds_left(now)),
        )
        nxt = next((t for t in timers if t.status == STATUS_RUNNING), None)
        return {
            "label": nxt.label if nxt else None,
            "recipe": nxt.recipe if nxt else None,
            "timers": [t.as_json(now) for t in timers],
        }
