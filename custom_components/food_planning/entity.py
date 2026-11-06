"""Base entity for the Food Planning integration."""

from __future__ import annotations

from homeassistant.helpers.entity import Entity

from .const import DOMAIN
from .data import FoodPlanningConfigEntry


class FoodPlanningEntity(Entity):
    """Shared setup: translated name, English entity_id, store listener."""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, entry: FoodPlanningConfigEntry, platform: str, key: str) -> None:
        """Initialize the entity."""
        self._entry = entry
        self._data = entry.runtime_data
        self._attr_translation_key = key
        self._attr_unique_id = f"{entry.entry_id}_{key}"
        # Suggested id, used the first time the entity is registered. Keeps
        # ids English even when the names are translated to Swedish.
        self.entity_id = f"{platform}.{DOMAIN}_{key}"

    async def async_added_to_hass(self) -> None:
        """Update whenever recipes or the shopping list change."""
        self.async_on_remove(
            self._data.store.async_add_listener(self.async_write_ha_state)
        )
