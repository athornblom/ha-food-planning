"""Binary sensors. The core has none; optional modules add theirs here."""

from __future__ import annotations

from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .data import FoodPlanningConfigEntry, async_add_hooked_entities

PARALLEL_UPDATES = 0


async def async_setup_entry(
    hass: HomeAssistant,
    entry: FoodPlanningConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up binary sensors from optional modules (offers)."""
    async_add_hooked_entities(entry, "binary_sensor", async_add_entities)
